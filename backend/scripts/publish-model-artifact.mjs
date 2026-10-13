import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Authorized operator utility. Python inference has no database/Storage SDK.
// Run from backend; signed URLs and shared secrets are never printed.
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = path.join(workspace, 'ai-service/artifacts');
const archiveFile = path.join(artifacts, 'model-deployment.zip');
assert.ok(fs.existsSync(archiveFile), 'Prepare the verified model-deployment.zip first');
assert.ok(process.env.SUPABASE_URL && process.env.SUPABASE_KEY, 'Supabase operator configuration is missing');
const archive = fs.readFileSync(archiveFile);
const archiveHash = crypto.createHash('sha256').update(archive).digest('hex');
const info = JSON.parse(fs.readFileSync(path.join(artifacts, 'models/model-info.json'), 'utf8'));
const weights = fs.readFileSync(path.join(artifacts, 'models/best.pt'));
assert.equal(crypto.createHash('sha256').update(weights).digest('hex'), info.weights_sha256);
const bucket = 'autoparts-models';
const object = `yolo11n-cls/${archiveHash}.zip`;
let storageUrl = process.env.SUPABASE_URL;
let storageKey = process.env.SUPABASE_KEY;
if (process.argv.includes('--render-storage-credentials')) {
  assert.ok(process.env.RenderApiKey, 'Render operator credentials are missing');
  const response = await fetch('https://api.render.com/v1/services/srv-dabk6b2d0e5s739lkgr0/env-vars?limit=100', {
    headers: { Authorization: `Bearer ${process.env.RenderApiKey}` },
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, 'Cannot read the authorized backend Storage configuration');
  const values = Object.fromEntries((await response.json()).map((entry) => [entry.envVar.key, entry.envVar.value]));
  assert.equal(values.SUPABASE_URL?.replace(/\/$/, ''), storageUrl.replace(/\/$/, ''), 'Remote Storage belongs to a different Supabase project');
  assert.ok(values.SUPABASE_KEY, 'Remote Storage operator key is missing');
  storageKey = values.SUPABASE_KEY;
}
const supabase = createClient(storageUrl, storageKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: buckets, error: listError } = await supabase.storage.listBuckets();
assert.ok(!listError, 'Cannot inspect model artifact bucket with the configured operator credentials');
const existing = buckets.find((entry) => entry.name === bucket);
if (existing) {
  assert.equal(existing.public, false, 'Existing model bucket must be private; no permissions are changed automatically');
} else {
  const { error } = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: 20971520, allowedMimeTypes: ['application/zip'] });
  assert.ok(!error, 'Cannot create private model artifact bucket');
}
const { data: objects, error: objectsError } = await supabase.storage.from(bucket).list('yolo11n-cls', { search: `${archiveHash}.zip` });
assert.ok(!objectsError, 'Cannot inspect model artifact objects');
if (!objects.some((entry) => entry.name === `${archiveHash}.zip`)) {
  const { error } = await supabase.storage.from(bucket).upload(object, archive, { contentType: 'application/zip', upsert: false });
  assert.ok(!error, 'Cannot upload model artifact');
}
const lifetime = 31536000;
const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(object, lifetime);
assert.ok(!signError && signed?.signedUrl, 'Cannot sign private model artifact');
const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(object);
assert.ok(!downloadError && downloaded, 'Cannot verify uploaded model artifact');
assert.equal(crypto.createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex'), archiveHash);
const inputFile = path.join(artifacts, 'render-deploy-input.json');
const previous = fs.existsSync(inputFile) ? JSON.parse(fs.readFileSync(inputFile, 'utf8')) : {};
const input = {
  archive_url: signed.signedUrl,
  archive_sha256: archiveHash,
  weights_sha256: info.weights_sha256,
  shared_api_key: previous.shared_api_key || crypto.randomBytes(32).toString('hex'),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: workspace, encoding: 'utf8' }).trim(),
  expected_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace, encoding: 'utf8' }).trim(),
  repo_url: 'https://github.com/Nano3559/InventarioAutopartesI',
  archive_expires_at: new Date(Date.now() + lifetime * 1000).toISOString(),
};
fs.writeFileSync(inputFile, JSON.stringify(input, null, 2));
console.log(JSON.stringify({ status: 'verified', bucket, private: true, object, archive_bytes: archive.length, weights_sha256: info.weights_sha256, expires_at: input.archive_expires_at }, null, 2));
