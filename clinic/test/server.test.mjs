import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createClinicServer } from '../scripts/server.mjs';

async function run(options, check) {
  const root = await mkdtemp(path.join(tmpdir(), 'aamu-clinic-server-'));
  await writeFile(path.join(root, 'index.html'), '<p>Clinic</p>');
  const server = createClinicServer({ root, demoEnabled: true, dashboardToken: 'SYNTHETIC-SERVER-ONLY', ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await check(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
}

test('BFF forwards only its private token to the fixed loopback endpoint and returns a narrow no-store payload', async () => {
  await run({ fetchImpl: async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:3000/clinic/patients');
    assert.equal(options.headers['x-demo-dashboard-token'], 'SYNTHETIC-SERVER-ONLY');
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => ({ demo: true, patients: [], token: 'SYNTHETIC-SERVER-ONLY' }) };
  } }, async origin => {
    const response = await fetch(`${origin}/api/clinic/patients`);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { demo: true, patients: [] });
    const config = await (await fetch(`${origin}/config.js`)).text();
    assert.equal(config, 'export const demoEnabled = true;\n'); assert.doesNotMatch(config, /SYNTHETIC|TOKEN/);
  });
});

test('off mode exposes neither feed nor fixtures and performs no upstream request', async () => {
  let calls = 0;
  await run({ demoEnabled: false, fetchImpl: () => { calls += 1; } }, async origin => {
    assert.equal((await fetch(`${origin}/api/clinic/patients`)).status, 404);
    assert.equal(await (await fetch(`${origin}/config.js`)).text(), 'export const demoEnabled = false;\n');
    assert.equal((await fetch(`${origin}/demo/provider.js`)).status, 404);
  });
  assert.equal(calls, 0);
});

test('missing token and upstream failures return generic errors without exposing credentials', async () => {
  await run({ dashboardToken: undefined, fetchImpl: () => assert.fail('must not fetch without token') }, async origin => {
    assert.equal((await fetch(`${origin}/api/clinic/patients`)).status, 503);
  });
  await run({ fetchImpl: async () => { throw Error('SYNTHETIC-SERVER-ONLY'); } }, async origin => {
    const response = await fetch(`${origin}/api/clinic/patients`);
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /SYNTHETIC/);
  });
});

test('BFF rejects cross-site reads, non-read methods and unsupported routes', async () => {
  await run({ fetchImpl: () => assert.fail('forbidden request reached upstream') }, async origin => {
    assert.equal((await fetch(`${origin}/api/clinic/patients`, { headers: { Origin: 'https://example.invalid' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/clinic/patients`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/clinic/patients`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${origin}/api/clinic/callback`)).status, 404);
    assert.equal((await fetch(`${origin}/api/.env`)).status, 404);
  });
});
