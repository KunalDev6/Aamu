import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const clinic = fileURLToPath(new URL('..', import.meta.url));
const flush = () => new Promise(resolve => setImmediate(resolve));

// Execute the shipped entry module with its real provider, polling and engine.
// This small DOM substitute checks startup/wiring, not browser layout or paint.
function page() {
  const nodes = new Map();
  const listeners = new Map();
  const classes = new Set();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      innerHTML: '', textContent: '', dataset: {}, disabled: false,
      addEventListener(type, handler) { listeners.set(`${selector}:${type}`, handler); },
      querySelector: () => null,
    });
    return nodes.get(selector);
  };
  return { node, listeners, classes,
    document: { hidden: false, activeElement: null, querySelector: node, querySelectorAll: () => [],
      documentElement: { classList: { add: value => classes.add(value) } },
      addEventListener(type, handler) { listeners.set(`document:${type}`, handler); } },
    window: { addEventListener(type, handler) { listeners.set(`window:${type}`, handler); } },
  };
}

test('built dashboard starts and refreshes a call request in ordinary and presenter views', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'aamu-clinic-startup-'));
  const globals = Object.fromEntries(['document', 'window', 'location', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    const built = spawnSync(process.execPath, ['scripts/build.mjs'], {
      cwd: clinic, encoding: 'utf8', env: { ...process.env, DEMO_MODE: 'true', CLINIC_OUT_DIR: folder },
    });
    assert.equal(built.status, 0, built.stderr);
    for (const search of ['', '?present=1']) {
      const dom = page();
      let calls = 0;
      let patients = [];
      Object.assign(globalThis, { document: dom.document, window: dom.window, location: { search },
        fetch: async url => {
          assert.equal(url, '/api/clinic/patients'); calls++;
          return { ok: true, json: async () => ({ demo: true, patients }) };
        } });
      try {
        await import(`${pathToFileURL(path.join(folder, 'app.js')).href}?view=${encodeURIComponent(search)}`);
        await flush();
        assert.match(dom.node('#app').innerHTML, /Morning overview/);
        assert.equal(dom.classes.has('presenting'), search === '?present=1');
        assert.match(dom.node('#people-list').innerHTML, /No clinic records/);
        assert.equal(calls, 1);

        patients = [{ id: 'synthetic-presenter', presenter: true, startedOn: '2026-11-14',
          mornings: [], lastClassified: null, callbackRequestedAt: 1794700000000 }];
        dom.listeners.get('#refresh:click')();
        await flush();
        assert.equal(calls, 2);
        assert.match(dom.node('#people-list').innerHTML, /Asked for a call/);
        assert.match(dom.node('#detail-panel').innerHTML, /Asked for a call/);
        assert.match(dom.node('#connection-status').textContent, /^Updated /);
      } finally { dom.listeners.get('window:pagehide')?.(); }
    }
  } finally {
    for (const [key, descriptor] of Object.entries(globals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await rm(folder, { recursive: true, force: true });
  }
});
