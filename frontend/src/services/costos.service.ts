import { api } from '../api/client';
import type {
  Factura,
  CreateFacturaDto,
  Proveedor,
  CreateProveedorDto,
} from '../types/costo.types';

const INITIAL_PROVEEDORES: Proveedor[] = [
  { id: 1, nombre: 'Denso Corporation', pais: 'Japón', contacto: '+81 566 25 5511 (ventas@denso.co.jp)' },
  { id: 2, nombre: 'Bosch Autopartes Latam', pais: 'Alemania', contacto: '+591 2 2445566 (contacto@bosch.bo)' },
  { id: 3, nombre: 'Brembo Brake Systems', pais: 'Italia', contacto: '+39 035 605 111 (info@brembo.it)' },
  { id: 4, nombre: 'Tong Yang Group', pais: 'Taiwán', contacto: '+886 6 256 0511 (sales@tyg.com.tw)' },
  { id: 5, nombre: 'Depo Auto Lamps', pais: 'Taiwán', contacto: '+886 4 772 2311 (service@depo.com.tw)' },
  { id: 6, nombre: 'Importadora Andina Repuestos', pais: 'Bolivia', contacto: '+591 77234567 (La Paz - El Alto)' },
];

const INITIAL_FACTURAS: Factura[] = [
  {
    id: 1,
    proveedorId: 1,
    proveedor: INITIAL_PROVEEDORES[0],
    numero: 'FAC-DEN-2026-081',
    tipoCambio: 6.96,
    porcentaje: 10,
    monto: 3800,
    archivo: null,
    fecha: '2026-08-20T10:00:00Z',
    items: [
      {
        id: 1,
        facturaId: 1,
        productId: 1,
        product: {
          id: 1,
          producto: 'Farol delantero derecho',
          fabricante: 'Depo',
          marca: 'Toyota',
          modelo: 'Hilux',
          codigoFabrica: 'DEP-212-11V6R',
          costo: 380,
          stockTotal: 18,
          activo: true,
        },
        cantidad: 10,
        costoUnitario: 380,
        subtotal: 3800,
        locationId: 1,
      },
    ],
  },
  {
    id: 2,
    proveedorId: 2,
    proveedor: INITIAL_PROVEEDORES[1],
    numero: 'BOS-BO-9942',
    tipoCambio: 6.96,
    porcentaje: 5,
    monto: 2400,
    archivo: null,
    fecha: '2026-08-24T15:30:00Z',
    items: [
      {
        id: 2,
        facturaId: 2,
        productId: 2,
        product: {
          id: 2,
          producto: 'Pastillas de freno delanteras',
          fabricante: 'Bosch',
          marca: 'Toyota',
          modelo: 'Corolla',
          codigoFabrica: 'BOS-0986AB1',
          costo: 240,
          stockTotal: 25,
          activo: true,
        },
        cantidad: 10,
        costoUnitario: 240,
        subtotal: 2400,
        locationId: 2,
      },
    ],
  },
];

let localProveedores = [...INITIAL_PROVEEDORES];
let localFacturas = [...INITIAL_FACTURAS];

export const costosService = {
  // --- PROVEEDORES ---
  async getProveedores(): Promise<Proveedor[]> {
    try {
      const data = await api.get<Proveedor[]>('/proveedores');
      if (Array.isArray(data) && data.length > 0) return data;
      return localProveedores;
    } catch (err) {
      console.warn('Backend /proveedores inaccesible, usando catálogo local:', err);
      return localProveedores;
    }
  },

  async createProveedor(dto: CreateProveedorDto): Promise<Proveedor> {
    try {
      const created = await api.post<Proveedor>('/proveedores', dto);
      return created;
    } catch (err) {
      console.warn('Backend /proveedores POST falló, guardando localmente:', err);
      const newProv: Proveedor = {
        id: localProveedores.length > 0 ? Math.max(...localProveedores.map((p) => p.id)) + 1 : 1,
        nombre: dto.nombre,
        pais: dto.pais,
        contacto: dto.contacto || null,
        createdAt: new Date().toISOString(),
      };
      localProveedores = [newProv, ...localProveedores];
      return newProv;
    }
  },

  // --- FACTURAS DE COMPRA ---
  async getFacturas(): Promise<Factura[]> {
    try {
      const data = await api.get<Factura[]>('/costos/facturas');
      if (Array.isArray(data)) return data;
      return localFacturas;
    } catch (err) {
      console.warn('Backend /costos/facturas inaccesible, usando datos locales:', err);
      return localFacturas;
    }
  },

  async getFacturaById(id: number): Promise<Factura> {
    try {
      const data = await api.get<Factura>(`/costos/facturas/${id}`);
      if (data && data.id) return data;
      const found = localFacturas.find((f) => f.id === id);
      if (!found) throw new Error('Factura no encontrada');
      return found;
    } catch (err) {
      console.warn(`Backend /costos/facturas/${id} falló, buscando en local:`, err);
      const found = localFacturas.find((f) => f.id === id);
      if (!found) throw new Error('Factura no encontrada');
      return found;
    }
  },

  async createFactura(dto: CreateFacturaDto, archivoFile?: File): Promise<Factura> {
    const token = localStorage.getItem('auth_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const formData = new FormData();
    formData.append('proveedorId', String(dto.proveedorId));
    formData.append('numero', dto.numero);
    if (dto.tipoCambio !== undefined) formData.append('tipoCambio', String(dto.tipoCambio));
    if (dto.porcentaje !== undefined) formData.append('porcentaje', String(dto.porcentaje));
    if (dto.monto !== undefined) formData.append('monto', String(dto.monto));
    formData.append('items', JSON.stringify(dto.items));

    if (archivoFile) {
      formData.append('archivo', archivoFile);
    }

    try {
      const res = await fetch(`${baseUrl}/costos/facturas`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const created = await res.json();
      return created;
    } catch (err) {
      console.warn('Backend /costos/facturas POST falló, guardando localmente:', err);
      const prov = localProveedores.find((p) => p.id === Number(dto.proveedorId)) || localProveedores[0];
      const newFact: Factura = {
        id: localFacturas.length > 0 ? Math.max(...localFacturas.map((f) => f.id)) + 1 : 1,
        proveedorId: Number(dto.proveedorId),
        proveedor: prov,
        numero: dto.numero,
        tipoCambio: Number(dto.tipoCambio) || 1,
        porcentaje: Number(dto.porcentaje) || 0,
        monto: Number(dto.monto) || 0,
        archivo: archivoFile ? URL.createObjectURL(archivoFile) : null,
        fecha: new Date().toISOString(),
        items: dto.items.map((it, idx) => ({
          id: idx + 1,
          productId: it.productId,
          cantidad: it.cantidad,
          costoUnitario: it.costoUnitario,
          subtotal: it.cantidad * it.costoUnitario,
          locationId: it.locationId || 1,
        })),
      };

      localFacturas = [newFact, ...localFacturas];
      return newFact;
    }
  },

  async deleteFactura(id: number): Promise<void> {
    try {
      await api.delete(`/costos/facturas/${id}`);
    } catch (err) {
      console.warn(`Backend /costos/facturas/${id} DELETE falló, eliminando local:`, err);
      localFacturas = localFacturas.filter((f) => f.id !== id);
    }
  },
};
