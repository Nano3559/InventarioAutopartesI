import 'reflect-metadata';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

// Usage: node scripts/part-recognition-check.mjs [--image path/to/photo.jpg] [--serve]
// Live integration check: real NestJS multipart/JWT/proxy and real FastAPI inference.
// No AppModule, database connection, persisted user or fake prediction is involved.
const require = createRequire(import.meta.url);
const { Test } = require('@nestjs/testing');
const { PassportModule } = require('@nestjs/passport');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { JwtStrategy } = require('../dist/auth/jwt.strategy.js');
const { PartRecognitionController } = require('../dist/part-recognition/part-recognition.controller.js');
const { PartRecognitionService } = require('../dist/part-recognition/part-recognition.service.js');
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function sampleImage() {
  const imageArgument = process.argv.indexOf('--image');
  if (imageArgument >= 0) {
    assert.ok(process.argv[imageArgument + 1], '--image requires a file path');
    return path.resolve(process.argv[imageArgument + 1]);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(workspace, 'ai-service/artifacts/dataset.json'), 'utf8'));
  const testRoot = manifest.splits?.test?.path;
  assert.ok(testRoot && fs.existsSync(testRoot), 'Pass an image path or prepare the local test dataset first');
  for (const label of fs.readdirSync(testRoot).sort()) {
    const directory = path.join(testRoot, label);
    if (!fs.statSync(directory).isDirectory()) continue;
    const file = fs.readdirSync(directory).sort().find((entry) => /\.(jpe?g|png|webp)$/i.test(entry));
    if (file) return path.join(directory, file);
  }
  throw new Error('No supported test image found');
}

// Replace JWT_SECRET only inside this process before constructing Passport's strategy.
// These ephemeral tokens cannot authenticate against the actual application.
const testJwtSecret = randomBytes(48).toString('hex');
process.env.JWT_SECRET = testJwtSecret;
const fixture = await Test.createTestingModule({
  imports: [PassportModule],
  controllers: [PartRecognitionController],
  providers: [JwtStrategy, PartRecognitionService, {
    provide: ConfigService,
    useValue: new ConfigService({
      AUTOPARTS_AI_URL: process.env.AUTOPARTS_AI_URL || 'http://127.0.0.1:8001',
      AUTOPARTS_AI_API_KEY: process.env.AUTOPARTS_AI_API_KEY || '',
    }),
  }],
}).compile();
const app = fixture.createNestApplication({ logger: false });
app.setGlobalPrefix('api');
const sessionFile = path.join(workspace, 'ai-service/artifacts/live-ui-session.json');
let sessionToken = null;

try {
  await app.listen(0, '127.0.0.1');
  const url = `${await app.getUrl()}/api/part-recognition`;
  const jwt = new JwtService({ secret: testJwtSecret });
  // Tokens authorize only this isolated test server and are never printed.
  // --serve persists one temporary cliente token in the ignored artifacts directory.
  const token = (rol) => jwt.sign({ sub: 0, email: 'live-check@example.invalid', rol, tiendaId: null }, { expiresIn: '5m' });
  const cliente = token('cliente');
  const call = async (route, options = {}, roleToken = cliente) => {
    const response = await fetch(`${url}${route}`, {
      ...options,
      headers: roleToken ? { Authorization: `Bearer ${roleToken}` } : {},
      signal: AbortSignal.timeout(45000),
    });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await call('/health', {}, null)).status, 401);
  assert.equal((await call('/health', {}, token('admin'))).status, 403);
  const health = await call('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.model_available, true, 'FastAPI model is unavailable');
  const classes = await call('/classes');
  const model = await call('/model/info');
  assert.equal(classes.status, 200);
  assert.equal(model.status, 200);
  assert.equal(classes.body.length, model.body.class_count);
  assert.match(model.body.weights_sha256, /^[a-f0-9]{64}$/);

  const image = sampleImage();
  const extension = path.extname(image).toLowerCase();
  const mime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(image)], { type: mime }), path.basename(image));
  const predictionStarted = Date.now();
  const result = await call('/predict', { method: 'POST', body: form });
  const inferenceMs = Date.now() - predictionStarted;
  assert.equal(result.status, 200, `Recognition failed: ${JSON.stringify(result.body)}`);
  assert.equal(result.body.top_predictions.length, Math.min(3, model.body.class_count));
  assert.equal(result.body.prediction.class_info.id, result.body.top_predictions[0].class_info.id);
  assert.equal(result.body.analysis.weights_sha256, model.body.weights_sha256);
  for (const prediction of result.body.top_predictions) {
    assert.ok(prediction.confidence >= 0 && prediction.confidence <= 1);
    assert.ok(classes.body.some((entry) => entry.id === prediction.class_info.id && entry.training_label === prediction.class_info.training_label));
  }
  const report = {
    status: 'passed', authentication: '401/403 verified',
    checked_at: new Date().toISOString(),
    model: model.body.model, class_count: model.body.class_count,
    weights_sha256: model.body.weights_sha256,
    inference_ms: inferenceMs,
    expected_label: process.argv.includes('--image') ? null : path.basename(path.dirname(image)),
    prediction: result.body.prediction.class_info.original_name,
    confidence: result.body.prediction.confidence,
    confidence_state: result.body.confidence_state,
    conclusive: result.body.conclusive,
    top_predictions: result.body.top_predictions.map((entry) => ({ label: entry.class_info.original_name, confidence: entry.confidence })),
  };
  fs.writeFileSync(path.join(workspace, 'ai-service/artifacts/bridge-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--serve')) {
    sessionToken = cliente;
    const expiresAt = jwt.decode(cliente).exp * 1000;
    fs.writeFileSync(sessionFile, `${JSON.stringify({
      url: `${await app.getUrl()}/api`,
      token: cliente,
      expires_at: new Date(expiresAt).toISOString(),
    }, null, 2)}\n`);
    console.log('Isolated UI bridge ready; session file created, stops automatically within 5 minutes or on SIGINT.');
    await new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        process.removeListener('SIGINT', finish);
        process.removeListener('SIGTERM', finish);
        resolve();
      };
      const timer = setTimeout(finish, Math.max(1, expiresAt - Date.now()));
      process.once('SIGINT', finish);
      process.once('SIGTERM', finish);
    });
  }
} finally {
  await app.close();
  if (sessionToken && fs.existsSync(sessionFile)) {
    // Remove only this run's ignored credential artifact, preserving a concurrent run.
    const current = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    if (current.token === sessionToken) fs.unlinkSync(sessionFile);
  }
}
