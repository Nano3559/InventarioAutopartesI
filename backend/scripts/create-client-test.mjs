import 'reflect-metadata';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit operator action only. No synchronization, migration, role reassignment,
// password reset or existing-user modification is performed.
// API: node scripts/create-client-test.mjs --create --api https://example/api --seed-admin
// DB:  node scripts/create-client-test.mjs --create
// Omitting --create performs read-only database schema/permission checks.
const require = createRequire(import.meta.url);
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const { User } = require('../dist/entities/user.entity.js');
const { Location } = require('../dist/entities/location.entity.js');
const { UsersService } = require('../dist/users/users.service.js');
const { AuthService } = require('../dist/auth/auth.service.js');
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const create = process.argv.includes('--create');
const verify = process.argv.includes('--verify');
const apiArgument = process.argv.indexOf('--api');
const password = `Aa9!${randomBytes(18).toString('base64url')}`;
const initialEmail = 'cliente.ia@autoparts.test';
const uniqueEmail = () => `cliente.ia.${Date.now()}.${randomBytes(3).toString('hex')}@autoparts.test`;
const newUser = (email) => ({ nombre: 'Cliente IA', email, password, rol: 'cliente', tiendaId: null, activo: true });
const credentials = (user, method) => console.log(JSON.stringify({
  status: 'created', method, id: user.id, email: user.email,
  password, rol: user.rol, activo: user.activo, tiendaId: user.tiendaId,
}, null, 2));

async function createThroughApi() {
  if (!create && !verify) throw new Error('explicit_create_required');
  const base = process.argv[apiArgument + 1]?.replace(/\/$/, '');
  if (!base || !/^https?:\/\//.test(base)) throw new Error('invalid_api_url');
  const seeded = !verify && process.argv.includes('--seed-admin');
  const email = verify ? process.env.CLIENT_TEST_EMAIL : seeded ? 'admin@importadoras.com' : process.env.ADMIN_EMAIL;
  const adminPassword = verify ? process.env.CLIENT_TEST_PASSWORD : seeded ? 'admin123' : process.env.ADMIN_PASSWORD;
  if (!email || !adminPassword) throw new Error('admin_credentials_required');
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: adminPassword }), signal: AbortSignal.timeout(30000),
  });
  if (!login.ok) throw new Error(`admin_login_http_${login.status}`);
  const session = await login.json();
  if (verify) {
    if (session.user?.rol !== 'cliente' || typeof session.token !== 'string') throw new Error('verification_role_mismatch');
    console.log(JSON.stringify({ status: 'verified', method: 'real_api_login', id: session.user.id, email: session.user.email, rol: session.user.rol }));
    return;
  }
  if (session.user?.rol !== 'admin' || typeof session.token !== 'string') throw new Error('admin_authorization_required');
  const response = await fetch(`${base}/users`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
    body: JSON.stringify(newUser(uniqueEmail())), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`client_create_http_${response.status}`);
  const user = await response.json();
  if (user.rol !== 'cliente' || !Number.isInteger(user.id)) throw new Error('unexpected_created_user');
  credentials(user, 'authorized_admin_api');
}

async function databaseOperation() {
  await ConfigModule.forRoot({ envFilePath: path.join(backend, '.env') });
  const config = new ConfigService();
  const host = config.get('DB_HOST', 'localhost');
  const ssl = config.get('DB_SSL') ?? (!/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)).toString();
  const ds = new DataSource({
    type: 'postgres', host, port: Number(config.get('DB_PORT', '5432')),
    username: config.get('DB_USER', 'postgres'), password: config.get('DB_PASSWORD', 'postgres'),
    database: config.get('DB_NAME', 'postgres'),
    ssl: ssl === 'true' ? { rejectUnauthorized: false } : false,
    entities: [User, Location], synchronize: false, migrationsRun: false, logging: false,
    extra: { max: 1, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 },
  });
  try {
    await ds.initialize();
    const columns = await ds.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='rol'");
    if (!['character varying', 'text'].includes(columns[0]?.data_type)) throw new Error('unsupported_role_column_review_required');
    const checks = await ds.query(`
      SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname='users' AND c.contype='c'
        AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.conrelid
          AND a.attname='rol' AND a.attnum=ANY(c.conkey))`);
    const policies = await ds.query("SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='users'");
    const rls = await ds.query(`SELECT t.relrowsecurity AS enabled, t.relforcerowsecurity AS forced,
      has_table_privilege(current_user, t.oid, 'SELECT') AS can_select,
      has_table_privilege(current_user, t.oid, 'INSERT') AS can_insert
      FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname='users'`);
    console.log(JSON.stringify({ preflight: 'read_only', role_type: columns[0].data_type,
      role_check_count: checks.length, policy_count: policies.length, rls: rls[0] }));
    if (checks.some((check) => /admin/.test(check.definition) && /tienda/.test(check.definition)
      && /inventario/.test(check.definition) && !/cliente/.test(check.definition))) {
      throw new Error('role_check_excludes_cliente_review_required');
    }
    if (verify) {
      if (!process.env.CLIENT_TEST_EMAIL || !process.env.CLIENT_TEST_PASSWORD) throw new Error('client_credentials_required');
      const auth = new AuthService(undefined, ds);
      const user = await auth.validateUser(process.env.CLIENT_TEST_EMAIL, process.env.CLIENT_TEST_PASSWORD);
      if (user.rol !== 'cliente') throw new Error('verification_role_mismatch');
      console.log(JSON.stringify({ status: 'verified', method: 'existing_auth_service', id: user.id, email: user.email, rol: user.rol }));
      return;
    }
    if (!create) return;
    const repo = ds.getRepository(User);
    const exists = await repo.findOne({ where: { email: initialEmail }, select: { id: true } });
    const email = exists ? uniqueEmail() : initialEmail;
    // create() does not use FaceService. Passing no face dependency avoids startup/inference/storage.
    const users = new UsersService(ds, undefined);
    const user = await users.create(newUser(email));
    const saved = await repo.findOne({ where: { id: user.id }, select: { id: true, email: true, rol: true, activo: true, tiendaId: true } });
    if (!saved || saved.rol !== 'cliente' || !saved.activo || saved.tiendaId !== null) throw new Error('created_client_verification_failed');
    credentials(saved, 'authorized_existing_database');
  } finally {
    if (ds.isInitialized) await ds.destroy();
  }
}

try {
  if (create && verify) throw new Error('conflicting_operator_modes');
  if (apiArgument >= 0) await createThroughApi();
  else await databaseOperation();
} catch (error) {
  // Avoid logging driver errors, SQL parameters, tokens or .env credentials.
  const safe = /^(explicit_create_required|invalid_api_url|admin_credentials_required|admin_authorization_required|unexpected_created_user|unsupported_role_column_review_required|role_check_excludes_cliente_review_required|created_client_verification_failed|client_credentials_required|verification_role_mismatch|conflicting_operator_modes|admin_login_http_\d+|client_create_http_\d+)$/.test(error.message)
    ? error.message : (typeof error.code === 'string' ? error.code : typeof error.cause?.code === 'string' ? error.cause.code : error.name);
  console.error(JSON.stringify({ status: 'failed', reason: safe }));
  process.exitCode = 1;
}
