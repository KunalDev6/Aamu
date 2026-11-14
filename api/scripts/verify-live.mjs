// Explicit live integration check. Synthetic records only; credentials and tokens
// stay in memory or the owner-readable checkpoint, never in the report.
import assert from 'node:assert/strict';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import WebSocket from 'ws';
import { readRuntimeConfig } from '../src/runtime/config.ts';

const base = process.env.VERIFY_API_URL ?? 'http://127.0.0.1:3000';
const checkpoint = '/tmp/aamu-live-check.json';
const report = new URL('../../review/live-integration.json', import.meta.url);
const config = await readRuntimeConfig(process.env);
const pool = new Pool({ connectionString: config.databaseUrl, ssl: { rejectUnauthorized: true, ca: config.databaseCa }, connectionTimeoutMillis: 5000 });
const redis = new Redis(config.valkeyUrl, { lazyConnect: true, connectTimeout: 5000, retryStrategy: () => null, tls: { rejectUnauthorized: true, ca: config.valkeyCa } });
redis.on('error', () => {});
let stage = 'health'; let socket; const checks = []; let identities = [];
async function call(method, path, identity, body) {
  const res = await fetch(base + path, { method, headers: { ...(identity ? { Authorization: `Bearer ${identity.token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  return { status: res.status, body: await res.json() };
}
function pass(name) { checks.push(name); console.log('PASS', name); }
async function cleanup() {
  const ids = identities.map(item => item.userId);
  if (!ids.length) return;
  // Only this check's synthetic identities and their dependent rows are removed.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['aamu_goals', 'aamu_mornings', 'aamu_wakes']) await client.query(`DELETE FROM ${table} WHERE user_id = ANY($1::uuid[])`, [ids]);
    await client.query('UPDATE aamu_users SET partner_id = NULL WHERE id = ANY($1::uuid[])', [ids]);
    await client.query('DELETE FROM aamu_users WHERE id = ANY($1::uuid[])', [ids]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
try {
  assert.equal((await call('GET', '/health')).body.ok, true); pass('verified PostgreSQL and Valkey health');
  if (process.argv.includes('--resume')) {
    const saved = JSON.parse(await readFile(checkpoint, 'utf8')); identities = saved.identities;
    for (const identity of identities) {
      const state = await call('GET', `/partner?localDate=${saved.date}`, identity);
      assert.equal(state.body.paired, true);
    }
    pass('pair survives API process restart with the same tokens');
    await cleanup(); await rm(checkpoint);
    const prior = JSON.parse(await readFile(report, 'utf8'));
    await writeFile(report, JSON.stringify({ ...prior, restartedAt: new Date().toISOString(), restartCheckTransport: base.startsWith('https:') ? 'public HTTPS/WSS' : 'localhost', checks: [...prior.checks, ...checks], syntheticRowsRemoved: true }, null, 2) + '\n');
  } else {
    stage = 'identity and pairing';
    for (let i = 0; i < 2; i++) { const identity = await call('POST', '/users', null, {}); assert.equal(identity.status, 201); identities.push(identity.body); }
    const [a, b] = identities;
    assert.equal((await call('GET', '/partner?localDate=2026-11-14')).status, 401);
    const codeResult = await call('POST', '/partner/match', a, { mode: 'code' }); assert.equal(codeResult.status, 200);
    await redis.connect();
    assert.equal(await redis.ttl(`aamu:pair-code:${codeResult.body.code}`), -1); pass('unused pairing code has no expiry');
    assert.equal((await call('POST', '/partner/match', b, { mode: 'code', code: codeResult.body.code })).body.paired, true);
    assert.equal(await redis.exists(`aamu:pair-code:${codeResult.body.code}`), 0);
    assert.equal((await call('POST', '/partner/match', b, { mode: 'code', code: codeResult.body.code })).status, 400); pass('real code pairs once and is consumed');
    stage = 'WebSocket and polling';
    const date = '2026-11-14';
    socket = new WebSocket(base.replace(/^http/, 'ws') + '/live', { headers: { Authorization: `Bearer ${b.token}` }, handshakeTimeout: 10000 });
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const messages = []; socket.on('message', data => messages.push(JSON.parse(String(data))));
    const received = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('wake timeout')), 10000); socket.once('message', () => { clearTimeout(timer); resolve(); }); });
    const wake = { localDate: date, upAt: Date.now(), utcOffsetMinutes: 120 };
    assert.equal((await call('POST', '/partner/up', a, wake)).status, 200); await received;
    assert.deepEqual(messages[0], { type: 'partner_up', localDate: date });
    assert.equal((await call('POST', '/partner/up', a, wake)).status, 200);
    await new Promise(resolve => setTimeout(resolve, 200)); assert.equal(messages.length, 1); pass('public wake WebSocket delivers one idempotent event');
    socket.close(); socket = null;
    assert.equal((await call('POST', '/partner/up', b, wake)).status, 200);
    assert.equal((await call('GET', `/partner?localDate=${date}`, a)).body.partnerUpToday, true); pass('polling retrieves wake with WebSocket disconnected');
    stage = 'privacy redaction';
    const goal = { id: 'synthetic-goal', goalText: 'Read a little each morning', steps: { tiny: 'Read one sentence', small: 'Read two pages', full: 'Read for twenty minutes' } };
    assert.equal((await call('PUT', '/goals', a, { goals: [goal], revision: 1, baseRevision: 0 })).status, 200);
    const morning = { scheduledAt: Date.now(), firstRingAt: Date.now(), upAt: Date.now(), minutesToUp: 1, minutesBeforeAlarm: null, snoozeCount: 0,
      voiceState: 'unavailable', speechShare: null, speechOnsetMs: null, stepSize: 'small', stepDone: true, stepOffered: true, stepRemoved: false,
      utcOffsetMinutes: 120, level: 'easy', goalId: goal.id, stepText: goal.steps.small, goalSnapshotRevision: 1 };
    assert.equal((await call('PUT', `/mornings/${date}`, a, morning)).status, 200);
    assert.equal((await pool.query('SELECT step_text FROM aamu_mornings WHERE user_id = $1', [a.userId])).rows[0].step_text, goal.steps.small);
    assert.equal((await call('PUT', '/goals', a, { goals: [], revision: 2, baseRevision: 1 })).status, 200);
    assert.equal((await call('PUT', '/goals', a, { goals: [goal], revision: 3, baseRevision: 0 })).status, 409);
    assert.equal((await call('PUT', `/mornings/${date}`, a, morning)).status, 200);
    const rows = await pool.query('SELECT step_text, data FROM aamu_mornings WHERE user_id = $1', [a.userId]);
    assert.equal(rows.rows[0].step_text, null); assert.equal(rows.rows[0].data.stepDone, true);
    assert.equal((await pool.query('SELECT id FROM aamu_goals WHERE user_id = $1', [a.userId])).rowCount, 0);
    pass('redaction survives stale goal and morning uploads');
    const cleanGoal = { ...goal, goalText: 'Read quietly each morning', steps: { ...goal.steps, small: 'Read one page quietly' } };
    assert.equal((await call('PUT', '/goals', a, { goals: [cleanGoal], revision: 3, baseRevision: 2 })).status, 200);
    assert.equal((await call('PUT', `/mornings/${date}`, a, morning)).status, 200);
    assert.equal((await pool.query('SELECT step_text FROM aamu_mornings WHERE user_id = $1', [a.userId])).rows[0].step_text, null);
    const fresh = await call('PUT', `/mornings/${date}`, a, { ...morning, stepText: cleanGoal.steps.small, goalSnapshotRevision: 3 });
    assert.equal(fresh.status, 200); assert.equal(fresh.body.goalSnapshotRevision, 3);
    const currentRows = await pool.query('SELECT step_text, data FROM aamu_mornings WHERE user_id = $1', [a.userId]);
    assert.equal(currentRows.rows[0].step_text, cleanGoal.steps.small); assert.equal(currentRows.rows[0].data.stepDone, true);
    assert.equal('goalSnapshotRevision' in currentRows.rows[0].data, false);
    pass('erase then clean re-add rejects stale morning text and accepts current snapshot text');
    await writeFile(checkpoint, JSON.stringify({ identities, date }), { mode: 0o600 });
    await writeFile(report, JSON.stringify({ checkedAt: new Date().toISOString(), transport: base.startsWith('https:') ? 'public HTTPS/WSS' : 'localhost', checks,
      physicalPhonesTested: false, syntheticRowsRemoved: false }, null, 2) + '\n');
    console.log('Restart the API, then run --resume to check persistence and remove synthetic rows.');
  }
} catch (error) {
  console.error('FAIL', stage, error.code ?? error.name); process.exitCode = 1;
} finally { socket?.close(); redis.disconnect(); await pool.end(); }
