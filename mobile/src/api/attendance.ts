import { appendFile, request, requestForm } from './client';

export type TipoAsistencia = 'entrada' | 'salida';

export type MetodoAsistencia = 'automatico' | 'manual';

/**
 * Usuario tal como lo devuelve `attendance.service.ts`: el `baseQuery` selecciona
 * columnas explícitas para no arrastrar `password` ni el `embedding`, así que acá
 * **no** existen `activo` ni `faceRegisteredAt`.
 */
export interface UsuarioAsistencia {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: string;
}

/** `l.id, l.nombre, l.codigo, l.tipo` del mismo `baseQuery`. */
export interface LocationAsistencia {
  id: number;
  nombre: string;
  codigo: string;
  tipo: string;
}

/** Fila de `GET /attendance` y de `asistencia` dentro de `POST /attendance/check`. */
export interface Asistencia {
  id: number;
  usuarioId: number;
  locationId: number | null;
  /** Timestamp completo. La hora y la fecha salen de acá: la entidad no tiene `hora`. */
  fecha: string;
  tipo: TipoAsistencia;
  metodo: MetodoAsistencia;
  /** Similitud coseno 0-1. `null` cuando el marcaje fue manual. */
  confianza: number | null;
  confirmadoPorId: number | null;
  location: LocationAsistencia | null;
  /** `presentar()` agrega este nombre plano; `usuario` puede venir `null`. */
  nombreCompleto: string;
  usuario: UsuarioAsistencia | null;
  confirmadoPor: {
    id: number;
    nombre: string;
    apellido: string | null;
  } | null;
}

/**
 * Candidato que devuelve el reconocimiento. Ojo: `FaceService.buscar()` arma
 * estos objetos desde el índice en memoria y **solo** trae el id y la similitud
 * (`CandidatoRostro` en `face.service.ts`). Para mostrar el nombre hay que
 * resolverlo contra el catálogo de personal; ver `resolverCandidatos` en la
 * pantalla de marcaje.
 */
export interface CandidatoRostro {
  usuarioId: number;
  similitud: number;
}

/**
 * Respuesta de `POST /attendance/check`. Es una unión de cuatro casos:
 *
 * - sin coincidencias → `{reconocido:false, requiereConfirmacion:false, umbral, candidatos:[]}`
 * - bajo umbral      → `{reconocido:false, requiereConfirmacion:true, umbral, candidatos:[...]}`
 * - automático      → `{reconocido:true, manual:false, requiereConfirmacion:false, umbral, candidato, asistencia}`
 * - manual          → `{reconocido:true, manual:true, requiereConfirmacion:false, umbral, candidato, asistencia}`
 *
 * En el caso "bajo umbral" **no se inserta nada**: no existe `asistencia` ni un id
 * que confirmar. El camino de "no reconocido" es reenviar el mismo multipart con
 * `usuarioId`, que salta ArcFace y registra `metodo:'manual'`.
 */
export interface AttendanceCheck {
  reconocido: boolean;
  manual?: boolean;
  requiereConfirmacion: boolean;
  /** `UMBRAL_CONFIANZA_FACIAL` del servidor, para poder mostrarlo en pantalla. */
  umbral: number;
  /** Solo cuando hay un match (automático o manual). `similitud` es `null` si fue manual. */
  candidato?: {
    usuarioId: number;
    nombreCompleto: string;
    similitud: number | null;
  };
  /** Solo cuando NO se reconoció: top-K por similitud para elegir a mano. */
  candidatos?: CandidatoRostro[];
  /** Solo cuando quedó registrado. */
  asistencia?: Asistencia;
}

export interface Paginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  /** El backend nunca devuelve 0: usa `Math.max(..., 1)`. */
  pages: number;
}

export interface AttendanceFilters {
  page?: number;
  limit?: number;
  usuarioId?: number;
  locationId?: number;
  tipo?: TipoAsistencia;
  metodo?: MetodoAsistencia;
  /** `YYYY-MM-DD` o ISO. */
  desde?: string;
  hasta?: string;
  /** Nombre, apellido o email del personal. */
  search?: string;
}

export interface MarcajeParams {
  fotoUri: string;
  fileName?: string;
  /** Automático si se omite: 1ª del día = entrada, 2ª = salida. */
  tipo?: TipoAsistencia;
  locationId?: number | null;
  /** Fuerza el marcaje manual: salta ArcFace y usa a este usuario. */
  usuarioId?: number;
}

function formMarcaje(params: MarcajeParams): FormData {
  const form = new FormData();
  appendFile(form, 'foto', {
    uri: params.fotoUri,
    name: params.fileName ?? `marcaje-${Date.now()}.jpg`,
    type: 'image/jpeg',
  });
  if (params.tipo) form.append('tipo', params.tipo);
  if (params.locationId !== undefined && params.locationId !== null) {
    form.append('locationId', String(params.locationId));
  }
  if (params.usuarioId !== undefined) {
    form.append('usuarioId', String(params.usuarioId));
  }
  return form;
}

/** `POST /attendance/check`: reconoce el rostro y registra, o devuelve candidatos. */
export async function marcarAsistencia(
  params: MarcajeParams,
  token?: string | null,
): Promise<AttendanceCheck> {
  return requestForm<AttendanceCheck>(
    '/attendance/check',
    formMarcaje(params),
    token,
  );
}

/**
 * Atajo del marcaje manual: mismo endpoint, pero con `usuarioId`. El backend
 * ignora la foto y no corre ArcFace (`registrarManual`).
 */
export async function marcarAsistenciaManual(
  params: Omit<MarcajeParams, 'usuarioId'> & { usuarioId: number },
  token?: string | null,
): Promise<AttendanceCheck> {
  return marcarAsistencia(params, token);
}

/** `GET /attendance`: historial paginado con filtros. Solo admin. */
export async function listarAsistencia(
  filters: AttendanceFilters = {},
  token?: string | null,
): Promise<Paginado<Asistencia>> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return request<Paginado<Asistencia>>(
    `/attendance${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    token,
  );
}