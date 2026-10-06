export type TipoAsistencia = 'entrada' | 'salida';
export type MetodoAsistencia = 'automatico' | 'manual';

export interface AttendanceUser {
  id: number;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: string;
}

export interface AttendanceLocation {
  id: number;
  nombre: string;
  codigo: string;
  tipo: string;
}

export interface AttendanceConfirmador {
  id: number;
  nombre: string;
  apellido: string | null;
}

export interface AttendanceItem {
  id: number;
  usuarioId: number;
  locationId: number | null;
  fecha: string; // ISO date string
  tipo: TipoAsistencia;
  metodo: MetodoAsistencia;
  confianza: number | null;
  nombreCompleto: string;
  usuario: AttendanceUser | null;
  location: AttendanceLocation | null;
  confirmadoPor: AttendanceConfirmador | null;
}

export interface AttendanceFilters {
  page?: number;
  limit?: number;
  usuarioId?: number | string;
  locationId?: number | string;
  tipo?: string;
  metodo?: string;
  desde?: string;
  hasta?: string;
  search?: string;
}

export interface AttendanceResponse {
  data: AttendanceItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface UpdateAttendanceDto {
  usuarioId?: number;
  locationId?: number | null;
  fecha?: string;
  tipo?: TipoAsistencia;
  metodo?: MetodoAsistencia;
  confianza?: number | null;
  confirmadoPorId?: number | null;
}

export interface DashboardTotales {
  personal: number;
  presentes: number;
  ausentes: number;
  dentro: number;
  fuera: number;
  marcajes: number;
  entradas: number;
  salidas: number;
  rostrosRegistrados: number;
}

export interface DashboardPresente {
  usuarioId: number;
  nombre: string;
  apellido: string | null;
  nombreCompleto: string;
  email: string;
  rol: string;
  presencia: 'presente';
  dentro: boolean;
  horaEntrada: string | null;
  horaSalida: string | null;
  ultimaMarca: {
    asistenciaId: number;
    tipo: TipoAsistencia;
    fecha: string;
    metodo: MetodoAsistencia;
    confianza: number | null;
  };
  marcajes: number;
  rostroRegistrado: boolean;
}

export interface DashboardAusente {
  usuarioId: number;
  nombre: string;
  apellido: string | null;
  nombreCompleto: string;
  email: string;
  rol: string;
  rostroRegistrado: boolean;
}

export interface DashboardGrupo {
  locationId: number | null;
  codigo: string | null;
  nombre: string;
  tipo: string | null;
  totalPersonal: number;
  totalMarcajes: number;
  presentes: DashboardPresente[];
  ausentes: DashboardAusente[];
}

export interface DashboardResponse {
  fecha: string;
  desde: string;
  hasta: string;
  totales: DashboardTotales;
  porTienda: DashboardGrupo[];
  sinTienda: DashboardGrupo;
  ultimosMarcajes: AttendanceItem[];
}

export interface DashboardFilters {
  fecha?: string; // YYYY-MM-DD
}

