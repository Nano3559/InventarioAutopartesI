import { api } from './client';

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

export async function getSolicitudes(): Promise<Solicitud[]> {
  return api.get<Solicitud[]>('/solicitudes');
}

export async function createSolicitud(input: CreateSolicitudInput): Promise<Solicitud> {
  return api.post<Solicitud>('/solicitudes', input);
}

export async function updateSolicitudEstado(
  id: number,
  input: UpdateSolicitudEstadoInput
): Promise<Solicitud> {
  return api.patch<Solicitud>(`/solicitudes/${id}/estado`, input);
}