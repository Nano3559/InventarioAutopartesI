import { request, requestForm, appendFile, type ArchivoLocal } from './client';

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

/**
 * Asocia un rostro a un `users` **existente** (nombre + apellido). No crea usuarios.
 *
 * Errores que la pantalla tiene que distinguir:
 * - 404 → no hay nadie con ese nombre (el plan pide ofrecer sugerencia).
 * - 409 con `extras.candidatos[]` → homónimos: hay que elegir a cuál se asocia.
 * - 409 sin candidatos → el usuario está dado de baja (`activo = false`).
 * - 400 → 0 fotos o más de 10.
 */
export async function registrarRostro(
  nombre: string,
  apellido: string,
  fotos: ArchivoLocal[],
  token: string,
): Promise<RostroRegistrado> {
  const form = new FormData();
  form.append('nombre', nombre.trim());
  form.append('apellido', apellido.trim());
  for (const foto of fotos) {
    appendFile(form, 'fotos', foto);
  }
  return requestForm<RostroRegistrado>('/users/face/register', form, token);
}

/** Rostros ya registrados, con URL firmada de la foto. Solo admin. */
export async function listarRostros(token: string): Promise<RostroListado[]> {
  return request<RostroListado[]>('/users/rostros', {}, token);
}