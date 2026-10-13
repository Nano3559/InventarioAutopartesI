import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Explicit operator phases: --prepare (default), --create-ai, --status, --connect-backend.
// Secrets are loaded from ignored local files and never printed. The existing Node
// service's plan, branch, repository and unrelated environment variables are preserved.
const require = createRequire(import.meta.url);
const { ConfigModule, ConfigService } = require('@nestjs/config');
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.dirname(backendRoot);
await ConfigModule.forRoot({ envFilePath: path.join(backendRoot, '.env') });
const config = new ConfigService();
const renderKey = config.get('RenderApiKey') || config.get('RENDER_API_KEY');
assert.ok(renderKey, 'Render API key is missing');
const inputFile = path.join(workspace, 'ai-service/artifacts/render-deploy-input.json');
assert.ok(fs.existsSync(inputFile), 'Private deployment input file is missing');
let input;
try { input = JSON.parse(fs.readFileSync(inputFile, 'utf8')); }
catch { console.error(JSON.stringify({ status: 'invalid_private_input' })); process.exit(1); }
const phases = ['--prepare', '--create-ai', '--status', '--connect-backend'];
const selected = phases.filter((flag) => process.argv.includes(flag));
assert.ok(selected.length <= 1, 'Select only one operator phase');
const phase = selected[0] || '--prepare';
const backendId = 'srv-dabk6b2d0e5s739lkgr0';
const serviceName = 'autoparts-ai';
const reportFile = path.join(workspace, 'ai-service/artifacts/render-deploy-status.json');
const writes = [];

for (const field of ['archive_sha256', 'weights_sha256', 'expected_commit']) {
  assert.ok((field === 'expected_commit' ? /^[a-f0-9]{40}$/ : /^[a-f0-9]{64}$/).test(input[field] || ''), `Invalid ${field}`);
}
assert.ok(typeof input.shared_api_key === 'string' && input.shared_api_key.length >= 32, 'A strong private shared key is required');
assert.ok(input.branch === 'feature/ultimos-cambios', 'Expected the authorized existing feature branch');
try {
  const archive = new URL(input.archive_url);
  assert.ok(archive.protocol === 'https:' && !archive.username && !archive.password);
} catch { console.error(JSON.stringify({ status: 'invalid_private_archive_url' })); process.exit(1); }

function publicUrl(raw) {
  const url = new URL(raw);
  assert.ok(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash, 'Service URL must be public HTTPS without credentials or query');
  return `${url.origin}${url.pathname}`.replace(/\/$/, '');
}

function safeFailure(error) {
  if (typeof error.cause?.code === 'string') return error.cause.code;
  if (/^render_http_\d+$/.test(error.message)) return error.message;
  return error.name || 'Error';
}

async function api(route, method = 'GET', body) {
  const response = await fetch(`https://api.render.com/v1${route}`, {
    method, redirect: 'error', headers: { Authorization: `Bearer ${renderKey}`, Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`render_http_${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function list(route) {
  const result = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const rows = await api(`${route}?${params}`);
    assert.ok(Array.isArray(rows), 'Unexpected Render list response');
    result.push(...rows);
    if (rows.length < 100 || !rows.at(-1)?.cursor || rows.at(-1).cursor === cursor) break;
    cursor = rows.at(-1).cursor;
  }
  return result;
}

function envMap(rows) {
  return Object.fromEntries(rows.map((entry) => {
    const variable = entry.envVar || entry;
    return [variable.key, variable.value];
  }));
}

async function putVariable(id, key, value) {
  await api(`/services/${id}/env-vars/${encodeURIComponent(key)}`, 'PUT', { value });
  writes.push({ service_id: id, environment_key: key });
}

function info(service) {
  return { id: service.id, name: service.name, runtime: service.serviceDetails?.runtime,
    plan: service.serviceDetails?.plan, region: service.serviceDetails?.region,
    branch: service.branch, url: service.serviceDetails?.url ? publicUrl(service.serviceDetails.url) : null };
}

async function modelCheck(service) {
  const url = publicUrl(service.serviceDetails.url);
  const fetchJson = async (route) => {
    const response = await fetch(`${url}${route}`, { method: 'GET', redirect: 'error',
      headers: { 'X-API-Key': input.shared_api_key }, signal: AbortSignal.timeout(60000) });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const health = await fetchJson('/health');
  const model = await fetchJson('/model/info');
  return {
    health_http_status: health.status, model_available: health.body?.model_available === true,
    model_info_http_status: model.status,
    weights_sha256: /^[a-f0-9]{64}$/.test(model.body?.weights_sha256 || '') ? model.body.weights_sha256 : null,
    weights_match: model.body?.weights_sha256 === input.weights_sha256,
    class_count: Number.isInteger(model.body?.class_count) ? model.body.class_count : null,
  };
}

const aiEnv = {
  PYTHON_VERSION: '3.11.11',
  AUTOPARTS_API_KEY: input.shared_api_key,
  AUTOPARTS_DEVICE: 'cpu', AUTOPARTS_TORCH_THREADS: '1',
  AUTOPARTS_INFERENCE_TIMEOUT_SECONDS: '90',
  AUTOPARTS_MODEL_ARCHIVE_URL: input.archive_url,
  AUTOPARTS_MODEL_SHA256: input.weights_sha256,
  AUTOPARTS_MODEL_ARCHIVE_SHA256: input.archive_sha256,
  OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', OPENBLAS_NUM_THREADS: '1',
};
const buildCommand = 'bash build_render.sh';
const startCommand = 'uvicorn autoparts_ai.api:app --host 0.0.0.0 --port $PORT --workers 1 --limit-concurrency 4 --timeout-keep-alive 5';
const report = { checked_at: new Date().toISOString(), phase, writes,
  expected_commit: input.expected_commit, expected_weights_sha256: input.weights_sha256 };

try {
  const node = await api(`/services/${backendId}`);
  assert.ok(node.type === 'web_service' && node.serviceDetails.runtime === 'node', 'Expected the existing Node web service');
  assert.equal(publicUrl(node.repo).replace(/\.git$/, ''), publicUrl(input.repo_url).replace(/\.git$/, ''), 'Repository must match the existing service');
  assert.equal(node.serviceDetails.plan, 'free', 'Do not change the existing free plan');
  report.backend = info(node);
  let ai = (await list('/services')).map((entry) => entry.service || entry)
    .find((service) => service.name === serviceName && service.ownerId === node.ownerId);
  const validateAi = (service) => {
    assert.ok(service.type === 'web_service' && service.serviceDetails.runtime === 'python', 'Expected our independent Python web service');
    assert.equal(service.serviceDetails.plan, 'free', 'Only a free Python plan is authorized');
    assert.equal(service.serviceDetails.region, node.serviceDetails.region, 'Use the same existing region');
    assert.equal(service.rootDir, 'ai-service', 'Unexpected Python root directory');
    assert.equal(service.branch, input.branch, 'Unexpected Python branch');
    assert.equal(publicUrl(service.repo).replace(/\.git$/, ''), publicUrl(input.repo_url).replace(/\.git$/, ''), 'Unexpected Python repository');
  };
  if (ai) validateAi(ai);

  if (phase === '--prepare') {
    report.status = 'prepared_no_cloud_changes';
    report.python = ai ? info(ai) : null;
    report.create_plan = { name: serviceName, type: 'web_service', runtime: 'python', plan: 'free',
      region: node.serviceDetails.region, branch: input.branch, root_dir: 'ai-service',
      build_command: buildCommand, start_command: startCommand, environment_keys: Object.keys(aiEnv),
      model_archive_present: Boolean(input.archive_url), shared_key_present: Boolean(input.shared_api_key) };
  } else if (phase === '--create-ai') {
    if (!ai) {
      const created = await api('/services', 'POST', {
        type: 'web_service', name: serviceName, ownerId: node.ownerId, repo: input.repo_url,
        branch: input.branch, rootDir: 'ai-service', autoDeployTrigger: 'commit',
        ...(node.environmentId ? { environmentId: node.environmentId } : {}),
        envVars: Object.entries(aiEnv).map(([key, value]) => ({ key, value })),
        serviceDetails: { runtime: 'python', region: node.serviceDetails.region, plan: 'free',
          numInstances: 1, healthCheckPath: '', envSpecificDetails: { buildCommand, startCommand } },
      });
      const id = created.service?.id || created.id;
      assert.ok(id, 'Created service did not include an id');
      writes.push({ action: 'created_free_python_service', service_id: id });
      ai = await api(`/services/${id}`);
      validateAi(ai);
      report.deploy_id = created.deployId || null;
    } else {
      const current = envMap(await list(`/services/${ai.id}/env-vars`));
      for (const [key, value] of Object.entries(aiEnv)) {
        if (current[key] !== value) await putVariable(ai.id, key, value);
      }
      const deploy = await api(`/services/${ai.id}/deploys`, 'POST', { commitId: input.expected_commit, clearCache: 'do_not_clear' });
      writes.push({ action: 'deployed_python_service', service_id: ai.id });
      report.deploy_id = deploy.id || null;
    }
    report.python = info(ai);
    report.status = 'python_deployment_requested';
  } else if (phase === '--status') {
    assert.ok(ai, 'Python service has not been created');
    const deploys = (await list(`/services/${ai.id}/deploys`)).map((entry) => entry.deploy || entry);
    report.python = info(ai);
    report.deploy = deploys[0] ? { id: deploys[0].id, status: deploys[0].status,
      commit: deploys[0].commit?.id, matches_expected_commit: deploys[0].commit?.id === input.expected_commit } : null;
    if (report.deploy?.status === 'live') {
      try { report.model = await modelCheck(ai); }
      catch (error) { report.model = { status: 'unavailable', error: safeFailure(error) }; }
    }
    report.status = 'read_only_status';
  } else {
    assert.ok(ai, 'Python service has not been created');
    const model = await modelCheck(ai);
    report.model = model;
    assert.ok(model.model_available && model.weights_match && model.class_count === 50, 'Do not connect an unavailable or mismatched model');
    const before = envMap(await list(`/services/${backendId}/env-vars`));
    const values = {
      AUTOPARTS_AI_URL: publicUrl(ai.serviceDetails.url),
      AUTOPARTS_AI_API_KEY: input.shared_api_key,
      AUTOPARTS_AI_TIMEOUT_MS: '120000',
    };
    for (const [key, value] of Object.entries(values)) {
      if (before[key] !== value) await putVariable(backendId, key, value);
    }
    const after = envMap(await list(`/services/${backendId}/env-vars`));
    assert.ok(Object.entries(before).every(([key, value]) => key in values || after[key] === value), 'Unrelated environment variables must remain unchanged');
    assert.ok(Object.entries(values).every(([key, value]) => after[key] === value), 'Proxy environment verification failed');
    report.unrelated_environment_preserved = true;
    const nodeDeploys = (await list(`/services/${backendId}/deploys`)).map((entry) => entry.deploy || entry);
    const live = nodeDeploys.find((deploy) => deploy.status === 'live');
    assert.ok(live?.commit?.id, 'The existing live backend commit is required');
    const deployed = await api(`/services/${backendId}/deploys`, 'POST', { commitId: live.commit.id, clearCache: 'do_not_clear' });
    writes.push({ action: 'redeployed_existing_backend_commit', service_id: backendId });
    report.backend_deploy_id = deployed.id;
    report.backend_commit = live.commit.id;
    report.python = info(ai);
    report.status = 'backend_proxy_connected_deployment_requested';
  }
} catch (error) {
  report.status = 'failed';
  report.error = safeFailure(error);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
