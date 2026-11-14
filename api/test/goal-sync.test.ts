import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoalSynchronizer, markGoalSyncPending, recoverInterruptedGoalSync, type GoalSyncRequest, type GoalSyncResponse, type GoalSyncState } from '../../src/goals/sync.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';

const publicGoal = (): LocalGoal => ({ id: 'opaque-goal', goalText: 'Read',
  steps: { tiny: 'Open a book.', small: 'Read a page.', full: 'Read a chapter.' },
  localOnly: false, latestVerdict: 'ok', revision: 1, approved: true });
function localStore(initial: GoalSyncState = markGoalSyncPending({ goals: [publicGoal()] })) {
  let state = initial; let persisted = JSON.stringify(initial);
  return { read: () => state, persisted: () => persisted,
    update(change: (value: GoalSyncState) => GoalSyncState) { state = change(state); persisted = JSON.stringify(state); },
    makePrivate() { this.update(current => markGoalSyncPending({ ...current, goals: current.goals.map(goal => ({ ...goal, localOnly: true, latestVerdict: 'needs_support' })) })); },
  };
}
function server(initialRevision = 0) {
  let revision = initialRevision;
  let goals: GoalSyncRequest['goals'] = [];
  const requests: GoalSyncRequest[] = [];
  return { getRevision: async () => revision, goals: () => goals, requests,
    async put(value: GoalSyncRequest): Promise<GoalSyncResponse> {
      requests.push(structuredClone(value));
      if (value.baseRevision !== revision || value.revision <= revision) return { status: 'conflict', revision };
      goals = structuredClone(value.goals); revision = value.revision;
      return { status: 'applied', revision };
    },
  };
}
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

test('offline private omission persists and retries after reconstructing the local store', async () => {
  const remote = server(); const first = localStore();
  await createGoalSynchronizer({ ...first, ...remote }).flush();
  assert.equal(remote.goals().length, 1);
  first.makePrivate();
  const offline = createGoalSynchronizer({ ...first, getRevision: async () => { throw Error('offline'); }, put: remote.put });
  assert.equal(await offline.flush(), 'pending');
  const restarted = localStore(JSON.parse(first.persisted()) as GoalSyncState);
  assert.equal(restarted.read().goalSync?.pending, true);
  assert.equal(await createGoalSynchronizer({ ...restarted, ...remote }).flush(), 'synced');
  assert.deepEqual(remote.goals(), []);
  assert.equal(restarted.read().goalSync?.pending, false);
  assert.equal(restarted.read().goalSync?.acknowledgedRevision, 2);
  assert.deepEqual(Object.keys(remote.requests.at(-1)!).sort(), ['baseRevision', 'goals', 'revision']);
  assert.doesNotMatch(JSON.stringify(remote.requests.at(-1)), /localOnly|needs_support|opaque-goal|Read/);
});

test('older local metadata requires a fresh accepted snapshot before it can authorize morning text', async () => {
  const old: GoalSyncState = { goals: [publicGoal()], goalSync: { generation: 1, pending: false, lastAllocatedRevision: 7 } };
  const recovered = recoverInterruptedGoalSync(old);
  assert.equal(recovered.goalSync?.pending, true);
  assert.equal(recovered.goalSync?.acknowledgedRevision, undefined);
  const store = localStore(recovered); const remote = server(9);
  assert.equal(await createGoalSynchronizer({ ...store, ...remote }).flush(), 'synced');
  assert.equal(store.read().goalSync?.acknowledgedRevision, 10);
});

test('pending original and hint checks defer the entire snapshot without a network request', async () => {
  for (const pending of [{ goalCheck: { requestId: 'check', goalText: 'Read', state: 'pending' as const } }, { hintCheckRevision: 1 }]) {
    const store = localStore(markGoalSyncPending({ goals: [{ ...publicGoal(), ...pending }] })); let reads = 0;
    const remote = server();
    const sync = createGoalSynchronizer({ ...store, ...remote, getRevision: async () => { reads++; return 0; } });
    assert.equal(await sync.flush(), 'deferred'); assert.equal(reads, 0); assert.equal(remote.requests.length, 0);
    store.update(state => markGoalSyncPending({ ...state, goals: state.goals.map(goal => ({ ...goal, goalCheck: undefined, hintCheckRevision: undefined })) }));
    assert.equal(await sync.flush(), 'synced'); assert.equal(remote.goals().length, 1);
  }
});

test('restart recovery releases an orphaned check without losing private omission or approved text', async () => {
  const waiting = { ...publicGoal(), id: 'waiting', goalCheck: { requestId: 'lost', goalText: 'Read', state: 'pending' as const }, hintCheckRevision: 1 };
  const privateGoal = { ...publicGoal(), localOnly: true, latestVerdict: 'needs_support' as const };
  const original = markGoalSyncPending({ goals: [privateGoal, waiting] });
  const recovered = recoverInterruptedGoalSync(JSON.parse(JSON.stringify(original)) as GoalSyncState);
  assert.equal(recovered.goals[0].localOnly, true); assert.equal(recovered.goals[0].latestVerdict, 'needs_support');
  assert.equal(recovered.goals[1].goalCheck?.state, 'complete'); assert.equal(recovered.goals[1].hintCheckRevision, undefined);
  assert.deepEqual(recovered.goals[1].steps, waiting.steps);
  const store = localStore(recovered); const remote = server();
  assert.equal(await createGoalSynchronizer({ ...store, ...remote }).flush(), 'synced');
  assert.deepEqual(remote.goals().map(goal => goal.id), ['waiting']);
  assert.equal(recoverInterruptedGoalSync(store.read()), store.read());
});

test('privacy changes during the revision read are projected afresh before any PUT', async () => {
  const store = localStore(); const remote = server(); const revision = deferred<number>(); const started = deferred<void>();
  const sync = createGoalSynchronizer({ ...store, ...remote, getRevision: () => { started.resolve(); return revision.promise; } });
  const flushing = sync.flush(); await started.promise; store.makePrivate(); revision.resolve(0);
  assert.equal(await flushing, 'synced'); assert.deepEqual(remote.requests[0].goals, []);
  assert.equal(remote.requests.length, 1); assert.equal(store.read().goalSync?.pending, false);
});

test('a timed-out old PUT cannot restore text after the newer private omission commits', async () => {
  const store = localStore(); const remote = server(); const release = deferred<void>(); const started = deferred<void>();
  let oldSignal: AbortSignal | undefined; let delayedResult: Promise<GoalSyncResponse> | undefined;
  const sync = createGoalSynchronizer({ ...store, getRevision: remote.getRevision,
    put(value, signal) {
      if (value.revision === 1) {
        oldSignal = signal; started.resolve();
        delayedResult = release.promise.then(() => remote.put(value));
        return delayedResult;
      }
      return remote.put(value);
    },
  }, 10);
  const flushing = sync.flush(); await started.promise; store.makePrivate();
  assert.equal(await flushing, 'synced'); assert.equal(oldSignal?.aborted, true);
  assert.deepEqual(remote.goals(), []); assert.equal(await remote.getRevision(), 2);
  release.resolve(); assert.deepEqual(await delayedResult, { status: 'conflict', revision: 2 });
  assert.deepEqual(remote.goals(), []); assert.equal(store.read().goalSync?.pending, false);
});

test('a restored token learns the server floor and persists its new revision before sending', async () => {
  const store = localStore(); const remote = server(17);
  const sync = createGoalSynchronizer({ ...store, getRevision: remote.getRevision,
    async put(value) {
      const saved = JSON.parse(store.persisted()) as GoalSyncState;
      assert.equal(saved.goalSync?.lastAllocatedRevision, 18); assert.equal(saved.goalSync?.pending, true);
      assert.equal(value.baseRevision, 17); assert.equal(value.revision, 18);
      return remote.put(value);
    },
  });
  assert.equal(await sync.flush(), 'synced'); assert.equal(await remote.getRevision(), 18);
});

test('conflicts refetch the revision and never send drafts, unapproved goals, or private metadata', async () => {
  const draft = { ...publicGoal(), id: 'unapproved', approved: false };
  const store = localStore(markGoalSyncPending({ goals: [{ ...publicGoal(), editorDraft: { title: 'A different unsaved title' } } as LocalGoal, draft] }));
  const remote = server(); let conflicted = false;
  const sync = createGoalSynchronizer({ ...store, getRevision: remote.getRevision,
    async put(value) {
      if (!conflicted) { conflicted = true; await remote.put({ goals: [], revision: 4, baseRevision: 0 }); }
      return remote.put(value);
    },
  });
  assert.equal(await sync.flush(), 'synced');
  const last = remote.requests.at(-1)!;
  assert.equal(last.baseRevision, 4); assert.equal(last.revision, 5);
  assert.deepEqual(last.goals, [{ id: 'opaque-goal', goalText: 'Read', steps: publicGoal().steps }]);
  assert.doesNotMatch(JSON.stringify(last), /unapproved|editorDraft|unsaved|localOnly|latestVerdict|goalCheck/);
});

test('an older acknowledgement cannot clear a newer pending privacy generation', async () => {
  const store = localStore(); const remote = server(); const acknowledged = deferred<void>(); const started = deferred<void>();
  let calls = 0;
  const sync = createGoalSynchronizer({ ...store, getRevision: remote.getRevision,
    async put(value) {
      calls++;
      if (calls === 1) { const result = await remote.put(value); started.resolve(); await acknowledged.promise; return result; }
      assert.equal(store.read().goalSync?.pending, true);
      return remote.put(value);
    },
  });
  const first = sync.flush(); await started.promise;
  store.makePrivate(); const second = sync.flush(); assert.equal(first, second);
  acknowledged.resolve(); assert.equal(await second, 'synced'); assert.equal(calls, 2);
  assert.deepEqual(remote.goals(), []); assert.equal(store.read().goalSync?.pending, false);
});

test('an unchanged failed PUT remains pending and the bounded queue permits a later retry', async () => {
  const store = localStore(); const remote = server(); let unavailable = true; let signal: AbortSignal | undefined;
  const sync = createGoalSynchronizer({ ...store, getRevision: remote.getRevision,
    put(value, currentSignal) { signal = currentSignal; return unavailable ? new Promise<GoalSyncResponse>(() => {}) : remote.put(value); },
  }, 10);
  assert.equal(await sync.flush(), 'pending'); assert.equal(signal?.aborted, true); assert.equal(store.read().goalSync?.pending, true);
  unavailable = false; assert.equal(await sync.flush(), 'synced'); assert.equal(store.read().goalSync?.pending, false);
});
