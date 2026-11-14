import test from 'node:test';
import assert from 'node:assert/strict';
import { createClinicProvider, parseClinicPayload, prioritizeCallRequests } from '../provider.mjs';
import { createClinicPolling } from '../polling.mjs';
import { clinicDemoMode } from '../scripts/mode.mjs';

const record = (id = 'presenter', callbackRequestedAt = null) => ({ id, presenter: true,
  startedOn: '2026-11-14', mornings: [], lastClassified: null, callbackRequestedAt });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('one demo flag defaults on; false disables it and the old flag has no authority', () => {
  assert.equal(clinicDemoMode({}), true);
  assert.equal(clinicDemoMode({ DEMO_MODE: 'false', CLINIC_DEMO: '1' }), false);
  assert.equal(clinicDemoMode({ CLINIC_DEMO: '0' }), true);
  assert.throws(() => clinicDemoMode({ DEMO_MODE: 'perhaps' }));
});

test('disabled provider is empty and performs no request', async () => {
  let called = false;
  const load = createClinicProvider({ demoEnabled: false, fetchImpl() { called = true; } });
  assert.deepEqual(await load(), { demo: false, patients: [] });
  assert.equal(called, false);
});

test('provider makes one same-origin request without a browser credential', async () => {
  const payload = { demo: true, patients: [record()] };
  const load = createClinicProvider({ demoEnabled: true, fetchImpl: async (url, options) => {
    assert.equal(url, '/api/clinic/patients');
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => payload };
  } });
  assert.deepEqual(await load(), payload);
});

test('contract strips unrelated fields and keeps an empty valid feed empty', () => {
  const input = record(); input.goalText = 'must not cross this interface'; input.token = 'synthetic';
  assert.deepEqual(parseClinicPayload({ demo: true, patients: [input], secret: 'synthetic' }), { demo: true, patients: [record()] });
  assert.deepEqual(parseClinicPayload({ demo: true, patients: [] }), { demo: true, patients: [] });
});

test('malformed callback, date, level and duplicate rows fail rather than becoming healthy records', () => {
  for (const value of [undefined, -1, Infinity, '1794672000000', 1e100]) {
    assert.throws(() => parseClinicPayload({ demo: true, patients: [{ ...record(), callbackRequestedAt: value }] }));
  }
  assert.throws(() => parseClinicPayload({ demo: true, patients: [record(), record()] }));
  assert.throws(() => parseClinicPayload({ demo: true, patients: [{ ...record(), startedOn: '2026-02-30' }] }));
  assert.throws(() => parseClinicPayload({ demo: true, patients: [{ ...record(), mornings: [{ localDate: '2026-11-14', level: 'unknown', upAt: null, stepDone: null }] }] }));
});

test('persistent call requests sort above every pattern without replacing status or tie order', () => {
  const rows = [{ id: 'call-pattern', status: 'might_need_call' }, { id: 'request-a', status: 'drifting' },
    { id: 'insufficient', status: 'insufficient' }, { id: 'request-b', status: 'steady' }];
  const records = rows.map(row => record(row.id, row.id.startsWith('request') ? 0 : null));
  const result = prioritizeCallRequests(rows, records);
  assert.deepEqual(result.map(row => row.id), ['request-a', 'request-b', 'call-pattern', 'insufficient']);
  assert.equal(result[1].status, 'steady');
  assert.deepEqual(rows.map(row => row.id), ['call-pattern', 'request-a', 'insufficient', 'request-b']);
});

test('polling waits five seconds after each result and never overlaps requests', async () => {
  const timers = new Map(); let next = 0; let calls = 0; let delivered = 0; let resolve;
  const polling = createClinicPolling({
    load: () => { calls += 1; return new Promise(done => { resolve = done; }); },
    onData: () => { delivered += 1; }, onError: () => assert.fail('unexpected error'),
    setTimer: (callback, delay) => { assert.equal(delay, 5000); timers.set(++next, callback); return next; },
    clearTimer: id => timers.delete(id),
  });
  const first = polling.refresh(); const duplicate = polling.refresh(); await flush();
  assert.equal(calls, 1); assert.equal(first, duplicate); assert.equal(timers.size, 0);
  resolve({ demo: true, patients: [] }); await first;
  assert.equal(delivered, 1); assert.equal(timers.size, 1);
  const tick = [...timers.values()][0]; timers.clear(); tick(); await flush();
  assert.equal(calls, 2); polling.dispose(); resolve({ demo: true, patients: [] }); await flush();
  assert.equal(delivered, 1);
});

test('hidden pages abort work, ignore late results and refresh immediately on foreground', async () => {
  const pending = []; const received = []; let timers = 0;
  const polling = createClinicPolling({ visible: false,
    load: signal => new Promise(resolve => pending.push({ signal, resolve })), onData: data => received.push(data),
    onError: () => assert.fail('abort is not a refresh failure'), setTimer: () => ++timers, clearTimer: () => {},
  });
  await polling.refresh(); assert.equal(pending.length, 0);
  polling.setVisible(true); await flush(); assert.equal(pending.length, 1);
  polling.setVisible(false); assert.equal(pending[0].signal.aborted, true);
  polling.setVisible(true); await flush(); assert.equal(pending.length, 2);
  pending[0].resolve('stale'); pending[1].resolve('fresh'); await flush();
  assert.deepEqual(received, ['fresh']); assert.equal(timers, 1); polling.dispose();
});

test('manual refresh clears the waiting timer and failure keeps retrying only while visible', async () => {
  const timers = new Map(); let id = 0; let calls = 0; let errors = 0;
  const polling = createClinicPolling({ load: async () => { calls += 1; throw Error('synthetic'); },
    onData: () => assert.fail('failed request supplied data'), onError: () => { errors += 1; },
    setTimer: callback => { timers.set(++id, callback); return id; }, clearTimer: key => timers.delete(key),
  });
  await polling.refresh(); assert.equal(timers.size, 1);
  await polling.refresh(); assert.equal(calls, 2); assert.equal(errors, 2); assert.equal(timers.size, 1);
  polling.setVisible(false); assert.equal(timers.size, 0); await polling.refresh(); assert.equal(calls, 2);
  polling.dispose();
});
