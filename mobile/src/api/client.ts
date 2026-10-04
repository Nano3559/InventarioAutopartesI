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

/**
 * Cuerpo extra de un error del backend, además del `message`.
 *
 * `users.controller.ts` responde 409 con `{ message, candidatos[] }` cuando hay
 * homónimos, y el `request()` se quedó solo con el texto. Sin esto la pantalla de
 * registro facial no podría mostrarle al operador a cuál de los varios "Marcos" se
 * está asociando el rostro.
 */
export interface ApiErrorExtras {
  candidatos?: Array<{
    id: number;
    nombreCompleto: string;
    email: string;
    rol: string;
    tieneRostro: boolean;
    activo: boolean;
  }>;
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
    let message = `Error ${response.status}`;
    let extras: ApiErrorExtras = {};
    try {
      const payload = (await response.json()) as ErrorPayload & ApiErrorExtras;
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
      const { message: _omitido, ...resto } = payload;
      extras = resto;
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(message, response.status, extras);
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