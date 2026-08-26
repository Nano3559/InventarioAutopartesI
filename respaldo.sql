--
-- PostgreSQL database dump
--

\restrict iSB3RrTdEekq6NElpeY3Hj4adSiFgFUgCK4FnfxXvJG2ICm6P1bdZiaAKy0Xujg

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS "FK_eb1a6c945c423b776588e3c3e9c";
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS "FK_ea1b72fda0983b193e779a1aac5";
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS "FK_e15427928c7a02bd304d628c41e";
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS "FK_d6e15989401f3857141a2cb62d4";
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS "FK_d675aea38a16313e844662c48f8";
ALTER TABLE IF EXISTS ONLY public.movimientos DROP CONSTRAINT IF EXISTS "FK_d2855b22f4b5120ae70052e5af0";
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS "FK_ce042019578fafce54f26b6c526";
ALTER TABLE IF EXISTS ONLY public.inventory DROP CONSTRAINT IF EXISTS "FK_c8622e1e24c6d054d36e8824490";
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS "FK_c642be08de5235317d4cf3deb40";
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS "FK_bd2a1993dc609ccfe439a03c976";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS "FK_86557b981d677a13035d2a12208";
ALTER TABLE IF EXISTS ONLY public.movimientos DROP CONSTRAINT IF EXISTS "FK_82b5cb68093077742683848ee82";
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS "FK_6dd7d7f9856a42a3b662ccb77d5";
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS "FK_6d7f59f686e034042da017d7af2";
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS "FK_3cb0abfd86da005d29337b4793d";
ALTER TABLE IF EXISTS ONLY public.movimientos DROP CONSTRAINT IF EXISTS "FK_3a5880f3fae856b074862c1c677";
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS "FK_33274f68fbc5c94cb03e6df63a8";
ALTER TABLE IF EXISTS ONLY public.movimientos DROP CONSTRAINT IF EXISTS "FK_2d52ccab7c9bd48c3eabab812a2";
ALTER TABLE IF EXISTS ONLY public.inventory DROP CONSTRAINT IF EXISTS "FK_178e44a002ef47ff6a0c5d196ef";
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS "FK_14e7497249c1cbff307fc8a1634";
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS "FK_0ffb497c8b449c9d6e2959dcc83";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.solicitudes DROP CONSTRAINT IF EXISTS solicitudes_pkey;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_pkey;
ALTER TABLE IF EXISTS ONLY public.sales DROP CONSTRAINT IF EXISTS sales_codigo_key;
ALTER TABLE IF EXISTS ONLY public.sale_items DROP CONSTRAINT IF EXISTS sale_items_pkey;
ALTER TABLE IF EXISTS ONLY public.proveedores DROP CONSTRAINT IF EXISTS proveedores_pkey;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.movimientos DROP CONSTRAINT IF EXISTS movimientos_pkey;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_pkey;
ALTER TABLE IF EXISTS ONLY public.locations DROP CONSTRAINT IF EXISTS locations_codigo_key;
ALTER TABLE IF EXISTS ONLY public.inventory DROP CONSTRAINT IF EXISTS inventory_pkey;
ALTER TABLE IF EXISTS ONLY public.facturas DROP CONSTRAINT IF EXISTS facturas_pkey;
ALTER TABLE IF EXISTS ONLY public.devoluciones DROP CONSTRAINT IF EXISTS devoluciones_pkey;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.inventory DROP CONSTRAINT IF EXISTS "UQ_f80bd37d149606ab891c9550158";
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.solicitudes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sales ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sale_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.proveedores ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.movimientos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.locations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventory ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.facturas ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.devoluciones ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.solicitudes_id_seq;
DROP TABLE IF EXISTS public.solicitudes;
DROP SEQUENCE IF EXISTS public.sales_id_seq;
DROP TABLE IF EXISTS public.sales;
DROP SEQUENCE IF EXISTS public.sale_items_id_seq;
DROP TABLE IF EXISTS public.sale_items;
DROP SEQUENCE IF EXISTS public.proveedores_id_seq;
DROP TABLE IF EXISTS public.proveedores;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.movimientos_id_seq;
DROP TABLE IF EXISTS public.movimientos;
DROP SEQUENCE IF EXISTS public.locations_id_seq;
DROP TABLE IF EXISTS public.locations;
DROP SEQUENCE IF EXISTS public.inventory_id_seq;
DROP TABLE IF EXISTS public.inventory;
DROP SEQUENCE IF EXISTS public.facturas_id_seq;
DROP TABLE IF EXISTS public.facturas;
DROP SEQUENCE IF EXISTS public.devoluciones_id_seq;
DROP TABLE IF EXISTS public.devoluciones;
DROP SEQUENCE IF EXISTS public.clientes_id_seq;
DROP TABLE IF EXISTS public.clientes;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    "ciNit" character varying,
    celular character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: devoluciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devoluciones (
    id integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    "productId" integer NOT NULL,
    motivo character varying NOT NULL,
    cantidad integer NOT NULL,
    monto double precision NOT NULL,
    metodo character varying NOT NULL,
    "locationId" integer NOT NULL,
    "usuarioId" integer NOT NULL
);


ALTER TABLE public.devoluciones OWNER TO postgres;

--
-- Name: devoluciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devoluciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devoluciones_id_seq OWNER TO postgres;

--
-- Name: devoluciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devoluciones_id_seq OWNED BY public.devoluciones.id;


--
-- Name: facturas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facturas (
    id integer NOT NULL,
    "proveedorId" integer NOT NULL,
    numero character varying NOT NULL,
    "tipoCambio" double precision DEFAULT 1 NOT NULL,
    porcentaje double precision DEFAULT 0 NOT NULL,
    monto double precision DEFAULT 0 NOT NULL,
    archivo text,
    fecha timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.facturas OWNER TO postgres;

--
-- Name: facturas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facturas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.facturas_id_seq OWNER TO postgres;

--
-- Name: facturas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facturas_id_seq OWNED BY public.facturas.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    "locationId" integer NOT NULL,
    cantidad integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO postgres;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    tipo character varying NOT NULL,
    numero integer NOT NULL,
    codigo character varying NOT NULL,
    ubicacion character varying,
    horarios character varying,
    contacto character varying
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: movimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.movimientos (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    cantidad integer NOT NULL,
    "origenId" integer NOT NULL,
    "destinoId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    observacion character varying
);


ALTER TABLE public.movimientos OWNER TO postgres;

--
-- Name: movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.movimientos_id_seq OWNER TO postgres;

--
-- Name: movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.movimientos_id_seq OWNED BY public.movimientos.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    metodo character varying NOT NULL,
    monto double precision NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    producto character varying NOT NULL,
    fabricante character varying NOT NULL,
    "empresaFabricante" character varying,
    marca character varying NOT NULL,
    modelo character varying NOT NULL,
    anio character varying,
    detalle character varying,
    "codigoOem" character varying,
    "codigoFabrica" character varying NOT NULL,
    imagen text,
    "imagenHash" character varying,
    costo double precision DEFAULT 0 NOT NULL,
    precio1 double precision,
    precio2 double precision,
    "precioMayor" double precision,
    "stockMinimo" integer DEFAULT 1 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    pais character varying DEFAULT 'Bolivia'::character varying NOT NULL,
    contacto character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.proveedores OWNER TO postgres;

--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.proveedores_id_seq OWNER TO postgres;

--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sale_items (
    id integer NOT NULL,
    "saleId" integer NOT NULL,
    "productId" integer NOT NULL,
    cantidad integer NOT NULL,
    precio double precision NOT NULL,
    subtotal double precision NOT NULL
);


ALTER TABLE public.sale_items OWNER TO postgres;

--
-- Name: sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sale_items_id_seq OWNER TO postgres;

--
-- Name: sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sale_items_id_seq OWNED BY public.sale_items.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    codigo character varying NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    tipo character varying DEFAULT 'menor'::character varying NOT NULL,
    total double precision NOT NULL,
    "requiereFactura" boolean DEFAULT false NOT NULL,
    "lugarEntrega" character varying,
    "paraQuien" character varying,
    "locationId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    "clienteId" integer
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_seq OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: solicitudes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.solicitudes (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    cantidad integer NOT NULL,
    "tiendaId" integer NOT NULL,
    "origenId" integer,
    "usuarioId" integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    estado character varying DEFAULT 'Pendiente'::character varying NOT NULL,
    auto boolean DEFAULT false NOT NULL
);


ALTER TABLE public.solicitudes OWNER TO postgres;

--
-- Name: solicitudes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.solicitudes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.solicitudes_id_seq OWNER TO postgres;

--
-- Name: solicitudes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.solicitudes_id_seq OWNED BY public.solicitudes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    email character varying NOT NULL,
    password character varying NOT NULL,
    rol character varying NOT NULL,
    "tiendaId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: devoluciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones ALTER COLUMN id SET DEFAULT nextval('public.devoluciones_id_seq'::regclass);


--
-- Name: facturas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas ALTER COLUMN id SET DEFAULT nextval('public.facturas_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: movimientos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos ALTER COLUMN id SET DEFAULT nextval('public.movimientos_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: solicitudes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: devoluciones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: facturas; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (1, 1, 1, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (2, 1, 3, 0);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (3, 1, 5, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (4, 1, 6, 4);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (5, 2, 2, 20);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (6, 2, 4, 3);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (7, 3, 3, 25);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (8, 3, 1, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (9, 3, 6, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (10, 3, 7, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (11, 4, 4, 30);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (12, 4, 2, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (13, 4, 5, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (14, 5, 1, 35);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (15, 5, 3, 12);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (16, 5, 6, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (17, 6, 2, 40);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (18, 6, 4, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (19, 7, 3, 45);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (20, 7, 1, 18);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (21, 7, 5, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (22, 7, 6, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (23, 7, 7, 3);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (24, 8, 4, 50);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (25, 8, 2, 21);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (26, 9, 1, 55);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (27, 9, 3, 24);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (28, 9, 6, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (29, 10, 2, 60);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (30, 10, 4, 2);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (31, 10, 5, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (32, 11, 3, 65);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (33, 11, 1, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (34, 11, 6, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (35, 11, 7, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (36, 12, 4, 70);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (37, 12, 2, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (38, 13, 1, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (39, 13, 3, 11);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (40, 13, 5, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (41, 13, 6, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (42, 14, 2, 20);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (43, 14, 4, 14);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (44, 15, 3, 25);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (45, 15, 1, 17);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (46, 15, 6, 4);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (47, 15, 7, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (48, 16, 4, 30);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (49, 16, 2, 20);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (50, 16, 5, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (51, 17, 1, 35);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (52, 17, 3, 23);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (53, 17, 6, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (54, 18, 2, 40);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (55, 18, 4, 1);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (56, 19, 3, 45);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (57, 19, 1, 4);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (58, 19, 5, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (59, 19, 6, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (60, 19, 7, 3);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (61, 20, 4, 50);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (62, 20, 2, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (63, 21, 1, 55);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (64, 21, 3, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (65, 21, 6, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (66, 22, 2, 60);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (67, 22, 4, 13);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (68, 22, 5, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (69, 23, 3, 65);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (70, 23, 1, 16);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (71, 23, 6, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (72, 23, 7, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (73, 24, 4, 70);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (74, 24, 2, 19);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (75, 25, 1, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (76, 25, 3, 22);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (77, 25, 5, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (78, 25, 6, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (79, 26, 2, 20);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (80, 26, 4, 0);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (81, 27, 3, 25);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (82, 27, 1, 3);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (83, 27, 6, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (84, 27, 7, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (85, 28, 4, 30);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (86, 28, 2, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (87, 28, 5, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (88, 29, 1, 35);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (89, 29, 3, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (90, 29, 6, 4);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (91, 30, 2, 40);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (92, 30, 4, 12);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (93, 31, 3, 45);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (94, 31, 1, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (95, 31, 5, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (96, 31, 6, 6);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (97, 31, 7, 3);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (98, 32, 4, 50);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (99, 32, 2, 18);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (100, 33, 1, 55);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (101, 33, 3, 21);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (102, 33, 6, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (103, 34, 2, 60);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (104, 34, 4, 24);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (105, 34, 5, 9);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (106, 35, 3, 65);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (107, 35, 1, 2);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (108, 35, 6, 10);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (109, 35, 7, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (110, 36, 4, 70);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (111, 36, 2, 5);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (112, 37, 1, 15);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (113, 37, 3, 8);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (114, 37, 5, 7);
INSERT INTO public.inventory (id, "productId", "locationId", cantidad) VALUES (115, 37, 6, 5);


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (1, 'Almacén 1', 'almacen', 1, 'ALM-1', 'Av. Blanco Galindo Km 7, Zona Quintanilla, Cochabamba', 'Lun-Sáb 08:30-18:30', 'importadora1@autopartes.bo / 4451-1001');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (2, 'Almacén 2', 'almacen', 2, 'ALM-2', 'Av. Petrolera Nro. 1500, Zona Sud, Cochabamba', 'Lun-Vie 08:00-18:00 / Sáb 08:00-13:00', 'importadora2@autopartes.bo / 4452-2002');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (3, 'Almacén 3', 'almacen', 3, 'ALM-3', 'Av. Beijing Nro. 300, Zona Norte, Cochabamba', 'Lun-Vie 08:00-18:00 / Sáb 08:00-13:00', 'importadora3@autopartes.bo / 4453-3003');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (4, 'Almacén 4', 'almacen', 4, 'ALM-4', 'Av. América Nro. 800, Zona Cala Cala, Cochabamba', 'Lun-Sáb 08:30-18:30', 'importadora4@autopartes.bo / 4454-4004');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (5, 'Tienda 1', 'tienda', 1, 'TDA-1', 'Av. Heroínas entre Ayacucho y Colombia, Centro, Cochabamba', 'Lun-Sáb 09:00-20:00', 'tienda1@autopartes.bo / 4411-1101');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (6, 'Tienda 2', 'tienda', 2, 'TDA-2', 'Av. Melchor Pérez de Olguín Nro. 1200, Zona Sur, Cochabamba', 'Lun-Sáb 09:00-20:00', 'tienda2@autopartes.bo / 4412-2202');
INSERT INTO public.locations (id, nombre, tipo, numero, codigo, ubicacion, horarios, contacto) VALUES (7, 'Tienda 3', 'tienda', 3, 'TDA-3', 'Av. Barrientos Nro. 550, Zona Aeropuerto, Cochabamba', 'Lun-Sáb 09:00-19:30', 'tienda3@autopartes.bo / 4413-3303');


--
-- Data for Name: movimientos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (1, 'Farol', 'Toyota', 'Taiwán', 'Tyc', 'Hilux', '2015-2020', 'Farol derecho. Lente de cristal, carcasa negra.', '81110-0K140', 'FRL-TOY-HLX-001', NULL, NULL, 350, 480, 420, 400, 1, true, '2026-08-25 04:29:06.640531');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (2, 'Farol', 'Toyota', 'China', 'Tyc', 'Corolla', '2014-2019', 'Farol derecho. Lente de cristal, carcasa negra.', '81110-02T70', 'FRL-TOY-COR-002', NULL, NULL, 280, 390, 340, 330, 1, true, '2026-08-25 04:29:06.643081');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (3, 'Farol', 'Mitsubishi', 'Tailandia', 'Tyc', 'L200', '2015-2021', 'Farol derecho. Lente de cristal, carcasa negra.', 'MR291030', 'FRL-MIT-L20-031', NULL, NULL, 460, 650, 570, 550, 1, true, '2026-08-25 04:29:06.644289');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (4, 'Guiñador', 'Nissan', 'Tailandia', 'Sankei', 'NP300', '2016-2021', 'Guiñador lateral. Luz ámbar, lente transparente.', '26160-5XA0A', 'GÑD-NIS-NP3-003', NULL, NULL, 120, 180, 155, 150, 1, true, '2026-08-25 04:29:06.645929');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (5, 'Guiñador', 'Jeep', 'China', 'Depo', 'Cherokee', '2014-2020', 'Guiñador delantero. Lente ámbar.', '68075034AA', 'GÑD-JEE-CHK-004', NULL, NULL, 140, 210, 180, 175, 1, true, '2026-08-25 04:29:06.647437');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (6, 'Stop', 'Toyota', 'Taiwán', 'Tyc', 'RAV4', '2013-2018', 'Stop trasero. Lente cristal-rojo, con portalámpara.', '81560-0R010', 'STP-TOY-RAV-005', NULL, NULL, 160, 240, 205, 200, 1, true, '2026-08-25 04:29:06.648707');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (7, 'Stop', 'Renault', 'Tailandia', 'Valeo', 'Duster', '2015-2021', 'Stop trasero derecho. Con portalámpara.', '26500-4BL0A', 'STP-REN-DUS-006', NULL, NULL, 150, 225, 195, 190, 1, true, '2026-08-25 04:29:06.650272');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (8, 'Stop', 'Dodge', 'China', 'Depo', 'Ram 1500', '2013-2018', 'Stop trasero. Lente rojo-cristal.', '68221144AB', 'STP-DOD-RAM-032', NULL, NULL, 380, 540, 470, 455, 1, true, '2026-08-25 04:29:06.65171');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (9, 'Espejo', 'Nissan', 'China', 'Depo', 'Frontier', '2017-2022', 'Espejo retrovisor derecho. Eléctrico, sin calefacción.', '96301-5LA1A', 'ESP-NIS-FRN-007', NULL, NULL, 200, 300, 255, 250, 1, true, '2026-08-25 04:29:06.653225');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (10, 'Espejo', 'Mazda', 'Taiwán', 'Kage', 'CX-5', '2017-2023', 'Espejo retrovisor derecho. Eléctrico y rebatible.', 'KJY1-69-220', 'ESP-MAZ-CX5-008', NULL, NULL, 260, 380, 330, 320, 1, true, '2026-08-25 04:29:06.654543');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (11, 'Espejo', 'Hyundai', 'China', 'Kage', 'Tucson', '2015-2020', 'Espejo retrovisor izquierdo. Eléctrico.', '87610-D3000', 'ESP-HYD-TUC-033', NULL, NULL, 240, 360, 310, 300, 1, true, '2026-08-25 04:29:06.656199');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (12, 'Capot', 'Toyota', 'China', 'Finar', 'Hilux', '2012-2017', 'Capot de acero, sin imprimación.', '53101-0K070', 'CPT-TOY-HLX-009', NULL, NULL, 900, 1250, 1100, 1050, 1, true, '2026-08-25 04:29:06.657873');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (13, 'Capot', 'Dodge', 'Taiwán', 'Capris', 'Ram 1500', '2013-2018', 'Capot de acero, con bisagras.', '53012070AD', 'CPT-DOD-RAM-010', NULL, NULL, 1450, 1950, 1750, 1700, 1, true, '2026-08-25 04:29:06.659696');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (14, 'Puerta', 'Toyota', 'Tailandia', 'Finar', 'Corolla', '2013-2019', 'Puerta delantera derecha. Acero, con vidrio.', '67010-02T60', 'PRT-TOY-COR-011', NULL, NULL, 950, 1300, 1150, 1100, 1, true, '2026-08-25 04:29:06.661657');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (15, 'Puerta', 'Hyundai', 'China', 'Capris', 'Tucson', '2015-2020', 'Puerta trasera izquierda. Acero.', '80210-D3000', 'PRT-HYD-TUC-012', NULL, NULL, 880, 1200, 1050, 1000, 1, true, '2026-08-25 04:29:06.663322');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (16, 'Parachoques', 'Nissan', 'Taiwán', 'Tyc', 'Frontier', '2016-2021', 'Parachoques delantero. ABS, sin pintar.', '62010-5LA2A', 'PRC-NIS-FRN-013', NULL, NULL, 700, 980, 860, 830, 1, true, '2026-08-25 04:29:06.666077');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (17, 'Parachoques', 'Toyota', 'Tailandia', 'Tyc', 'Hilux', '2015-2020', 'Parachoques delantero. ABS, con rejillas.', '52010-0K420', 'PRC-TOY-HLX-014', NULL, NULL, 720, 1000, 880, 850, 1, true, '2026-08-25 04:29:06.668999');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (18, 'Parachoques', 'Jeep', 'China', 'Depo', 'Cherokee', '2014-2020', 'Parachoques delantero. ABS.', '68252401AA', 'PRC-JEE-CHK-015', NULL, NULL, 800, 1120, 980, 950, 1, true, '2026-08-25 04:29:06.672744');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (19, 'Parachoques', 'Toyota', 'Taiwán', 'Capris', 'RAV4', '2013-2018', 'Parachoques trasero. ABS, sin pintar.', '52510-0R160', 'PRC-TOY-RAV-034', NULL, NULL, 780, 1080, 950, 920, 1, true, '2026-08-25 04:29:06.676283');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (20, 'Máscara', 'Renault', 'China', 'Sankei', 'Duster', '2015-2021', 'Máscara frontal con rejilla, negra.', '62310-4BA0A', 'MSC-REN-DUS-016', NULL, NULL, 450, 640, 560, 540, 1, true, '2026-08-25 04:29:06.683027');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (21, 'Máscara', 'Mitsubishi', 'Tailandia', 'Sankei', 'L200', '2015-2021', 'Máscara frontal con rejilla, negra.', 'MR151871', 'MSC-MIT-L20-017', NULL, NULL, 480, 680, 590, 570, 1, true, '2026-08-25 04:29:06.687203');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (22, 'Radiador', 'Toyota', 'China', 'Denso', 'Yaris', '2012-2020', 'Radiador aluminio-plástico, con tapa.', '16400-0Y010', 'RAD-TOY-YAR-018', NULL, NULL, 480, 680, 590, 570, 1, true, '2026-08-25 04:29:06.691051');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (23, 'Radiador', 'Nissan', 'Tailandia', 'Koyo', 'Tiida', '2011-2018', 'Radiador aluminio-plástico, con tapa.', '21410-1JN0A', 'RAD-NIS-TID-019', NULL, NULL, 520, 730, 640, 620, 1, true, '2026-08-25 04:29:06.694075');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (24, 'Radiador', 'Dodge', 'Taiwán', 'Denso', 'Durango', '2014-2020', 'Radiador de alta capacidad V6.', '68176319AA', 'RAD-DOD-DUR-020', NULL, NULL, 1500, 2050, 1800, 1750, 1, true, '2026-08-25 04:29:06.696906');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (25, 'Radiador', 'Jeep', 'Taiwán', 'Denso', 'Grand Cherokee', '2011-2017', 'Radiador de alta capacidad V6.', '68180914AA', 'RAD-JEE-GCH-036', NULL, NULL, 1650, 2200, 1950, 1880, 1, true, '2026-08-25 04:29:06.699056');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (26, 'Condensador', 'Toyota', 'Tailandia', 'Koyo', 'Hilux', '2015-2020', 'Condensador aire acondicionado.', '88460-0K280', 'CND-TOY-HLX-021', NULL, NULL, 850, 1180, 1040, 1000, 1, true, '2026-08-25 04:29:06.701238');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (27, 'Condensador', 'Renault', 'China', 'Valeo', 'Logan', '2013-2021', 'Condensador aire acondicionado.', '921103087R', 'CND-REN-LOG-022', NULL, NULL, 620, 880, 770, 750, 1, true, '2026-08-25 04:29:06.704566');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (28, 'Condensador', 'Nissan', 'Tailandia', 'Valeo', 'Sentra', '2013-2019', 'Condensador aire acondicionado.', '92110-4BA0A', 'CND-NIS-SNT-035', NULL, NULL, 700, 980, 860, 830, 1, true, '2026-08-25 04:29:06.70726');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (29, 'Tanque de agua', 'Hyundai', 'China', 'Koyo', 'Accent', '2012-2018', 'Tanque de agua (depósito de refrigerante).', '25620-2B000', 'TDA-HYD-ACC-023', NULL, NULL, 280, 400, 350, 340, 1, true, '2026-08-25 04:29:06.710784');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (30, 'Tanque de agua', 'Mazda', 'Taiwán', 'Denso', 'Mazda3', '2014-2019', 'Tanque de agua (depósito de refrigerante).', 'BBR2-15-350', 'TDA-MAZ-MZ3-024', NULL, NULL, 310, 440, 385, 370, 1, true, '2026-08-25 04:29:06.713699');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (31, 'Tanque de agua', 'Toyota', 'Tailandia', 'Koyo', 'Corolla', '2014-2019', 'Tanque de agua (depósito de refrigerante).', '16400-0P140', 'TDA-TOY-COR-037', NULL, NULL, 300, 430, 375, 360, 1, true, '2026-08-25 04:29:06.717216');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (32, 'Manivela', 'Toyota', 'Taiwán', 'Protzalee', 'Hilux', '2005-2011', 'Manivela de ventana. Interior.', '83970-0K030', 'MNV-TOY-HLX-025', NULL, NULL, 90, 140, 120, 115, 1, true, '2026-08-25 04:29:06.719756');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (33, 'Manivela', 'Nissan', 'China', 'Protzalee', 'Frontier', '2008-2014', 'Manivela de ventana. Interior.', '80735-ZD00A', 'MNV-NIS-FRN-026', NULL, NULL, 95, 145, 125, 120, 1, true, '2026-08-25 04:29:06.722254');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (34, 'Jalador', 'Mitsubishi', 'Taiwán', 'Kage', 'Montero', '2006-2012', 'Jalador de puerta. Cromado.', 'MR374850', 'JLD-MIT-MON-027', NULL, NULL, 130, 195, 170, 165, 1, true, '2026-08-25 04:29:06.725494');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (35, 'Jalador', 'Toyota', 'China', 'Kage', 'Prado', '2010-2017', 'Jalador de puerta. Cromado.', '69010-60040', 'JLD-TOY-PRD-028', NULL, NULL, 150, 225, 195, 190, 1, true, '2026-08-25 04:29:06.727855');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (36, 'Rejilla', 'Jeep', 'Tailandia', 'Depo', 'Wrangler', '2012-2018', 'Rejilla frontal clásica 7 ranuras.', '55112787AB', 'RJL-JEE-WRN-029', NULL, NULL, 340, 490, 430, 415, 1, true, '2026-08-25 04:29:06.730823');
INSERT INTO public.products (id, producto, fabricante, "empresaFabricante", marca, modelo, anio, detalle, "codigoOem", "codigoFabrica", imagen, "imagenHash", costo, precio1, precio2, "precioMayor", "stockMinimo", activo, "createdAt") VALUES (37, 'Rejilla', 'Renault', 'China', 'Sankei', 'Sandero', '2014-2020', 'Rejilla frontal negra.', '62310-4387R', 'RJL-REN-SAN-030', NULL, NULL, 220, 320, 280, 270, 1, true, '2026-08-25 04:29:06.732822');


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.proveedores (id, nombre, pais, contacto, "createdAt") VALUES (1, 'Taiwan Autopartes Import', 'Bolivia', 'Representación Taiwán · ventas@taiwanimport.bo', '2026-08-25 04:29:06.633857');
INSERT INTO public.proveedores (id, nombre, pais, contacto, "createdAt") VALUES (2, 'Siam Parts Bolivia', 'Bolivia', 'Representación Tailandia · ventas@siamparts.bo', '2026-08-25 04:29:06.635984');
INSERT INTO public.proveedores (id, nombre, pais, contacto, "createdAt") VALUES (3, 'China Auto Repuestos Ltda.', 'Bolivia', 'Representación China · pedidos@chinauto.bo', '2026-08-25 04:29:06.637502');


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: solicitudes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, nombre, email, password, rol, "tiendaId", "createdAt") VALUES (1, 'Brian Admin', 'admin@importadoras.com', '$2b$10$Bzy.lNB/WYiRfTY1ndQNauNANha/R5Y5zy8.QFnVxe85qYCiqbBbG', 'admin', NULL, '2026-08-25 04:29:06.395739');
INSERT INTO public.users (id, nombre, email, password, rol, "tiendaId", "createdAt") VALUES (2, 'Encargado Inventario', 'inventario@importadoras.com', '$2b$10$lweR0A86kbbAA1/Omt3uR.luh2RY7TZN4HywIacJr3yOJKkAg6qm6', 'inventario', NULL, '2026-08-25 04:29:06.457088');
INSERT INTO public.users (id, nombre, email, password, rol, "tiendaId", "createdAt") VALUES (3, 'Vendedor Tienda 1', 'tienda1@importadoras.com', '$2b$10$Gkdp2.Xv9PEZoLj/MKDSz.rSRc0ijQ.rjWLaXZG3/1IX9wztVjYXq', 'tienda', 5, '2026-08-25 04:29:06.515387');
INSERT INTO public.users (id, nombre, email, password, rol, "tiendaId", "createdAt") VALUES (4, 'Vendedora Tienda 2', 'tienda2@importadoras.com', '$2b$10$aAx8/hBmNUDMOgPXlu9E3uFxYBvj8p3V1gF5QshXilC9Zz0mU4Rz2', 'tienda', 6, '2026-08-25 04:29:06.573182');
INSERT INTO public.users (id, nombre, email, password, rol, "tiendaId", "createdAt") VALUES (5, 'Vendedor Tienda 3', 'tienda3@importadoras.com', '$2b$10$T4.ku1qLmU4LVThZ8lVtL.ZbpFYUhcUzM0SHhBcCTMkiWvBrSesvi', 'tienda', 7, '2026-08-25 04:29:06.630312');


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clientes_id_seq', 1, false);


--
-- Name: devoluciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.devoluciones_id_seq', 1, false);


--
-- Name: facturas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.facturas_id_seq', 1, false);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 115, true);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.locations_id_seq', 7, true);


--
-- Name: movimientos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.movimientos_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 37, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.proveedores_id_seq', 3, true);


--
-- Name: sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sale_items_id_seq', 1, false);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_seq', 1, false);


--
-- Name: solicitudes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.solicitudes_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: inventory UQ_f80bd37d149606ab891c9550158; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "UQ_f80bd37d149606ab891c9550158" UNIQUE ("productId", "locationId");


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: devoluciones devoluciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT devoluciones_pkey PRIMARY KEY (id);


--
-- Name: facturas facturas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT facturas_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: locations locations_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_codigo_key UNIQUE (codigo);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: movimientos movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos
    ADD CONSTRAINT movimientos_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_codigo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_codigo_key UNIQUE (codigo);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: solicitudes solicitudes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT solicitudes_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: facturas FK_0ffb497c8b449c9d6e2959dcc83; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facturas
    ADD CONSTRAINT "FK_0ffb497c8b449c9d6e2959dcc83" FOREIGN KEY ("proveedorId") REFERENCES public.proveedores(id);


--
-- Name: solicitudes FK_14e7497249c1cbff307fc8a1634; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT "FK_14e7497249c1cbff307fc8a1634" FOREIGN KEY ("usuarioId") REFERENCES public.users(id);


--
-- Name: inventory FK_178e44a002ef47ff6a0c5d196ef; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_178e44a002ef47ff6a0c5d196ef" FOREIGN KEY ("locationId") REFERENCES public.locations(id);


--
-- Name: movimientos FK_2d52ccab7c9bd48c3eabab812a2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos
    ADD CONSTRAINT "FK_2d52ccab7c9bd48c3eabab812a2" FOREIGN KEY ("productId") REFERENCES public.products(id);


--
-- Name: solicitudes FK_33274f68fbc5c94cb03e6df63a8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT "FK_33274f68fbc5c94cb03e6df63a8" FOREIGN KEY ("origenId") REFERENCES public.locations(id);


--
-- Name: movimientos FK_3a5880f3fae856b074862c1c677; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos
    ADD CONSTRAINT "FK_3a5880f3fae856b074862c1c677" FOREIGN KEY ("destinoId") REFERENCES public.locations(id);


--
-- Name: sales FK_3cb0abfd86da005d29337b4793d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_3cb0abfd86da005d29337b4793d" FOREIGN KEY ("locationId") REFERENCES public.locations(id);


--
-- Name: devoluciones FK_6d7f59f686e034042da017d7af2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT "FK_6d7f59f686e034042da017d7af2" FOREIGN KEY ("usuarioId") REFERENCES public.users(id);


--
-- Name: devoluciones FK_6dd7d7f9856a42a3b662ccb77d5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT "FK_6dd7d7f9856a42a3b662ccb77d5" FOREIGN KEY ("productId") REFERENCES public.products(id);


--
-- Name: movimientos FK_82b5cb68093077742683848ee82; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos
    ADD CONSTRAINT "FK_82b5cb68093077742683848ee82" FOREIGN KEY ("usuarioId") REFERENCES public.users(id);


--
-- Name: users FK_86557b981d677a13035d2a12208; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_86557b981d677a13035d2a12208" FOREIGN KEY ("tiendaId") REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: solicitudes FK_bd2a1993dc609ccfe439a03c976; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT "FK_bd2a1993dc609ccfe439a03c976" FOREIGN KEY ("productId") REFERENCES public.products(id);


--
-- Name: sale_items FK_c642be08de5235317d4cf3deb40; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT "FK_c642be08de5235317d4cf3deb40" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: inventory FK_c8622e1e24c6d054d36e8824490; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_c8622e1e24c6d054d36e8824490" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: sales FK_ce042019578fafce54f26b6c526; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_ce042019578fafce54f26b6c526" FOREIGN KEY ("usuarioId") REFERENCES public.users(id);


--
-- Name: movimientos FK_d2855b22f4b5120ae70052e5af0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.movimientos
    ADD CONSTRAINT "FK_d2855b22f4b5120ae70052e5af0" FOREIGN KEY ("origenId") REFERENCES public.locations(id);


--
-- Name: sale_items FK_d675aea38a16313e844662c48f8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT "FK_d675aea38a16313e844662c48f8" FOREIGN KEY ("productId") REFERENCES public.products(id);


--
-- Name: devoluciones FK_d6e15989401f3857141a2cb62d4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devoluciones
    ADD CONSTRAINT "FK_d6e15989401f3857141a2cb62d4" FOREIGN KEY ("locationId") REFERENCES public.locations(id);


--
-- Name: payments FK_e15427928c7a02bd304d628c41e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_e15427928c7a02bd304d628c41e" FOREIGN KEY ("saleId") REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: solicitudes FK_ea1b72fda0983b193e779a1aac5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.solicitudes
    ADD CONSTRAINT "FK_ea1b72fda0983b193e779a1aac5" FOREIGN KEY ("tiendaId") REFERENCES public.locations(id);


--
-- Name: sales FK_eb1a6c945c423b776588e3c3e9c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT "FK_eb1a6c945c423b776588e3c3e9c" FOREIGN KEY ("clienteId") REFERENCES public.clientes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict iSB3RrTdEekq6NElpeY3Hj4adSiFgFUgCK4FnfxXvJG2ICm6P1bdZiaAKy0Xujg

