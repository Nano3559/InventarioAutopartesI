-- Idempotent migration for the verified schema: users.rol is varchar.
-- Apply manually with DB_SYNC=false after reviewing the remote schema.
-- No rows, roles, privileges, RLS policies, or existing constraints are changed.

-- Read-only preflight: review these results before applying the migration below.
-- The repository schema has no CHECK on rol; the remote database may differ.
SELECT c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition,
       c.convalidated AS validated
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'users' AND c.contype = 'c'
  AND EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = c.conrelid AND a.attname = 'rol'
      AND a.attnum = ANY(c.conkey)
  )
ORDER BY c.conname;

SELECT t.relrowsecurity AS rls_enabled, t.relforcerowsecurity AS rls_forced
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'users';

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- If a CHECK excludes cliente, inspect its exact definition and prepare an
-- explicit migration preserving all previous roles. Do not drop constraints,
-- disable RLS, grant additional privileges, or replace policies automatically.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'rol' AND data_type IN ('character varying', 'text')
  ) THEN
    RAISE EXCEPTION 'Expected public.users.rol varchar/text; inspect the actual schema before proceeding';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'users' AND c.contype = 'c'
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = c.conrelid AND a.attname = 'rol'
          AND a.attnum = ANY(c.conkey)
      )
      AND pg_get_constraintdef(c.oid) LIKE '%admin%'
      AND pg_get_constraintdef(c.oid) LIKE '%tienda%'
      AND pg_get_constraintdef(c.oid) LIKE '%inventario%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%cliente%'
  ) THEN
    RAISE EXCEPTION 'Existing role CHECK may reject cliente; review preflight results and prepare an explicit compatible migration';
  END IF;
END $$;
COMMENT ON COLUMN public.users.rol IS
  'Roles validated by NestJS USER_ROLES: admin, tienda, inventario, cliente. Assignment through admin-only /api/users.';
COMMIT;
