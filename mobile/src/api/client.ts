import { config } from '../config';

interface ErrorPayload {
  message?: string | string[];
}

/** Archivo local listo para `FormData.append`. */
export interface ArchivoLocal {
  uri: string;
  name: string;
  type?: string;
}

/** Datos mínimos de un usuario para las listas de elección de la pantalla. */
export interface ResumenUsuario {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: string;
  tieneRostro: boolean;
  activo: boolean;
}

/**
 * Cuerpo extra de un error del backend, además del `message`.
 *
 * `users.controller.ts` responde 409 con `{ message, candidatos[] }` cuando hay
 * homónimos, y el `request()` se quedó solo con el texto. Sin esto la pantalla de
 * registro facial no podría mostrarle al operador a cuál de los varios "Marcos" se
 * está asociando el rostro. El 404 trae `sugerencias[]` por el mismo motivo.
 */
export interface ApiErrorExtras {
  candidatos?: ResumenUsuario[];
  sugerencias?: ResumenUsuario[];
  [clave: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly extras: ApiErrorExtras;

  constructor(message: string, status: number, extras: ApiErrorExtras = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.extras = extras;
  }
}

/** Arma el `ApiError` con el `message` del backend y todo lo demás como `extras`. */
function apiErrorDesde(
  status: number,
  payload?: ErrorPayload & ApiErrorExtras,
): ApiError {
  if (!payload) return new ApiError(`Error ${status}`, status);
  const { message, ...extras } = payload;
  const texto = Array.isArray(message)
    ? message.join(', ')
    : (message ?? `Error ${status}`);
  return new ApiError(texto, status, extras);
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string> | undefined) || {}),
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifique su conexión.',
      0,
    );
  }

  if (!response.ok) {
    let payload: (ErrorPayload & ApiErrorExtras) | undefined;
    try {
      payload = (await response.json()) as ErrorPayload & ApiErrorExtras;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw apiErrorDesde(response.status, payload);
  }

  return (await response.json()) as T;
}

/**
 * Agrega un archivo local a un `FormData`.
 *
 * React Native no acepta un `File`: hay que pasar el objeto plano
 * `{ uri, name, type }`. El cast es obligatorio porque las definiciones de
 * `lib.dom` no conocen ese overload de `FormData.append`.
 */
export function appendFile(
  form: FormData,
  campo: string,
  archivo: ArchivoLocal,
): void {
  form.append(campo, {
    uri: archivo.uri,
    name: archivo.name,
    type: archivo.type ?? 'application/octet-stream',
  } as unknown as Blob);
}

/**
 * `POST` multipart. No se pone `Content-Type` a mano: tiene que ir el `boundary`
 * que genera `fetch`, y `request()` ya lo omite cuando el cuerpo es `FormData`.
 */
export function requestForm<T>(
  path: string,
  form: FormData,
  token?: string | null,
): Promise<T> {
  return request<T>(path, { method: 'POST', body: form }, token);
}

export interface ProgresoSubida {
  /** Bytes enviados sobre el total del cuerpo multipart, de 0 a 1. */
  fraccion: number;
  /** Foto estimada en curso, contando desde 1. */
  foto: number;
  totalFotos: number;
}

export type AlSubir = (progreso: ProgresoSubida) => void;

/**
 * `POST` multipart con progreso de subida real, vía `XMLHttpRequest`.
 *
 * `fetch` no expone el progreso de subida. En el registro facial eso importa: son
 * varios MB de fotos y, sin señal, el operador asume que la app se colgó y vuelve
 * a apretar el botón.
 *
 * `foto` es una aproximación. Los bytes del cuerpo incluyen los campos de texto y
 * los `boundary` del multipart, así que no caen justo en el corte entre una foto y
 * la siguiente; `fraccion` sí es la fracción real de bytes enviados.
 */
export function requestFormConProgreso<T>(
  path: string,
  form: FormData,
  archivos: ArchivoLocal[],
  alSubir: AlSubir,
  token?: string | null,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${config.apiUrl}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (evento: ProgressEvent) => {
      if (!evento.lengthComputable || !evento.total) return;
      const fraccion = Math.min(evento.loaded / evento.total, 1);
      const foto = archivos.length
        ? Math.min(Math.max(Math.ceil(fraccion * archivos.length), 1), archivos.length)
        : 0;
      alSubir({ fraccion, foto, totalFotos: archivos.length });
    };

    xhr.onload = () => {
      let payload: (ErrorPayload & ApiErrorExtras) | undefined;
      try {
        payload = JSON.parse(xhr.responseText) as ErrorPayload &
          ApiErrorExtras;
      } catch {
        payload = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }
      reject(apiErrorDesde(xhr.status, payload));
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          'No se pudo conectar con el servidor. Verifique su conexión.',
          0,
        ),
      );
    };

    xhr.send(form);
  });
}