import { api } from '../api/client';
import type {
  FilaPrecio,
  UpdatePreciosDto,
  PrecioFilters,
} from '../types/precio.types';

const INITIAL_MOCK_PRECIOS: FilaPrecio[] = [
  {
    id: 1,
    producto: 'Farol delantero derecho',
    fabricante: 'Depo',
    marca: 'Toyota',
    modelo: 'Hilux',
    anio: '2016-2020',
    codigoOem: '81110-0KD10',
    codigoFabrica: 'DEP-212-11V6R',
    costo: 380,
    precio1: 490,
    precio2: 440,
    precioMayor: 410,
    stockTotal: 18,
  },
  {
    id: 2,
    producto: 'Pastillas de freno delanteras',
    fabricante: 'Bosch',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: '2014-2019',
    codigoOem: '04465-02220',
    codigoFabrica: 'BOS-0986AB1',
    costo: 240,
    precio1: 320,
    precio2: 290,
    precioMayor: 265,
    stockTotal: 25,
  },
  {
    id: 3,
    producto: 'Disco de freno ventilado',
    fabricante: 'Brembo',
    marca: 'Toyota',
    modelo: 'Rav4',
    anio: '2013-2018',
    codigoOem: '43512-42050',
    codigoFabrica: 'BRM-09A41711',
    costo: 450,
    precio1: 580,
    precio2: 530,
    precioMayor: 495,
    stockTotal: 12,
  },
  {
    id: 4,
    producto: 'Parachoques delantero',
    fabricante: 'Tong Yang',
    marca: 'Nissan',
    modelo: 'Sentra',
    anio: '2017-2021',
    codigoOem: '62022-3SH0H',
    codigoFabrica: 'TY-NS04118BA',
    costo: 420,
    precio1: 560,
    precio2: 500,
    precioMayor: 460,
    stockTotal: 8,
  },
  {
    id: 5,
    producto: 'Amortiguador delantero gas',
    fabricante: 'KYB',
    marca: 'Nissan',
    modelo: 'Versa',
    anio: '2012-2019',
    codigoOem: '54302-3BA0A',
    codigoFabrica: 'KYB-3330045',
    costo: 310,
    precio1: 420,
    precio2: 380,
    precioMayor: 345,
    stockTotal: 15,
  },
  {
    id: 6,
    producto: 'Bomba de agua con empaque',
    fabricante: 'GMB',
    marca: 'Suzuki',
    modelo: 'Grand Vitara',
    anio: '2006-2015',
    codigoOem: '17400-66J00',
    codigoFabrica: 'GMB-GWS-39A',
    costo: 260,
    precio1: 350,
    precio2: 315,
    precioMayor: 285,
    stockTotal: 9,
  },
  {
    id: 7,
    producto: 'Radiador de aluminio',
    fabricante: 'Denso',
    marca: 'Hyundai',
    modelo: 'Tucson',
    anio: '2016-2020',
    codigoOem: '25310-D3000',
    codigoFabrica: 'DEN-422134-11',
    costo: 520,
    precio1: 690,
    precio2: 630,
    precioMayor: 575,
    stockTotal: 6,
  },
];

let localPrecios: FilaPrecio[] = [...INITIAL_MOCK_PRECIOS];

export const preciosService = {
  async getPrecios(filters: PrecioFilters = {}): Promise<FilaPrecio[]> {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.marca) params.append('marca', filters.marca);
      if (filters.fabricante) params.append('fabricante', filters.fabricante);
      if (filters.modelo) params.append('modelo', filters.modelo);

      const qs = params.toString();
      const url = qs ? `/precios?${qs}` : '/precios';

      const data = await api.get<FilaPrecio[]>(url);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return this.filterLocal(localPrecios, filters);
    } catch (err) {
      console.warn('Backend /precios inaccesible, usando datos locales:', err);
      return this.filterLocal(localPrecios, filters);
    }
  },

  filterLocal(list: FilaPrecio[], filters: PrecioFilters): FilaPrecio[] {
    return list.filter((p) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matches =
          p.producto.toLowerCase().includes(s) ||
          p.marca.toLowerCase().includes(s) ||
          p.modelo.toLowerCase().includes(s) ||
          p.codigoFabrica.toLowerCase().includes(s) ||
          (p.codigoOem && p.codigoOem.toLowerCase().includes(s)) ||
          p.fabricante.toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filters.marca && p.marca.toLowerCase() !== filters.marca.toLowerCase()) return false;
      if (filters.fabricante && p.fabricante.toLowerCase() !== filters.fabricante.toLowerCase()) return false;
      if (filters.modelo && p.modelo.toLowerCase() !== filters.modelo.toLowerCase()) return false;
      return true;
    });
  },

  async updatePrecios(id: number, dto: UpdatePreciosDto): Promise<FilaPrecio> {
    try {
      const updated = await api.patch<FilaPrecio>(`/precios/${id}`, dto);
      return updated;
    } catch (err) {
      console.warn(`Backend /precios/${id} PATCH falló, actualizando local:`, err);
      const idx = localPrecios.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Producto no encontrado');

      const existing = localPrecios[idx];
      const updated: FilaPrecio = {
        ...existing,
        precio1: dto.precio1 !== undefined ? dto.precio1 : existing.precio1,
        precio2: dto.precio2 !== undefined ? dto.precio2 : existing.precio2,
        precioMayor: dto.precioMayor !== undefined ? dto.precioMayor : existing.precioMayor,
      };
      localPrecios[idx] = updated;
      return updated;
    }
  },

  async exportExcel(filters: PrecioFilters = {}): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.marca) params.append('marca', filters.marca);
    if (filters.fabricante) params.append('fabricante', filters.fabricante);
    if (filters.modelo) params.append('modelo', filters.modelo);

    const qs = params.toString();
    const url = `${baseUrl}/precios/export${qs ? `?${qs}` : ''}`;

    try {
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fecha = new Date().toISOString().slice(0, 10);
      link.href = downloadUrl;
      link.download = `catalogo-precios-${fecha}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.warn('Exportación backend falló, generando archivo de descarga fallback:', err);
      // Fallback: descargar CSV simple si no hay backend activo
      const filas = this.filterLocal(localPrecios, filters);
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          'ID,Producto,Fabricante,Marca,Modelo,CodigoFabrica,CodigoOEM,Costo,Precio1,Precio2,PrecioMayor,Stock',
          ...filas.map(
            (f) =>
              `${f.id},"${f.producto}","${f.fabricante}","${f.marca}","${f.modelo}","${f.codigoFabrica}","${f.codigoOem || ''}",${f.costo},${f.precio1 || ''},${f.precio2 || ''},${f.precioMayor || ''},${f.stockTotal}`
          ),
        ].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `catalogo-precios-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },
};
