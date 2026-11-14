import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartnerDiscovery, type PartnerObservation } from '../../shared/partner/discovery.ts';

const day = () => '2026-11-14';
function deferred<T>() { let resolve: (value: T) => void = () => {}; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test('initial failure and initial unpaired state both retry while foregrounded and discover remote pairing', async () => {
  for (const initial of ['failure', 'unpaired']) {
    let calls = 0; const accepted: PartnerObservation[] = [];
    const discovery = createPartnerDiscovery({ localDate: day,
      async fetch() { if (++calls === 1) { if (initial === 'failure') throw Error('offline'); return { paired: false, partnerUpToday: false }; } return { paired: true, partnerUpToday: true }; },
      accept: value => { accepted.push(value); },
    }, true);
    await discovery.refresh(); await discovery.refresh();
    assert.equal(calls, 2); assert.deepEqual(accepted.at(-1), { paired: true, partnerUpToday: true }); discovery.dispose();
  }
});

test('pair completion during an in-flight request forces a fresh request without overlapping requests', async () => {
  const first = deferred<PartnerObservation>(); const secondStarted = deferred<void>(); let calls = 0;
  const accepted: PartnerObservation[] = [];
  const discovery = createPartnerDiscovery({ localDate: day,
    fetch() { calls++; if (calls === 1) return first.promise; secondStarted.resolve(); return Promise.resolve({ paired: true, partnerUpToday: false }); },
    accept: value => { accepted.push(value); },
  }, true);
  const initial = discovery.refresh(); assert.equal(discovery.refresh(true), initial);
  await Promise.resolve(); assert.equal(calls, 1);
  first.resolve({ paired: false, partnerUpToday: false }); await initial; await secondStarted.promise;
  await discovery.refresh(); assert.equal(calls, 2); assert.equal(accepted.at(-1)?.paired, true); discovery.dispose();
});

test('background and disposal suppress requests and late results; foreground resumes discovery', async () => {
  const response = deferred<PartnerObservation>(); let calls = 0; let accepted = 0;
  const discovery = createPartnerDiscovery({ localDate: day,
    fetch: async () => { calls++; return response.promise; }, accept: () => { accepted++; },
  }, false);
  await discovery.refresh(); assert.equal(calls, 0);
  discovery.setForeground(true); await Promise.resolve(); assert.equal(calls, 1);
  discovery.dispose(); response.resolve({ paired: true, partnerUpToday: true });
  await discovery.refresh(); await Promise.resolve(); assert.equal(accepted, 0); assert.equal(calls, 1);
});

test('a hanging request is bounded and later foreground polling remains usable', async () => {
  let calls = 0; let firstSignal: AbortSignal | undefined; let accepted = 0;
  const discovery = createPartnerDiscovery({ localDate: day,
    fetch: (_date, signal) => { calls++; if (calls === 1) { firstSignal = signal; return new Promise<PartnerObservation>(() => {}); } return Promise.resolve({ paired: true, partnerUpToday: false }); },
    accept: () => { accepted++; },
  }, true, 10);
  await discovery.refresh(); assert.equal(firstSignal?.aborted, true);
  await discovery.refresh(); assert.equal(calls, 2); assert.equal(accepted, 1); discovery.dispose();
});

test('a response for the preceding local day cannot light today’s sun', async () => {
  let currentDay = '2026-11-14'; const response = deferred<PartnerObservation>(); const accepted: string[] = [];
  const discovery = createPartnerDiscovery({ localDate: () => currentDay, fetch: async () => response.promise, accept: (_value, date) => { accepted.push(date); } }, true);
  const request = discovery.refresh(); currentDay = '2026-11-15'; response.resolve({ paired: true, partnerUpToday: true }); await request;
  assert.deepEqual(accepted, []); await discovery.refresh(); assert.deepEqual(accepted, ['2026-11-15']); discovery.dispose();
});
