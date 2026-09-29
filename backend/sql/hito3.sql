-- Hito 3 - asistencia facial + campos de registro facial en users
-- Generado desde el esquema que TypeORM creo en la BD local (sincronizado con las entities).
-- Idempotente: se puede ejecutar mas de una vez sin error.

CREATE SEQUENCE IF NOT EXISTS public.asistencia_id_seq;

CREATE TABLE IF NOT EXISTS public.asistencia (
  "id" integer NOT NULL DEFAULT nextval('asistencia_id_seq'::regclass),
  "usuarioId" integer NOT NULL,
  "locationId" integer,
  "fecha" timestamp without time zone NOT NULL DEFAULT now(),
  "tipo" character varying NOT NULL,
  "confianza" double precision,
  "metodo" character varying NOT NULL DEFAULT 'automatico'::character varying,
  "confirmadoPorId" integer,
  CONSTRAINT asistencia_pkey PRIMARY KEY (id)
);

DO $$ BEGIN
  ALTER TABLE public.asistencia
    ADD CONSTRAINT FK_asistencia_usuario FOREIGN KEY ("usuarioId") REFERENCES public.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.asistencia
    ADD CONSTRAINT FK_asistencia_location FOREIGN KEY ("locationId") REFERENCES public.locations(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.asistencia
    ADD CONSTRAINT FK_asistencia_confirmadoPor FOREIGN KEY ("confirmadoPorId") REFERENCES public.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER SEQUENCE public.asistencia_id_seq OWNED BY public.asistencia.id;

CREATE INDEX IF NOT EXISTS "IX_asistencia_fecha" ON public.asistencia USING btree (fecha);

CREATE INDEX IF NOT EXISTS "IX_asistencia_usuario_fecha" ON public.asistencia USING btree ("usuarioId", fecha);

-- Campos de registro facial en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "apellido"        character varying,
  ADD COLUMN IF NOT EXISTS "embedding"       jsonb,
  ADD COLUMN IF NOT EXISTS "facePhoto"       text,
  ADD COLUMN IF NOT EXISTS "faceRegisteredAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "activo"          boolean NOT NULL DEFAULT true;

-- products.codigo (Hito 3 - flujo de codigo de barras) por si la BD destino no lo tiene
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS "codigo" character varying;
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_codigo" ON public.products ("codigo");
