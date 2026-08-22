import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProductsService } from '../products/products.service';
import type { ProductFilters } from '../products/products.service';
import type { Product } from '../entities/product.entity';

export interface UpdatePreciosDto {
  precio1?: number | null;
  precio2?: number | null;
  precioMayor?: number | null;
}

export interface FilaPrecio {
  id: number;
  producto: string;
  fabricante: string;
  marca: string;
  modelo: string;
  anio: string | null;
  codigoOem: string | null;
  codigoFabrica: string;
  costo: number;
  precio1: number | null;
  precio2: number | null;
  precioMayor: number | null;
  stockTotal: number;
}

const EXCEL_HEADERS = [
  'ID',
  'Producto',
  'Fabricante',
  'Marca',
  'Modelo',
  'Año',
  'Código OEM',
  'Código Fábrica',
  'Costo',
  'Precio 1',
  'Precio 2',
  'Precio Mayor',
  'Stock',
];

@Injectable()
export class PreciosService {
  constructor(private productsService: ProductsService) {}

  async findAll(filters: ProductFilters): Promise<FilaPrecio[]> {
    const products = await this.productsService.findAll(filters);
    return products.map((p) => this.toFila(p));
  }

  async updatePrecios(id: number, data: UpdatePreciosDto): Promise<FilaPrecio> {
    const cambios: Partial<Product> = {};
    if ('precio1' in data) cambios.precio1 = data.precio1 ?? null;
    if ('precio2' in data) cambios.precio2 = data.precio2 ?? null;
    if ('precioMayor' in data) cambios.precioMayor = data.precioMayor ?? null;
    if (Object.keys(cambios).length === 0) {
      throw new BadRequestException(
        'No se enviaron precios para actualizar (precio1, precio2 o precioMayor)',
      );
    }
    const actualizado = await this.productsService.update(id, cambios);
    return this.toFila(actualizado);
  }

  async exportExcel(filters: ProductFilters): Promise<Buffer> {
    const filas = await this.findAll(filters);
    const datos = filas.map((f) => ({
      ID: f.id,
      Producto: f.producto,
      Fabricante: f.fabricante,
      Marca: f.marca,
      Modelo: f.modelo,
      Año: f.anio ?? '',
      'Código OEM': f.codigoOem ?? '',
      'Código Fábrica': f.codigoFabrica,
      Costo: f.costo,
      'Precio 1': f.precio1 ?? '',
      'Precio 2': f.precio2 ?? '',
      'Precio Mayor': f.precioMayor ?? '',
      Stock: f.stockTotal,
    }));
    const hoja = XLSX.utils.json_to_sheet(datos, { header: EXCEL_HEADERS });
    hoja['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 13 },
      { wch: 8 },
    ];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Precios');
    const buffer = XLSX.write(libro, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  private toFila(p: Product & { stockTotal: number }): FilaPrecio {
    return {
      id: p.id,
      producto: p.producto,
      fabricante: p.fabricante,
      marca: p.marca,
      modelo: p.modelo,
      anio: p.anio,
      codigoOem: p.codigoOem,
      codigoFabrica: p.codigoFabrica,
      costo: p.costo,
      precio1: p.precio1,
      precio2: p.precio2,
      precioMayor: p.precioMayor,
      stockTotal: p.stockTotal,
    };
  }
}
