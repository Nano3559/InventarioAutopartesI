import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Read-only audit. Run with node --use-system-ca scripts/check-render-model.mjs.
// Secrets remain in memory. Every remote request is GET; no deploy/env write is performed.
const require = createRequire(import.meta.url);
const { ConfigModule, ConfigService } = require('@nestjs/config');
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(backend);
await ConfigModule.forRoot({ envFilePath: path.join(backend, '.env') });
const config = new ConfigService();
const renderKey = config.get('RenderApiKey') || config.get('RENDER_API_KEY');
const expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim();
const expectedFile = path.join(workspace, 'ai-service/artifacts/models/model-info.json');
const expected = fs.existsSync(expectedFile) ? JSON.parse(fs.readFileSync(expectedFile, 'utf8')) : {
  class_count: 50,
  weights_sha256: 'b9bd44e58650ec5fab95705b5f4c1aa5f4b5a86008ffc60926dfea2dd481d7b2',
};
const safeError = (error) => typeof error.cause?.code === 'string' ? error.cause.code
  : typeof error.code === 'string' ? error.code : /^render_http_\d+$/.test(error.message) ? error.message : error.name;

async function renderGet(route) {
  const response = await fetch(`https://api.render.com/v1${route}`, {
    method: 'GET', redirect: 'error',
    headers: { Authorization: `Bearer ${renderKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`render_http_${response.status}`);
  return response.json();
}

async function list(route) {
  const result = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const query = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const rows = await renderGet(`${route}?${query}`);
    if (!Array.isArray(rows)) throw new Error('unexpected_render_list');
    result.push(...rows);
    if (rows.length < 100) break;
    const next = rows.at(-1)?.cursor;
    if (!next || next === cursor) break;
    cursor = next;
  }
  return result;
}

function envMap(rows) {
  return Object.fromEntries(rows.map((entry) => {
    const variable = entry.envVar || entry;
    return [variable.key, variable.value];
  }).filter(([key]) => typeof key === 'string'));
}

function safeUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return `${url.origin}${url.pathname}`.replace(/\/$/, '');
  } catch { return null; }
}

function summary(service) {
  return { id: service.id, name: service.name, type: service.type,
    runtime: service.serviceDetails?.runtime || service.env || null,
    url: safeUrl(service.serviceDetails?.url), suspended: service.suspended,
    branch: service.branch, root_dir: service.rootDir || null,
  };
}

async function liveModel(url, key) {
  const request = async (route) => {
    const response = await fetch(`${url}${route}`, { method: 'GET', redirect: 'error',
      headers: key ? { 'X-API-Key': key } : {}, signal: AbortSignal.timeout(30000) });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  };
  const health = await request('/health');
  const info = await request('/model/info');
  return {
    health_http_status: health.status, model_available: health.body?.model_available === true,
    model_info_http_status: info.status, model: typeof info.body?.model === 'string' ? info.body.model : null,
    class_count: Number.isInteger(info.body?.class_count) ? info.body.class_count : null,
    weights_sha256: /^[a-f0-9]{64}$/.test(info.body?.weights_sha256 || '') ? info.body.weights_sha256 : null,
    class_count_matches: info.body?.class_count === expected.class_count,
    weights_match: info.body?.weights_sha256 === expected.weights_sha256,
  };
}

try {
  if (!renderKey) throw new Error('render_api_key_missing');
  const services = (await list('/services')).map((entry) => entry.service || entry);
  const targetName = process.env.RENDER_CHECK_SERVICE_NAME || 'InventarioAutopartesI';
  const target = services.find((service) => service.name?.toLowerCase() === targetName.toLowerCase()
    || service.serviceDetails?.url === 'https://inventarioautopartesi.onrender.com');
  if (!target) throw new Error('backend_service_not_found');
  const requests = await Promise.allSettled([
    list(`/services/${target.id}/deploys`),
    list(`/services/${target.id}/env-vars`),
    list('/env-groups'),
  ]);
  const deploys = requests[0].status === 'fulfilled' ? requests[0].value.map((entry) => entry.deploy || entry) : [];
  const direct = requests[1].status === 'fulfilled' ? envMap(requests[1].value) : {};
  const groups = requests[2].status === 'fulfilled' ? requests[2].value.map((entry) => entry.envGroup || entry) : [];
  const linked = groups.filter((group) => group.serviceLinks?.some((link) => link.id === target.id));
  const effective = {};
  const groupFailures = [];
  for (const group of linked) {
    try {
      const details = await renderGet(`/env-groups/${group.id}`);
      Object.assign(effective, envMap(details.envVars || []));
    } catch (error) { groupFailures.push(safeError(error)); }
  }
  Object.assign(effective, direct);
  const latest = deploys[0];
  const live = deploys.find((deploy) => deploy.status === 'live');
  const python = services.filter((service) => (service.serviceDetails?.runtime || service.env) === 'python');
  const proxyRaw = effective.AUTOPARTS_AI_URL;
  const proxy = safeUrl(proxyRaw);
  const environmentVerified = requests[1].status === 'fulfilled' && requests[2].status === 'fulfilled' && groupFailures.length === 0;
  const report = {
    checked_at: new Date().toISOString(), mode: 'read_only', expected_commit: expectedCommit,
    expected_model: { class_count: expected.class_count, weights_sha256: expected.weights_sha256 },
    visible_services: services.map(summary), backend: summary(target),
    latest_deploy: latest ? { status: latest.status, commit: latest.commit?.id || null,
      started_at: latest.startedAt, finished_at: latest.finishedAt } : null,
    live_deploy: live ? { status: live.status, commit: live.commit?.id || null,
      matches_head: live.commit?.id === expectedCommit, finished_at: live.finishedAt } : null,
    build_command: target.serviceDetails?.envSpecificDetails?.buildCommand === 'npm install && npm run build'
      ? 'npm install && npm run build' : 'custom command omitted',
    start_command: target.serviceDetails?.envSpecificDetails?.startCommand === 'npm run start:prod'
      ? 'npm run start:prod' : 'custom command omitted',
    python_process_in_start_command: /(?:uvicorn|fastapi|python)/i.test(target.serviceDetails?.envSpecificDetails?.startCommand || ''),
    environment: {
      verified: environmentVerified, linked_group_count: linked.length,
      proxy_url_configured: Boolean(proxyRaw), proxy_url: proxy,
      proxy_url_valid: proxyRaw ? Boolean(proxy) : null,
      proxy_api_key_configured: Boolean(effective.AUTOPARTS_AI_API_KEY),
      timeout_configured: Boolean(effective.AUTOPARTS_AI_TIMEOUT_MS),
    },
    python_services: python.map(summary), cloud_model: null,
    errors: requests.filter((result) => result.status === 'rejected').map((result) => safeError(result.reason)).concat(groupFailures),
  };
  if (proxy) {
    const hostname = new URL(proxy).hostname;
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
      report.cloud_model = { verification: 'not_probed_loopback_url_refers_to_render_host' };
    } else {
      const candidate = python.find((service) => safeUrl(service.serviceDetails?.url) === proxy);
      if (candidate) {
        try {
          const pythonEnv = envMap(await list(`/services/${candidate.id}/env-vars`));
          report.environment.python_api_key_configured = Boolean(pythonEnv.AUTOPARTS_API_KEY);
          report.environment.internal_keys_match = (effective.AUTOPARTS_AI_API_KEY || '') === (pythonEnv.AUTOPARTS_API_KEY || '');
        } catch (error) { report.errors.push(safeError(error)); }
      }
      try { report.cloud_model = await liveModel(proxy, effective.AUTOPARTS_AI_API_KEY || ''); }
      catch (error) { report.cloud_model = { verification: 'failed', error: safeError(error) }; }
    }
  } else if (environmentVerified && !proxyRaw) {
    report.cloud_model = { verification: 'proxy_url_missing_defaults_to_localhost8001' };
  }
  const file = path.join(workspace, 'ai-service/artifacts/render-audit.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ mode: 'read_only', status: 'failed', error: safeError(error) }));
  process.exitCode = 1;
}
