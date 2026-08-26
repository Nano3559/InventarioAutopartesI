import { request, ApiError } from './client';

export interface Solicitud {
  id: number;
  fecha: string;
  productId: number;
  producto: {
    id: number;
    producto: string;
    marca: string;
    modelo: string;
    codigoFabrica: string;
  };
  cantidad: number;
  tiendaId: number;
  tienda: {
    id: number;
    nombre: string;
    tipo: string;
  };
  origenId: number | null;
  origen: {
    id: number;
    nombre: string;
    tipo: string;
  } | null;
  usuarioId: number;
  usuario: {
    id: number;
    nombre: string;
  };
  estado: string;
  auto: boolean;
}

export interface CreateSolicitudInput {
  productId: number;
  cantidad: number;
  tiendaId?: number;
}

export interface UpdateSolicitudEstadoInput {
  estado: 'Pendiente' | 'En preparación' | 'Enviado' | 'Recibido' | 'Cancelado';
  origenId?: number;
}

export async function getSolicitudes(token?: string) {
  return request<Solicitud[]>('/solicitudes', { method: 'GET' }, token);
}

export async function createSolicitud(input: CreateSolicitudInput, token?: string) {
  return request<Solicitud>('/solicitudes', {
    method: 'POST',
    body: JSON.stringify(input),
  }, token);
}

export async function updateSolicitudEstado(id: number, input: UpdateSolicitudEstadoInput, token?: string) {
  return request<Solicitud>(`/solicitudes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, token);
}