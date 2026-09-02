import { api } from '../api/client';
import type {
  MovimientoItem,
  CreateMovimientoDto,
  MovimientoFilters,
} from '../types/movimiento.types';

export const movimientosService = {
  async getMovimientos(filters: MovimientoFilters = {}): Promise<MovimientoItem[]> {
    const data = await api.get<MovimientoItem[]>('/movimientos');
    const list = Array.isArray(data) ? data : [];
    return this.filterLocal(list, filters);
  },

  filterLocal(list: MovimientoItem[], filters: MovimientoFilters): MovimientoItem[] {
    return list.filter((m) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matches =
          m.product?.producto?.toLowerCase().includes(s) ||
          m.product?.marca?.toLowerCase().includes(s) ||
          m.product?.codigoFabrica?.toLowerCase().includes(s) ||
          m.product?.codigoOem?.toLowerCase().includes(s) ||
          m.observacion?.toLowerCase().includes(s) ||
          m.usuario?.nombre?.toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filters.origenId && m.origenId !== Number(filters.origenId)) return false;
      if (filters.destinoId && m.destinoId !== Number(filters.destinoId)) return false;
      if (filters.fechaDesde && new Date(m.fecha) < new Date(filters.fechaDesde)) return false;
      if (filters.fechaHasta && new Date(m.fecha) > new Date(filters.fechaHasta)) return false;
      return true;
    });
  },

  async createMovimiento(dto: CreateMovimientoDto): Promise<MovimientoItem> {
    const data = await api.post<MovimientoItem>('/movimientos', dto);
    return data;
  },
};