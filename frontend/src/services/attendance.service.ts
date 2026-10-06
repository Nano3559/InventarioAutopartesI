import { api } from '../api/client';
import type {
  AttendanceFilters,
  AttendanceResponse,
  AttendanceItem,
  UpdateAttendanceDto,
} from '../types/attendance.types';

export const attendanceService = {
  async getAttendance(filters: AttendanceFilters = {}): Promise<AttendanceResponse> {
    const params: Record<string, string | number | undefined> = {};
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.usuarioId) params.usuarioId = filters.usuarioId;
    if (filters.locationId) params.locationId = filters.locationId;
    if (filters.tipo) params.tipo = filters.tipo;
    if (filters.metodo) params.metodo = filters.metodo;
    if (filters.desde) params.desde = filters.desde;
    if (filters.hasta) params.hasta = filters.hasta;
    if (filters.search) params.search = filters.search;

    return api.get<AttendanceResponse>('/attendance', { params });
  },

  async updateAttendance(id: number, data: UpdateAttendanceDto): Promise<AttendanceItem> {
    return api.patch<AttendanceItem>(`/attendance/${id}`, data);
  },

  async confirmManual(id: number): Promise<AttendanceItem> {
    return api.post<AttendanceItem>(`/attendance/${id}/confirm`);
  },
};
