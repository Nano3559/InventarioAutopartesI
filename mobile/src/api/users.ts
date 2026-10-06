import {
  request,
  requestForm,
  requestFormConProgreso,
  appendFile,
  type AlSubir,
  type ArchivoLocal,
} from './client';

/** Límites que valida el backend (`common/constants.ts`). */
export const FOTOS_MINIMO = 1;
export const FOTOS_MAXIMO = 10;
export const FOTOS_RECOMENDADAS = 5;

export interface RostroRegistrado {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  faceRegisteredAt: string;
  facePhoto: string;
  /** URL firmada: el bucket `faces` es privado y caduca. */
  fotoUrl: string;
  fotosRegistradas: number;
  embeddingDimension: number;
  /** `true` si ese usuario ya tenía un rostro y se reemplazó. */
  reconoce: boolean;
  avisos: string[];
}

export interface RostroListado {
  id: number;
  nombre: string;
  apellido: string | null;
  nombreCompleto: string;
  email: string;
  rol: string;
  activo: boolean;
  faceRegisteredAt: string | null;
  fotoUrl: string | null;
}

/** Fila de `GET /users`. Nunca trae `embedding` (el backend lo filtra). */
export interface UsuarioListado {
  id: number;
  nombre: string;
  apellido: string | null;
  nombreCompleto: string;
  email: string;
  rol: string;
  activo: boolean;
  /** Ruta del objeto en el bucket **privado** `faces`, o `null` si no tiene. */
  facePhoto: string | null;
  faceRegisteredAt: string | null;
}

/**
 * Personal activo que todavía **no tiene rostro** (tarea R9): justo a quien hay
 * que registrar. Se filtra en el cliente porque `GET /users` no tiene filtros y
 * son pocas filas.
 *
 * Se mira `facePhoto` y `faceRegisteredAt` juntos: el registro siempre escribe
 * los dos, así que basta con que falte cualquiera para considerarlo pendiente.
 */
export function usuariosSinRostro(
  usuarios: UsuarioListado[],
): UsuarioListado[] {
  return usuarios.filter(
    (u) => u.activo && !u.facePhoto && !u.faceRegisteredAt,
  );
}

/** Todo el personal, para armar el selector de "quién falta". Solo admin. */
export async function listarUsuarios(token: string): Promise<UsuarioListado[]> {
  return request<UsuarioListado[]>('/users', {}, token);
}

/** A quién se le asocia el rostro: por id (lista) o por nombre escrito a mano. */
export type DestinoRostro =
  | { usuarioId: number }
  | { nombre: string; apellido: string };

/**
 * Asocia un rostro a un `users` **existente**. No crea usuarios.
 *
 * Preferí `usuarioId` cuando el operador eligió a la persona de una lista: un id
 * no se puede escribir mal y no hay homónimos. Con nombre + apellido:
 * - 404 → no hay nadie con ese nombre; trae `extras.sugerencias[]` con parecidos.
 * - 409 con `extras.candidatos[]` → homónimos: hay que elegir a cuál se asocia.
 * - 409 sin candidatos → el usuario está dado de baja (`activo = false`).
 * - 400 → 0 fotos, más de 10, o `usuarioId` que no es un número.
 */
export async function registrarRostro(
  destino: DestinoRostro,
  fotos: ArchivoLocal[],
  token: string,
  alSubir?: AlSubir,
): Promise<RostroRegistrado> {
  const form = new FormData();
  if ('usuarioId' in destino) {
    form.append('usuarioId', String(destino.usuarioId));
  } else {
    form.append('nombre', destino.nombre.trim());
    form.append('apellido', destino.apellido.trim());
  }
  for (const foto of fotos) {
    appendFile(form, 'fotos', foto);
  }
  if (alSubir) {
    return requestFormConProgreso<RostroRegistrado>(
      '/users/face/register',
      form,
      fotos,
      alSubir,
      token,
    );
  }
  return requestForm<RostroRegistrado>('/users/face/register', form, token);
}

/** Rostros ya registrados, con URL firmada de la foto. Solo admin. */
export async function listarRostros(token: string): Promise<RostroListado[]> {
  return request<RostroListado[]>('/users/rostros', {}, token);
}