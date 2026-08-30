import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { User } from './entities/user.entity';
import { Location } from './entities/location.entity';
import { Product } from './entities/product.entity';
import { Inventory } from './entities/inventory.entity';
import { Proveedor } from './entities/proveedor.entity';
import { Cliente } from './entities/cliente.entity';
import { Factura } from './entities/factura.entity';
import { FacturaItem } from './entities/factura-item.entity';
import { Movimiento } from './entities/movimiento.entity';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Payment } from './entities/payment.entity';
import { Solicitud } from './entities/solicitud.entity';
import { Devolucion } from './entities/devolucion.entity';
import { computeHash, generatePlaceholderImage } from './common/image-hash';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

interface LocationSeed {
  codigo: string;
  nombre: string;
  tipo: 'almacen' | 'tienda';
  numero: number;
  ubicacion: string;
  horarios: string;
  contacto: string;
}

interface ProductSeed {
  producto: string;
  fabricante: string;
  empresaFabricante: string;
  marca: string;
  modelo: string;
  anio: string;
  detalle: string;
  codigoOem: string;
  codigoFabrica: string;
  costo: number;
  precio1: number;
  precio2: number;
  precioMayor: number;
}

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'inventario',
  entities: [
    User,
    Location,
    Product,
    Inventory,
    Proveedor,
    Cliente,
    Factura,
    FacturaItem,
    Movimiento,
    Sale,
    SaleItem,
    Payment,
    Solicitud,
    Devolucion,
  ],
  synchronize: true,
});

const LOCATIONS: LocationSeed[] = [
  {
    codigo: 'ALM-1',
    nombre: 'Almacén 1',
    tipo: 'almacen',
    numero: 1,
    ubicacion: 'Av. Blanco Galindo Km 7, Zona Quintanilla, Cochabamba',
    horarios: 'Lun-Sáb 08:30-18:30',
    contacto: 'importadora1@autopartes.bo / 4451-1001',
  },
  {
    codigo: 'ALM-2',
    nombre: 'Almacén 2',
    tipo: 'almacen',
    numero: 2,
    ubicacion: 'Av. Petrolera Nro. 1500, Zona Sud, Cochabamba',
    horarios: 'Lun-Vie 08:00-18:00 / Sáb 08:00-13:00',
    contacto: 'importadora2@autopartes.bo / 4452-2002',
  },
  {
    codigo: 'ALM-3',
    nombre: 'Almacén 3',
    tipo: 'almacen',
    numero: 3,
    ubicacion: 'Av. Beijing Nro. 300, Zona Norte, Cochabamba',
    horarios: 'Lun-Vie 08:00-18:00 / Sáb 08:00-13:00',
    contacto: 'importadora3@autopartes.bo / 4453-3003',
  },
  {
    codigo: 'ALM-4',
    nombre: 'Almacén 4',
    tipo: 'almacen',
    numero: 4,
    ubicacion: 'Av. América Nro. 800, Zona Cala Cala, Cochabamba',
    horarios: 'Lun-Sáb 08:30-18:30',
    contacto: 'importadora4@autopartes.bo / 4454-4004',
  },
  {
    codigo: 'TDA-1',
    nombre: 'Tienda 1',
    tipo: 'tienda',
    numero: 1,
    ubicacion: 'Av. Heroínas entre Ayacucho y Colombia, Centro, Cochabamba',
    horarios: 'Lun-Sáb 09:00-20:00',
    contacto: 'tienda1@autopartes.bo / 4411-1101',
  },
  {
    codigo: 'TDA-2',
    nombre: 'Tienda 2',
    tipo: 'tienda',
    numero: 2,
    ubicacion: 'Av. Melchor Pérez de Olguín Nro. 1200, Zona Sur, Cochabamba',
    horarios: 'Lun-Sáb 09:00-20:00',
    contacto: 'tienda2@autopartes.bo / 4412-2202',
  },
  {
    codigo: 'TDA-3',
    nombre: 'Tienda 3',
    tipo: 'tienda',
    numero: 3,
    ubicacion: 'Av. Barrientos Nro. 550, Zona Aeropuerto, Cochabamba',
    horarios: 'Lun-Sáb 09:00-19:30',
    contacto: 'tienda3@autopartes.bo / 4413-3303',
  },
];

const USERS: Array<{
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'inventario' | 'tienda';
  tiendaCodigo: string | null;
}> = [
  {
    nombre: 'Marco Admin',
    email: 'admin@autorepuestos.com',
    password: 'Admin1234!',
    rol: 'admin',
    tiendaCodigo: null,
  },
  {
    nombre: 'Brian Almacén',
    email: 'almacen@autorepuestos.com',
    password: 'Almacen1234!',
    rol: 'inventario',
    tiendaCodigo: null,
  },
  {
    nombre: 'Raúl Tienda',
    email: 'tienda1@autorepuestos.com',
    password: 'Tienda1234!',
    rol: 'tienda',
    tiendaCodigo: 'TDA-1',
  },
  {
    nombre: 'Vendedora Tienda 2',
    email: 'tienda2@autorepuestos.com',
    password: 'Tienda1234!',
    rol: 'tienda',
    tiendaCodigo: 'TDA-2',
  },
  {
    nombre: 'Vendedor Tienda 3',
    email: 'tienda3@autorepuestos.com',
    password: 'Tienda1234!',
    rol: 'tienda',
    tiendaCodigo: 'TDA-3',
  },
];

const PROVEEDORES = [
  {
    nombre: 'Taiwan Autopartes Import',
    pais: 'Bolivia',
    contacto: 'Representación Taiwán · ventas@taiwanimport.bo',
  },
  {
    nombre: 'Siam Parts Bolivia',
    pais: 'Bolivia',
    contacto: 'Representación Tailandia · ventas@siamparts.bo',
  },
  {
    nombre: 'China Auto Repuestos Ltda.',
    pais: 'Bolivia',
    contacto: 'Representación China · pedidos@chinauto.bo',
  },
];

const PRODUCTS: ProductSeed[] = [
  {
    producto: 'Farol',
    fabricante: 'Toyota',
    empresaFabricante: 'Taiwán',
    marca: 'Tyc',
    modelo: 'Hilux',
    anio: '2015-2020',
    detalle: 'Farol derecho. Lente de cristal, carcasa negra.',
    codigoOem: '81110-0K140',
    codigoFabrica: 'FRL-TOY-HLX-001',
    costo: 350,
    precio1: 480,
    precio2: 420,
    precioMayor: 400,
  },
  {
    producto: 'Farol',
    fabricante: 'Toyota',
    empresaFabricante: 'China',
    marca: 'Tyc',
    modelo: 'Corolla',
    anio: '2014-2019',
    detalle: 'Farol derecho. Lente de cristal, carcasa negra.',
    codigoOem: '81110-02T70',
    codigoFabrica: 'FRL-TOY-COR-002',
    costo: 280,
    precio1: 390,
    precio2: 340,
    precioMayor: 330,
  },
  {
    producto: 'Farol',
    fabricante: 'Mitsubishi',
    empresaFabricante: 'Tailandia',
    marca: 'Tyc',
    modelo: 'L200',
    anio: '2015-2021',
    detalle: 'Farol derecho. Lente de cristal, carcasa negra.',
    codigoOem: 'MR291030',
    codigoFabrica: 'FRL-MIT-L20-031',
    costo: 460,
    precio1: 650,
    precio2: 570,
    precioMayor: 550,
  },
  {
    producto: 'Guiñador',
    fabricante: 'Nissan',
    empresaFabricante: 'Tailandia',
    marca: 'Sankei',
    modelo: 'NP300',
    anio: '2016-2021',
    detalle: 'Guiñador lateral. Luz ámbar, lente transparente.',
    codigoOem: '26160-5XA0A',
    codigoFabrica: 'GÑD-NIS-NP3-003',
    costo: 120,
    precio1: 180,
    precio2: 155,
    precioMayor: 150,
  },
  {
    producto: 'Guiñador',
    fabricante: 'Jeep',
    empresaFabricante: 'China',
    marca: 'Depo',
    modelo: 'Cherokee',
    anio: '2014-2020',
    detalle: 'Guiñador delantero. Lente ámbar.',
    codigoOem: '68075034AA',
    codigoFabrica: 'GÑD-JEE-CHK-004',
    costo: 140,
    precio1: 210,
    precio2: 180,
    precioMayor: 175,
  },
  {
    producto: 'Stop',
    fabricante: 'Toyota',
    empresaFabricante: 'Taiwán',
    marca: 'Tyc',
    modelo: 'RAV4',
    anio: '2013-2018',
    detalle: 'Stop trasero. Lente cristal-rojo, con portalámpara.',
    codigoOem: '81560-0R010',
    codigoFabrica: 'STP-TOY-RAV-005',
    costo: 160,
    precio1: 240,
    precio2: 205,
    precioMayor: 200,
  },
  {
    producto: 'Stop',
    fabricante: 'Renault',
    empresaFabricante: 'Tailandia',
    marca: 'Valeo',
    modelo: 'Duster',
    anio: '2015-2021',
    detalle: 'Stop trasero derecho. Con portalámpara.',
    codigoOem: '26500-4BL0A',
    codigoFabrica: 'STP-REN-DUS-006',
    costo: 150,
    precio1: 225,
    precio2: 195,
    precioMayor: 190,
  },
  {
    producto: 'Stop',
    fabricante: 'Dodge',
    empresaFabricante: 'China',
    marca: 'Depo',
    modelo: 'Ram 1500',
    anio: '2013-2018',
    detalle: 'Stop trasero. Lente rojo-cristal.',
    codigoOem: '68221144AB',
    codigoFabrica: 'STP-DOD-RAM-032',
    costo: 380,
    precio1: 540,
    precio2: 470,
    precioMayor: 455,
  },
  {
    producto: 'Espejo',
    fabricante: 'Nissan',
    empresaFabricante: 'China',
    marca: 'Depo',
    modelo: 'Frontier',
    anio: '2017-2022',
    detalle: 'Espejo retrovisor derecho. Eléctrico, sin calefacción.',
    codigoOem: '96301-5LA1A',
    codigoFabrica: 'ESP-NIS-FRN-007',
    costo: 200,
    precio1: 300,
    precio2: 255,
    precioMayor: 250,
  },
  {
    producto: 'Espejo',
    fabricante: 'Mazda',
    empresaFabricante: 'Taiwán',
    marca: 'Kage',
    modelo: 'CX-5',
    anio: '2017-2023',
    detalle: 'Espejo retrovisor derecho. Eléctrico y rebatible.',
    codigoOem: 'KJY1-69-220',
    codigoFabrica: 'ESP-MAZ-CX5-008',
    costo: 260,
    precio1: 380,
    precio2: 330,
    precioMayor: 320,
  },
  {
    producto: 'Espejo',
    fabricante: 'Hyundai',
    empresaFabricante: 'China',
    marca: 'Kage',
    modelo: 'Tucson',
    anio: '2015-2020',
    detalle: 'Espejo retrovisor izquierdo. Eléctrico.',
    codigoOem: '87610-D3000',
    codigoFabrica: 'ESP-HYD-TUC-033',
    costo: 240,
    precio1: 360,
    precio2: 310,
    precioMayor: 300,
  },
  {
    producto: 'Capot',
    fabricante: 'Toyota',
    empresaFabricante: 'China',
    marca: 'Finar',
    modelo: 'Hilux',
    anio: '2012-2017',
    detalle: 'Capot de acero, sin imprimación.',
    codigoOem: '53101-0K070',
    codigoFabrica: 'CPT-TOY-HLX-009',
    costo: 900,
    precio1: 1250,
    precio2: 1100,
    precioMayor: 1050,
  },
  {
    producto: 'Capot',
    fabricante: 'Dodge',
    empresaFabricante: 'Taiwán',
    marca: 'Capris',
    modelo: 'Ram 1500',
    anio: '2013-2018',
    detalle: 'Capot de acero, con bisagras.',
    codigoOem: '53012070AD',
    codigoFabrica: 'CPT-DOD-RAM-010',
    costo: 1450,
    precio1: 1950,
    precio2: 1750,
    precioMayor: 1700,
  },
  {
    producto: 'Puerta',
    fabricante: 'Toyota',
    empresaFabricante: 'Tailandia',
    marca: 'Finar',
    modelo: 'Corolla',
    anio: '2013-2019',
    detalle: 'Puerta delantera derecha. Acero, con vidrio.',
    codigoOem: '67010-02T60',
    codigoFabrica: 'PRT-TOY-COR-011',
    costo: 950,
    precio1: 1300,
    precio2: 1150,
    precioMayor: 1100,
  },
  {
    producto: 'Puerta',
    fabricante: 'Hyundai',
    empresaFabricante: 'China',
    marca: 'Capris',
    modelo: 'Tucson',
    anio: '2015-2020',
    detalle: 'Puerta trasera izquierda. Acero.',
    codigoOem: '80210-D3000',
    codigoFabrica: 'PRT-HYD-TUC-012',
    costo: 880,
    precio1: 1200,
    precio2: 1050,
    precioMayor: 1000,
  },
  {
    producto: 'Parachoques',
    fabricante: 'Nissan',
    empresaFabricante: 'Taiwán',
    marca: 'Tyc',
    modelo: 'Frontier',
    anio: '2016-2021',
    detalle: 'Parachoques delantero. ABS, sin pintar.',
    codigoOem: '62010-5LA2A',
    codigoFabrica: 'PRC-NIS-FRN-013',
    costo: 700,
    precio1: 980,
    precio2: 860,
    precioMayor: 830,
  },
  {
    producto: 'Parachoques',
    fabricante: 'Toyota',
    empresaFabricante: 'Tailandia',
    marca: 'Tyc',
    modelo: 'Hilux',
    anio: '2015-2020',
    detalle: 'Parachoques delantero. ABS, con rejillas.',
    codigoOem: '52010-0K420',
    codigoFabrica: 'PRC-TOY-HLX-014',
    costo: 720,
    precio1: 1000,
    precio2: 880,
    precioMayor: 850,
  },
  {
    producto: 'Parachoques',
    fabricante: 'Jeep',
    empresaFabricante: 'China',
    marca: 'Depo',
    modelo: 'Cherokee',
    anio: '2014-2020',
    detalle: 'Parachoques delantero. ABS.',
    codigoOem: '68252401AA',
    codigoFabrica: 'PRC-JEE-CHK-015',
    costo: 800,
    precio1: 1120,
    precio2: 980,
    precioMayor: 950,
  },
  {
    producto: 'Parachoques',
    fabricante: 'Toyota',
    empresaFabricante: 'Taiwán',
    marca: 'Capris',
    modelo: 'RAV4',
    anio: '2013-2018',
    detalle: 'Parachoques trasero. ABS, sin pintar.',
    codigoOem: '52510-0R160',
    codigoFabrica: 'PRC-TOY-RAV-034',
    costo: 780,
    precio1: 1080,
    precio2: 950,
    precioMayor: 920,
  },
  {
    producto: 'Máscara',
    fabricante: 'Renault',
    empresaFabricante: 'China',
    marca: 'Sankei',
    modelo: 'Duster',
    anio: '2015-2021',
    detalle: 'Máscara frontal con rejilla, negra.',
    codigoOem: '62310-4BA0A',
    codigoFabrica: 'MSC-REN-DUS-016',
    costo: 450,
    precio1: 640,
    precio2: 560,
    precioMayor: 540,
  },
  {
    producto: 'Máscara',
    fabricante: 'Mitsubishi',
    empresaFabricante: 'Tailandia',
    marca: 'Sankei',
    modelo: 'L200',
    anio: '2015-2021',
    detalle: 'Máscara frontal con rejilla, negra.',
    codigoOem: 'MR151871',
    codigoFabrica: 'MSC-MIT-L20-017',
    costo: 480,
    precio1: 680,
    precio2: 590,
    precioMayor: 570,
  },
  {
    producto: 'Radiador',
    fabricante: 'Toyota',
    empresaFabricante: 'China',
    marca: 'Denso',
    modelo: 'Yaris',
    anio: '2012-2020',
    detalle: 'Radiador aluminio-plástico, con tapa.',
    codigoOem: '16400-0Y010',
    codigoFabrica: 'RAD-TOY-YAR-018',
    costo: 480,
    precio1: 680,
    precio2: 590,
    precioMayor: 570,
  },
  {
    producto: 'Radiador',
    fabricante: 'Nissan',
    empresaFabricante: 'Tailandia',
    marca: 'Koyo',
    modelo: 'Tiida',
    anio: '2011-2018',
    detalle: 'Radiador aluminio-plástico, con tapa.',
    codigoOem: '21410-1JN0A',
    codigoFabrica: 'RAD-NIS-TID-019',
    costo: 520,
    precio1: 730,
    precio2: 640,
    precioMayor: 620,
  },
  {
    producto: 'Radiador',
    fabricante: 'Dodge',
    empresaFabricante: 'Taiwán',
    marca: 'Denso',
    modelo: 'Durango',
    anio: '2014-2020',
    detalle: 'Radiador de alta capacidad V6.',
    codigoOem: '68176319AA',
    codigoFabrica: 'RAD-DOD-DUR-020',
    costo: 1500,
    precio1: 2050,
    precio2: 1800,
    precioMayor: 1750,
  },
  {
    producto: 'Radiador',
    fabricante: 'Jeep',
    empresaFabricante: 'Taiwán',
    marca: 'Denso',
    modelo: 'Grand Cherokee',
    anio: '2011-2017',
    detalle: 'Radiador de alta capacidad V6.',
    codigoOem: '68180914AA',
    codigoFabrica: 'RAD-JEE-GCH-036',
    costo: 1650,
    precio1: 2200,
    precio2: 1950,
    precioMayor: 1880,
  },
  {
    producto: 'Condensador',
    fabricante: 'Toyota',
    empresaFabricante: 'Tailandia',
    marca: 'Koyo',
    modelo: 'Hilux',
    anio: '2015-2020',
    detalle: 'Condensador aire acondicionado.',
    codigoOem: '88460-0K280',
    codigoFabrica: 'CND-TOY-HLX-021',
    costo: 850,
    precio1: 1180,
    precio2: 1040,
    precioMayor: 1000,
  },
  {
    producto: 'Condensador',
    fabricante: 'Renault',
    empresaFabricante: 'China',
    marca: 'Valeo',
    modelo: 'Logan',
    anio: '2013-2021',
    detalle: 'Condensador aire acondicionado.',
    codigoOem: '921103087R',
    codigoFabrica: 'CND-REN-LOG-022',
    costo: 620,
    precio1: 880,
    precio2: 770,
    precioMayor: 750,
  },
  {
    producto: 'Condensador',
    fabricante: 'Nissan',
    empresaFabricante: 'Tailandia',
    marca: 'Valeo',
    modelo: 'Sentra',
    anio: '2013-2019',
    detalle: 'Condensador aire acondicionado.',
    codigoOem: '92110-4BA0A',
    codigoFabrica: 'CND-NIS-SNT-035',
    costo: 700,
    precio1: 980,
    precio2: 860,
    precioMayor: 830,
  },
  {
    producto: 'Tanque de agua',
    fabricante: 'Hyundai',
    empresaFabricante: 'China',
    marca: 'Koyo',
    modelo: 'Accent',
    anio: '2012-2018',
    detalle: 'Tanque de agua (depósito de refrigerante).',
    codigoOem: '25620-2B000',
    codigoFabrica: 'TDA-HYD-ACC-023',
    costo: 280,
    precio1: 400,
    precio2: 350,
    precioMayor: 340,
  },
  {
    producto: 'Tanque de agua',
    fabricante: 'Mazda',
    empresaFabricante: 'Taiwán',
    marca: 'Denso',
    modelo: 'Mazda3',
    anio: '2014-2019',
    detalle: 'Tanque de agua (depósito de refrigerante).',
    codigoOem: 'BBR2-15-350',
    codigoFabrica: 'TDA-MAZ-MZ3-024',
    costo: 310,
    precio1: 440,
    precio2: 385,
    precioMayor: 370,
  },
  {
    producto: 'Tanque de agua',
    fabricante: 'Toyota',
    empresaFabricante: 'Tailandia',
    marca: 'Koyo',
    modelo: 'Corolla',
    anio: '2014-2019',
    detalle: 'Tanque de agua (depósito de refrigerante).',
    codigoOem: '16400-0P140',
    codigoFabrica: 'TDA-TOY-COR-037',
    costo: 300,
    precio1: 430,
    precio2: 375,
    precioMayor: 360,
  },
  {
    producto: 'Manivela',
    fabricante: 'Toyota',
    empresaFabricante: 'Taiwán',
    marca: 'Protzalee',
    modelo: 'Hilux',
    anio: '2005-2011',
    detalle: 'Manivela de ventana. Interior.',
    codigoOem: '83970-0K030',
    codigoFabrica: 'MNV-TOY-HLX-025',
    costo: 90,
    precio1: 140,
    precio2: 120,
    precioMayor: 115,
  },
  {
    producto: 'Manivela',
    fabricante: 'Nissan',
    empresaFabricante: 'China',
    marca: 'Protzalee',
    modelo: 'Frontier',
    anio: '2008-2014',
    detalle: 'Manivela de ventana. Interior.',
    codigoOem: '80735-ZD00A',
    codigoFabrica: 'MNV-NIS-FRN-026',
    costo: 95,
    precio1: 145,
    precio2: 125,
    precioMayor: 120,
  },
  {
    producto: 'Jalador',
    fabricante: 'Mitsubishi',
    empresaFabricante: 'Taiwán',
    marca: 'Kage',
    modelo: 'Montero',
    anio: '2006-2012',
    detalle: 'Jalador de puerta. Cromado.',
    codigoOem: 'MR374850',
    codigoFabrica: 'JLD-MIT-MON-027',
    costo: 130,
    precio1: 195,
    precio2: 170,
    precioMayor: 165,
  },
  {
    producto: 'Jalador',
    fabricante: 'Toyota',
    empresaFabricante: 'China',
    marca: 'Kage',
    modelo: 'Prado',
    anio: '2010-2017',
    detalle: 'Jalador de puerta. Cromado.',
    codigoOem: '69010-60040',
    codigoFabrica: 'JLD-TOY-PRD-028',
    costo: 150,
    precio1: 225,
    precio2: 195,
    precioMayor: 190,
  },
  {
    producto: 'Rejilla',
    fabricante: 'Jeep',
    empresaFabricante: 'Tailandia',
    marca: 'Depo',
    modelo: 'Wrangler',
    anio: '2012-2018',
    detalle: 'Rejilla frontal clásica 7 ranuras.',
    codigoOem: '55112787AB',
    codigoFabrica: 'RJL-JEE-WRN-029',
    costo: 340,
    precio1: 490,
    precio2: 430,
    precioMayor: 415,
  },
  {
    producto: 'Rejilla',
    fabricante: 'Renault',
    empresaFabricante: 'China',
    marca: 'Sankei',
    modelo: 'Sandero',
    anio: '2014-2020',
    detalle: 'Rejilla frontal negra.',
    codigoOem: '62310-4387R',
    codigoFabrica: 'RJL-REN-SAN-030',
    costo: 220,
    precio1: 320,
    precio2: 280,
    precioMayor: 270,
  },
];

async function seedLocations(): Promise<Location[]> {
  const repo = dataSource.getRepository(Location);
  const saved: Location[] = [];
  for (const def of LOCATIONS) {
    let loc = await repo.findOne({ where: { codigo: def.codigo } });
    if (!loc) {
      loc = repo.create(def);
    } else {
      Object.assign(loc, def);
    }
    saved.push(await repo.save(loc));
  }
  return saved;
}

async function seedUsers(locations: Location[]): Promise<void> {
  const repo = dataSource.getRepository(User);
  const tiendaByCodigo = new Map(
    locations.filter((l) => l.tipo === 'tienda').map((l) => [l.codigo, l]),
  );
  for (const def of USERS) {
    const tienda = def.tiendaCodigo
      ? tiendaByCodigo.get(def.tiendaCodigo)
      : null;
    let user = await repo.findOne({ where: { email: def.email } });
    if (!user) {
      user = repo.create({
        nombre: def.nombre,
        email: def.email,
        password: await bcrypt.hash(def.password, 10),
        rol: def.rol,
        tiendaId: tienda ? tienda.id : null,
      });
    } else {
      user.nombre = def.nombre;
      user.rol = def.rol;
      user.tiendaId = tienda ? tienda.id : null;
      if (user.password !== `seed:${def.password}`) {
        user.password = await bcrypt.hash(def.password, 10);
      }
    }
    await repo.save(user);
  }
}

async function seedProveedores(): Promise<void> {
  const repo = dataSource.getRepository(Proveedor);
  for (const def of PROVEEDORES) {
    let prov = await repo.findOne({ where: { nombre: def.nombre } });
    if (!prov) {
      prov = repo.create(def);
    } else {
      Object.assign(prov, def);
    }
    await repo.save(prov);
  }
}

async function seedProducts(): Promise<Product[]> {
  const repo = dataSource.getRepository(Product);
  if (!fs.existsSync(UPLOADS_DIR))
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const saved: Product[] = [];
  for (const def of PRODUCTS) {
    let prod = await repo.findOne({
      where: { codigoFabrica: def.codigoFabrica },
    });
    if (!prod) {
      prod = repo.create({ ...def, activo: true, stockMinimo: 1 });
    } else {
      Object.assign(prod, def);
    }

    if (!prod.imagenHash) {
      const buffer = await generatePlaceholderImage(prod.id || PRODUCTS.indexOf(def) + 1);
      const filename = `seed-${prod.codigoFabrica}-${Date.now()}.png`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      prod.imagen = `/uploads/${filename}`;
      prod.imagenHash = await computeHash(buffer);
    }

    saved.push(await repo.save(prod));
  }
  return saved;
}

async function seedInventory(
  products: Product[],
  locations: Location[],
): Promise<void> {
  const repo = dataSource.getRepository(Inventory);
  const almacenes = locations
    .filter((l) => l.tipo === 'almacen')
    .map((l) => l.id);
  const tiendas = locations.filter((l) => l.tipo === 'tienda').map((l) => l.id);

  let count = 0;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const stockMap = new Map<number, number>();

    stockMap.set(almacenes[i % almacenes.length], 15 + ((i * 5) % 60));
    stockMap.set(almacenes[(i + 2) % almacenes.length], (i * 3) % 25);

    if (i % 3 === 0) stockMap.set(tiendas[0], 6 + (i % 5));
    if (i % 2 === 0) stockMap.set(tiendas[1], 4 + (i % 7));
    if (i % 4 === 2) stockMap.set(tiendas[2], 3 + (i % 6));

    for (const [locationId, cantidad] of stockMap) {
      let inv = await repo.findOne({
        where: { productId: product.id, locationId },
      });
      if (!inv) {
        inv = repo.create({ productId: product.id, locationId, cantidad });
      } else {
        inv.cantidad = cantidad;
      }
      await repo.save(inv);
      count++;
    }
  }
  console.log(`   [seed] inventario: ${count} registros en ubicaciones`);
}

async function clearAll(): Promise<void> {
  await dataSource.query(
    'TRUNCATE TABLE devoluciones, solicitudes, movimientos, payments, sale_items, sales, facturas, inventory, products, users, locations, proveedores, clientes RESTART IDENTITY CASCADE',
  );
}

async function seed(): Promise<void> {
  const reset = process.argv.includes('--reset');
  await dataSource.initialize();

  try {
    if (reset) {
      await clearAll();
      console.log('[seed] base de datos limpiada (--reset)');
    }

    const locations = await seedLocations();
    console.log(
      `[seed] ubicaciones: ${locations.length} (4 almacenes + 3 tiendas)`,
    );

    await seedUsers(locations);
    console.log(`[seed] usuarios: ${USERS.length}`);

    await seedProveedores();
    console.log(`[seed] proveedores: ${PROVEEDORES.length}`);

    const products = await seedProducts();
    console.log(`[seed] productos: ${products.length}`);

    await seedInventory(products, locations);

    console.log('[seed] SEED COMPLETADO');
    console.log('       admin: admin@autorepuestos.com / Admin1234!');
    console.log('       inventario: almacen@autorepuestos.com / Almacen1234!');
    console.log('       tienda: tienda1@autorepuestos.com / Tienda1234!');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('[seed] error:', err);
  process.exit(1);
});
