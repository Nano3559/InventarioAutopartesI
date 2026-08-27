import { api } from '../api/client';
import type {
  MovimientoItem,
  CreateMovimientoDto,
  MovimientoFilters,
} from '../types/movimiento.types';
import type { LocationItem } from '../types/product.types';

const MOCK_LOCATIONS_FALLBACK: LocationItem[] = [
  { id: 1, nombre: 'Almacén 1 (Central El Alto)', tipo: 'almacen', numero: 1, codigo: 'ALM-1' },
  { id: 2, nombre: 'Almacén 2 (Norte)', tipo: 'almacen', numero: 2, codigo: 'ALM-2' },
  { id: 3, nombre: 'Almacén 3 (Sur)', tipo: 'almacen', numero: 3, codigo: 'ALM-3' },
  { id: 4, nombre: 'Almacén 4 (Distribución)', tipo: 'almacen', numero: 4, codigo: 'ALM-4' },
  { id: 5, nombre: 'Tienda 1 (Av. Principal)', tipo: 'tienda', numero: 1, codigo: 'TIE-1' },
  { id: 6, nombre: 'Tienda 2 (Comercial Repuestos)', tipo: 'tienda', numero: 2, codigo: 'TIE-2' },
  { id: 7, nombre: 'Tienda 3 (Zona Sur)', tipo: 'tienda', numero: 3, codigo: 'TIE-3' },
];

const INITIAL_MOCK_MOVIMIENTOS: MovimientoItem[] = [
  {
    id: 1,
    productId: 1,
    product: {
      id: 1,
      producto: 'Farol delantero derecho',
      fabricante: 'Depo',
      marca: 'Toyota',
      modelo: 'Hilux',
      codigoFabrica: 'DEP-212-11V6R',
      codigoOem: '81110-0KD10',
      costo: 380,
      stockTotal: 18,
      activo: true,
    },
    cantidad: 3,
    origenId: 1,
    origen: MOCK_LOCATIONS_FALLBACK[0],
    destinoId: 5,
    destino: MOCK_LOCATIONS_FALLBACK[4],
    usuarioId: 1,
    usuario: {
      id: 1,
      nombre: 'Marco Admin',
      email: 'admin@autorepuestos.com',
      rol: 'admin',
    },
    fecha: '2026-08-25T14:30:00Z',
    observacion: 'Reposición de stock para vitrina de tienda',
  },
  {
    id: 2,
    productId: 4,
    product: {
      id: 4,
      producto: 'Parachoques delantero',
      fabricante: 'Tong Yang',
      marca: 'Nissan',
      modelo: 'Sentra',
      codigoFabrica: 'TY-NS04118BA',
      codigoOem: '62022-3SH0H',
      costo: 420,
      stockTotal: 8,
      activo: true,
    },
    cantidad: 2,
    origenId: 2,
    origen: MOCK_LOCATIONS_FALLBACK[1],
    destinoId: 6,
    destino: MOCK_LOCATIONS_FALLBACK[5],
    usuarioId: 1,
    usuario: {
      id: 1,
      nombre: 'Marco Admin',
      email: 'admin@autorepuestos.com',
      rol: 'admin',
    },
    fecha: '2026-08-26T09:15:00Z',
    observacion: 'Traslado solicitado por vendedor de Tienda 2',
  },
];

let localMovimientos: MovimientoItem[] = [...INITIAL_MOCK_MOVIMIENTOS];

export const movimientosService = {
  async getMovimientos(filters: MovimientoFilters = {}): Promise<MovimientoItem[]> {
    try {
      const data = await api.get<MovimientoItem[]>('/movimientos');
      if (Array.isArray(data)) {
        return this.filterLocal(data, filters);
      }
      return this.filterLocal(localMovimientos, filters);
    } catch (err) {
      console.warn('Backend /movimientos inaccesible, usando datos locales:', err);
      return this.filterLocal(localMovimientos, filters);
    }
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
    try {
      const data = await api.post<MovimientoItem>('/movimientos', dto);
      return data;
    } catch (err) {
      console.warn('Backend /movimientos POST falló, guardando localmente:', err);
      const origen = MOCK_LOCATIONS_FALLBACK.find((l: LocationItem) => l.id === dto.origenId) || MOCK_LOCATIONS_FALLBACK[0];
      const destino = MOCK_LOCATIONS_FALLBACK.find((l: LocationItem) => l.id === dto.destinoId) || MOCK_LOCATIONS_FALLBACK[4];

      const newMov: MovimientoItem = {
        id: localMovimientos.length > 0 ? Math.max(...localMovimientos.map((m: MovimientoItem) => m.id)) + 1 : 1,
        productId: dto.productId,
        product: {
          id: dto.productId,
          producto: 'Repuesto transferido',
          fabricante: 'Genérico',
          marca: 'Universal',
          modelo: 'Universal',
          codigoFabrica: `TRF-${dto.productId}`,
          costo: 0,
          stockTotal: 10,
          activo: true,
        },
        cantidad: dto.cantidad,
        origenId: dto.origenId,
        origen,
        destinoId: dto.destinoId,
        destino,
        usuarioId: 1,
        usuario: {
          id: 1,
          nombre: 'Marco Admin',
          email: 'admin@autorepuestos.com',
          rol: 'admin',
        },
        fecha: new Date().toISOString(),
        observacion: dto.observacion || null,
      };

      localMovimientos = [newMov, ...localMovimientos];
      return newMov;
    }
  },
};
