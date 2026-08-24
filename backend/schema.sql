-- ============================================================
-- Schema para autopartesdb (PostgreSQL) - generado desde las
-- entidades de backend/src/entities (NestJS + TypeORM)
--
-- IMPORTANTE: TypeORM usa nombres de columna camelCase por defecto,
-- por eso van entre comillas dobles.
--
-- Ejecutar con:
--   psql -U postgres -d autopartesdb -f schema.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- locations (ubicaciones: almacenes y tiendas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "locations" (
    "id"        serial PRIMARY KEY,
    "nombre"    varchar NOT NULL,
    "tipo"      varchar NOT NULL,          -- 'almacen' | 'tienda'
    "numero"    integer NOT NULL,
    "codigo"    varchar NOT NULL UNIQUE,
    "ubicacion" varchar,
    "horarios"  varchar,
    "contacto"  varchar
);

-- ------------------------------------------------------------
-- users (usuarios del sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id"         serial PRIMARY KEY,
    "nombre"     varchar NOT NULL,
    "email"      varchar NOT NULL UNIQUE,
    "password"   varchar NOT NULL,
    "rol"        varchar NOT NULL,         -- 'admin' | 'tienda' | 'inventario'
    "tiendaId"   integer REFERENCES "locations" ("id") ON DELETE SET NULL,
    "createdAt"  timestamp NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- products (catálogo de autopartes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
    "id"               serial PRIMARY KEY,
    "producto"         varchar NOT NULL,
    "fabricante"       varchar NOT NULL,
    "empresaFabricante" varchar,
    "marca"            varchar NOT NULL,
    "modelo"           varchar NOT NULL,
    "anio"             varchar,
    "detalle"          varchar,
    "codigoOem"        varchar,
    "codigoFabrica"    varchar NOT NULL,
    "imagen"           text,
    "imagenHash"       varchar,
    "costo"            double precision NOT NULL DEFAULT 0,
    "precio1"          double precision,
    "precio2"          double precision,
    "precioMayor"      double precision,
    "stockMinimo"      integer NOT NULL DEFAULT 1,
    "activo"           boolean NOT NULL DEFAULT true,
    "createdAt"        timestamp NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "clientes" (
    "id"         serial PRIMARY KEY,
    "nombre"     varchar NOT NULL,
    "ciNit"      varchar,
    "celular"    varchar,
    "createdAt"  timestamp NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- proveedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "proveedores" (
    "id"        serial PRIMARY KEY,
    "nombre"    varchar NOT NULL,
    "pais"      varchar NOT NULL DEFAULT 'Bolivia',
    "contacto"  varchar,
    "createdAt" timestamp NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- inventory (stock por producto y ubicación)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "inventory" (
    "id"         serial PRIMARY KEY,
    "productId"  integer NOT NULL REFERENCES "products" ("id") ON DELETE CASCADE,
    "locationId" integer NOT NULL REFERENCES "locations" ("id"),
    "cantidad"   integer NOT NULL DEFAULT 0,
    CONSTRAINT "UQ_inventory_product_location" UNIQUE ("productId", "locationId")
);

-- ------------------------------------------------------------
-- sales (ventas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sales" (
    "id"             serial PRIMARY KEY,
    "codigo"         varchar NOT NULL UNIQUE,
    "fecha"          timestamp NOT NULL DEFAULT now(),
    "tipo"           varchar NOT NULL DEFAULT 'menor',   -- 'menor' | 'mayor'
    "total"          double precision NOT NULL,
    "requiereFactura" boolean NOT NULL DEFAULT false,
    "lugarEntrega"   varchar,
    "paraQuien"      varchar,
    "locationId"     integer NOT NULL REFERENCES "locations" ("id"),
    "usuarioId"      integer NOT NULL REFERENCES "users" ("id"),
    "clienteId"      integer REFERENCES "clientes" ("id")
);

-- ------------------------------------------------------------
-- sale_items (detalle de venta)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "sale_items" (
    "id"        serial PRIMARY KEY,
    "saleId"    integer NOT NULL REFERENCES "sales" ("id") ON DELETE CASCADE,
    "productId" integer NOT NULL REFERENCES "products" ("id"),
    "cantidad"  integer NOT NULL,
    "precio"    double precision NOT NULL,
    "subtotal"  double precision NOT NULL
);

-- ------------------------------------------------------------
-- payments (pagos de una venta)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "payments" (
    "id"     serial PRIMARY KEY,
    "saleId" integer NOT NULL REFERENCES "sales" ("id") ON DELETE CASCADE,
    "metodo" varchar NOT NULL,            -- 'efectivo'|'transferencia'|'qr'|'credito'
    "monto"  double precision NOT NULL
);

-- ------------------------------------------------------------
-- movimientos (traslados de stock entre ubicaciones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "movimientos" (
    "id"          serial PRIMARY KEY,
    "productId"   integer NOT NULL REFERENCES "products" ("id"),
    "cantidad"    integer NOT NULL,
    "origenId"    integer NOT NULL REFERENCES "locations" ("id"),
    "destinoId"   integer NOT NULL REFERENCES "locations" ("id"),
    "usuarioId"   integer NOT NULL REFERENCES "users" ("id"),
    "fecha"       timestamp NOT NULL DEFAULT now(),
    "observacion" varchar
);

-- ------------------------------------------------------------
-- solicitudes (pedidos de tiendas hacia almacenes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "solicitudes" (
    "id"        serial PRIMARY KEY,
    "productId" integer NOT NULL REFERENCES "products" ("id"),
    "cantidad"  integer NOT NULL,
    "tiendaId"  integer NOT NULL REFERENCES "locations" ("id"),
    "origenId"  integer REFERENCES "locations" ("id"),
    "usuarioId" integer NOT NULL REFERENCES "users" ("id"),
    "fecha"     timestamp NOT NULL DEFAULT now(),
    "estado"    varchar NOT NULL DEFAULT 'Pendiente', -- Pendiente|En preparación|Enviado|Recibido|Cancelado
    "auto"      boolean NOT NULL DEFAULT false
);

-- ------------------------------------------------------------
-- facturas (compras a proveedores / costos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "facturas" (
    "id"          serial PRIMARY KEY,
    "proveedorId" integer NOT NULL REFERENCES "proveedores" ("id"),
    "numero"      varchar NOT NULL,
    "tipoCambio"  double precision NOT NULL DEFAULT 1,
    "porcentaje"  double precision NOT NULL DEFAULT 0,
    "monto"       double precision NOT NULL DEFAULT 0,
    "archivo"     text,
    "fecha"       timestamp NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- devoluciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "devoluciones" (
    "id"         serial PRIMARY KEY,
    "fecha"      timestamp NOT NULL DEFAULT now(),
    "productId"  integer NOT NULL REFERENCES "products" ("id"),
    "motivo"     varchar NOT NULL,
    "cantidad"   integer NOT NULL,
    "monto"      double precision NOT NULL,
    "metodo"     varchar NOT NULL,
    "locationId" integer NOT NULL REFERENCES "locations" ("id"),
    "usuarioId"  integer NOT NULL REFERENCES "users" ("id")
);

COMMIT;
