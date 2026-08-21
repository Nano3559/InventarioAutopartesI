import { api } from '../api/client';
import type {
  Product,
  ProductFilters,
  CreateProductDto,
  UpdateProductDto,
  LocationStock,
} from '../types/product.types';

// Mock data completo de autopartes para desarrollo y fallback local
export const INITIAL_MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    producto: 'Farol delantero derecho',
    fabricante: 'Depo',
    empresaFabricante: 'Depo Auto Parts',
    marca: 'Toyota',
    modelo: 'Hilux',
    anio: '2016-2020',
    detalle: 'Fondo negro con proyector LED, procedencia taiwanesa',
    codigoOem: '81110-0KD10',
    codigoFabrica: 'DEP-212-11V6R',
    imagen: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&q=80',
    costo: 380,
    precio1: 520,
    precio2: 480,
    precioMayor: 440,
    stockTotal: 18,
    stockMinimo: 4,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 2,
    producto: 'Farol delantero izquierdo',
    fabricante: 'Depo',
    empresaFabricante: 'Depo Auto Parts',
    marca: 'Toyota',
    modelo: 'Hilux',
    anio: '2016-2020',
    detalle: 'Fondo negro con proyector LED, procedencia taiwanesa',
    codigoOem: '81150-0KD10',
    codigoFabrica: 'DEP-212-11V6L',
    imagen: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&q=80',
    costo: 380,
    precio1: 520,
    precio2: 480,
    precioMayor: 440,
    stockTotal: 15,
    stockMinimo: 4,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 3,
    producto: 'Stop trasero derecho',
    fabricante: 'TYC',
    empresaFabricante: 'TYC Brother Industrial',
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: '2014-2017',
    detalle: 'Bicolor rojo y cristal, calidad taiwanesa garantizada',
    codigoOem: '81550-02780',
    codigoFabrica: 'TYC-11-6647-00',
    imagen: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400&q=80',
    costo: 210,
    precio1: 310,
    precio2: 290,
    precioMayor: 260,
    stockTotal: 22,
    stockMinimo: 5,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 4,
    producto: 'Parachoques delantero',
    fabricante: 'Tong Yang',
    empresaFabricante: 'Tong Yang Group',
    marca: 'Nissan',
    modelo: 'Sentra',
    anio: '2013-2019',
    detalle: 'Plástico polipropileno virgen de alta flexibilidad, negro primer listo para pintar',
    codigoOem: '62022-3SH0H',
    codigoFabrica: 'TY-NS04118BA',
    imagen: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400&q=80',
    costo: 420,
    precio1: 650,
    precio2: 600,
    precioMayor: 530,
    stockTotal: 8,
    stockMinimo: 3,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 5,
    producto: 'Máscara frontal con cromado',
    fabricante: 'TYC',
    empresaFabricante: 'TYC Brother Industrial',
    marca: 'Nissan',
    modelo: 'Frontier / NP300',
    anio: '2016-2021',
    detalle: 'Acabado cromado espejo triple capa',
    codigoOem: '62310-4KH0A',
    codigoFabrica: 'TYC-20-9831-00',
    imagen: null,
    costo: 310,
    precio1: 460,
    precio2: 430,
    precioMayor: 380,
    stockTotal: 12,
    stockMinimo: 3,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 6,
    producto: 'Capot delantero',
    fabricante: 'Gordon',
    empresaFabricante: 'Gordon Auto Body Parts',
    marca: 'Toyota',
    modelo: 'RAV4',
    anio: '2019-2023',
    detalle: 'Chapa de acero electro-zincada con tratamiento anticorrosión',
    codigoOem: '53301-42170',
    codigoFabrica: 'GOR-TY43019A',
    imagen: null,
    costo: 650,
    precio1: 980,
    precio2: 920,
    precioMayor: 820,
    stockTotal: 5,
    stockMinimo: 2,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 7,
    producto: 'Radiador de motor AT',
    fabricante: 'Koyo',
    empresaFabricante: 'Koyo Radiator Co.',
    marca: 'Mitsubishi',
    modelo: 'L200 Triton',
    anio: '2015-2022',
    detalle: 'Aluminio soldado con tanques plásticos reforzados de alta densidad',
    codigoOem: '1350A603',
    codigoFabrica: 'KOY-PL032398',
    imagen: null,
    costo: 540,
    precio1: 790,
    precio2: 740,
    precioMayor: 660,
    stockTotal: 9,
    stockMinimo: 3,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 8,
    producto: 'Condensador de aire acondicionado',
    fabricante: 'Denso',
    empresaFabricante: 'Denso Corporation',
    marca: 'Hyundai',
    modelo: 'Tucson',
    anio: '2016-2020',
    detalle: 'Microtubos paralelos de alta eficiencia térmica',
    codigoOem: '97606-D3000',
    codigoFabrica: 'DNS-477-0812',
    imagen: null,
    costo: 460,
    precio1: 680,
    precio2: 630,
    precioMayor: 560,
    stockTotal: 11,
    stockMinimo: 3,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 9,
    producto: 'Espejo retrovisor lateral derecho eléctrico',
    fabricante: 'Depo',
    empresaFabricante: 'Depo Auto Parts',
    marca: 'Mazda',
    modelo: 'Mazda 3',
    anio: '2014-2018',
    detalle: 'Regulación eléctrica con luz guiñador integrada y desempañador',
    codigoOem: 'BJE2-69-121J',
    codigoFabrica: 'DEP-216-5401R',
    imagen: null,
    costo: 280,
    precio1: 420,
    precio2: 390,
    precioMayor: 340,
    stockTotal: 7,
    stockMinimo: 2,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 10,
    producto: 'Puerta delantera izquierda',
    fabricante: 'Gordon',
    empresaFabricante: 'Gordon Auto Body Parts',
    marca: 'Renault',
    modelo: 'Duster',
    anio: '2012-2019',
    detalle: 'Lámina de acero estampada troquelada original',
    codigoOem: '80101-0817R',
    codigoFabrica: 'GOR-RN20011L',
    imagen: null,
    costo: 780,
    precio1: 1150,
    precio2: 1080,
    precioMayor: 950,
    stockTotal: 3,
    stockMinimo: 2,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 11,
    producto: 'Jalador / Manija exterior cromada',
    fabricante: 'Tong Yang',
    empresaFabricante: 'Tong Yang Group',
    marca: 'Jeep',
    modelo: 'Grand Cherokee',
    anio: '2011-2017',
    detalle: 'Cromado brillante con sensor keyless',
    codigoOem: '1SY48TZZAC',
    codigoFabrica: 'TY-JP07001C',
    imagen: null,
    costo: 95,
    precio1: 160,
    precio2: 145,
    precioMayor: 125,
    stockTotal: 25,
    stockMinimo: 6,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 12,
    producto: 'Tanque de agua auxiliar / Reservorio',
    fabricante: 'TYC',
    empresaFabricante: 'TYC Brother Industrial',
    marca: 'Dodge',
    modelo: 'Ram 1500 / 2500',
    anio: '2013-2018',
    detalle: 'Polietileno de alta resistencia con tapa a presión de seguridad',
    codigoOem: '68102155AA',
    codigoFabrica: 'TYC-TK-DG012',
    imagen: null,
    costo: 130,
    precio1: 220,
    precio2: 200,
    precioMayor: 175,
    stockTotal: 14,
    stockMinimo: 3,
    activo: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
];

// Generador de desglose de stock por ubicación en base al stock total
export function generateMockStockBreakdown(stockTotal: number): LocationStock[] {
  const locs = [
    { id: 1, ubicacion: 'Almacén 1 (Central El Alto)', tipo: 'almacen' as const },
    { id: 2, ubicacion: 'Almacén 2 (Norte)', tipo: 'almacen' as const },
    { id: 3, ubicacion: 'Almacén 3 (Sur)', tipo: 'almacen' as const },
    { id: 4, ubicacion: 'Almacén 4 (Distribución)', tipo: 'almacen' as const },
    { id: 5, ubicacion: 'Tienda 1 (Av. Principal)', tipo: 'tienda' as const },
    { id: 6, ubicacion: 'Tienda 2 (Comercial Repuestos)', tipo: 'tienda' as const },
    { id: 7, ubicacion: 'Tienda 3 (Zona Sur)', tipo: 'tienda' as const },
  ];

  if (stockTotal <= 0) {
    return locs.map((l) => ({ locationId: l.id, ubicacion: l.ubicacion, tipo: l.tipo, cantidad: 0 }));
  }

  // Distribuir cantidades
  const weights = [0.3, 0.2, 0.15, 0.15, 0.08, 0.06, 0.06];
  let remaining = stockTotal;
  const result: LocationStock[] = [];

  for (let i = 0; i < locs.length; i++) {
    if (i === locs.length - 1) {
      result.push({
        locationId: locs[i].id,
        ubicacion: locs[i].ubicacion,
        tipo: locs[i].tipo,
        cantidad: Math.max(0, remaining),
      });
    } else {
      const qty = Math.floor(stockTotal * weights[i]);
      result.push({
        locationId: locs[i].id,
        ubicacion: locs[i].ubicacion,
        tipo: locs[i].tipo,
        cantidad: qty,
      });
      remaining -= qty;
    }
  }

  return result;
}

// Estado local reactivo en memoria para fallback
let localProducts = [...INITIAL_MOCK_PRODUCTS];

export const productsService = {
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    try {
      const data = await api.get<Product[]>('/products', {
        params: {
          search: filters.search,
          marca: filters.marca,
          fabricante: filters.fabricante,
          producto: filters.producto,
          modelo: filters.modelo,
          anio: filters.anio,
          codigoOem: filters.codigoOem,
          codigoFabrica: filters.codigoFabrica,
        },
      });
      if (Array.isArray(data)) {
        return data;
      }
      return this.filterLocal(filters);
    } catch (err) {
      console.warn('Backend /products no disponible, usando catálogo local:', err);
      return this.filterLocal(filters);
    }
  },

  filterLocal(filters: ProductFilters): Product[] {
    return localProducts.filter((p) => {
      if (!p.activo) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matches =
          p.producto.toLowerCase().includes(s) ||
          p.marca.toLowerCase().includes(s) ||
          p.modelo.toLowerCase().includes(s) ||
          (p.codigoOem && p.codigoOem.toLowerCase().includes(s)) ||
          p.codigoFabrica.toLowerCase().includes(s) ||
          p.fabricante.toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filters.marca && p.marca.toLowerCase() !== filters.marca.toLowerCase()) return false;
      if (filters.fabricante && p.fabricante.toLowerCase() !== filters.fabricante.toLowerCase()) return false;
      if (filters.producto && !p.producto.toLowerCase().includes(filters.producto.toLowerCase())) return false;
      if (filters.modelo && !p.modelo.toLowerCase().includes(filters.modelo.toLowerCase())) return false;
      if (filters.anio && p.anio && !p.anio.toLowerCase().includes(filters.anio.toLowerCase())) return false;
      if (filters.codigoOem && p.codigoOem && !p.codigoOem.toLowerCase().includes(filters.codigoOem.toLowerCase())) return false;
      if (filters.codigoFabrica && !p.codigoFabrica.toLowerCase().includes(filters.codigoFabrica.toLowerCase())) return false;
      return true;
    });
  },

  async getProductStock(productId: number): Promise<LocationStock[]> {
    try {
      const data = await api.get<LocationStock[]>(`/products/${productId}/stock`);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      const prod = localProducts.find((p) => p.id === productId);
      return generateMockStockBreakdown(prod?.stockTotal ?? 10);
    } catch (err) {
      console.warn(`Backend /products/${productId}/stock inaccesible:`, err);
      const prod = localProducts.find((p) => p.id === productId);
      return generateMockStockBreakdown(prod?.stockTotal ?? 10);
    }
  },

  async createProduct(dto: CreateProductDto): Promise<Product> {
    try {
      const created = await api.post<Product>('/products', dto);
      return created;
    } catch (err) {
      console.warn('Backend /products POST falló, guardando en catálogo local:', err);
      // Calcular stock total sumando las ubicaciones si vinieron
      let stockTotal = 0;
      if (dto.stock) {
        stockTotal = Object.values(dto.stock).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
      }

      const newProd: Product = {
        id: localProducts.length > 0 ? Math.max(...localProducts.map((p) => p.id)) + 1 : 1,
        producto: dto.producto,
        fabricante: dto.fabricante,
        empresaFabricante: dto.empresaFabricante || null,
        marca: dto.marca,
        modelo: dto.modelo,
        anio: dto.anio || null,
        detalle: dto.detalle || null,
        codigoOem: dto.codigoOem || null,
        codigoFabrica: dto.codigoFabrica,
        imagen: dto.imagen || null,
        costo: Number(dto.costo) || 0,
        precio1: Number(dto.precio1) || null,
        precio2: Number(dto.precio2) || null,
        precioMayor: Number(dto.precioMayor) || null,
        stockTotal: stockTotal || 5,
        stockMinimo: Number(dto.stockMinimo) || 2,
        activo: true,
        createdAt: new Date().toISOString(),
      };
      localProducts = [newProd, ...localProducts];
      return newProd;
    }
  },

  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    try {
      const updated = await api.patch<Product>(`/products/${id}`, dto);
      return updated;
    } catch (err) {
      console.warn(`Backend /products/${id} PATCH falló, actualizando localmente:`, err);
      const idx = localProducts.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Producto no encontrado');

      const existing = localProducts[idx];
      const { stock: _ignoredStock, ...restDto } = dto;
      const updated: Product = {
        ...existing,
        ...restDto,
        costo: dto.costo !== undefined ? Number(dto.costo) : existing.costo,
        precio1: dto.precio1 !== undefined ? Number(dto.precio1) : existing.precio1,
        precio2: dto.precio2 !== undefined ? Number(dto.precio2) : existing.precio2,
        precioMayor: dto.precioMayor !== undefined ? Number(dto.precioMayor) : existing.precioMayor,
      };
      localProducts[idx] = updated;
      return updated;
    }
  },

  async deleteProduct(id: number): Promise<void> {
    try {
      await api.delete(`/products/${id}`);
    } catch (err) {
      console.warn(`Backend /products/${id} DELETE falló, dando de baja localmente:`, err);
      localProducts = localProducts.filter((p) => p.id !== id);
    }
  },
};
