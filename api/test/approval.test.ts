import test from 'node:test';
import assert from 'node:assert/strict';
import { approveGoal, remoteGoalSnapshot, beginGoalCheck, finishGoalCheck, syncApprovedGoals } from '../../src/goals/approval.ts';
import type { LocalGoal, ApprovalPorts } from '../../src/goals/approval.ts';
import type { HintResult, ShrinkResult } from '../src/goals/service.ts';
import { createGoalClient } from '../../src/goals/client.ts';

const sample: LocalGoal = { id: 'opaque-id', goalText: 'Read more', steps: { tiny: 'Pick up a book.', small: 'Read five minutes.', full: 'Read twenty minutes.' }, localOnly: false, latestVerdict: 'ok', revision: 1, approved: true };
function harness(goal: LocalGoal = sample) {
  let goals = [structuredClone(goal)]; const events: string[] = []; const payloads: unknown[] = [];
  const ports: ApprovalPorts = {
    allGoals: () => goals,
    saveLocal: value => { events.push('save'); goals = goals.map(g => g.id === value.id ? value : g); },
    requestHints: async body => { events.push('hints'); payloads.push(body); return { status: 'ready', sizeHints: {} }; },
    syncGoals: async values => { events.push('sync'); payloads.push(values); },
    showHelp: () => { events.push('help'); },
  };
  return { ports, events, payloads };
}
test('edited approval saves immediately, requests hints once and preserves exact edited text', async () => {
  const h = harness(); let resolve: (value: HintResult) => void = () => { throw new Error('Uninitialized fixture'); };
  h.ports.requestHints = body => { h.events.push('hints'); h.payloads.push(body); return new Promise(r => { resolve = r; }); };
  const edited = { ...sample.steps, tiny: '  Open my book.  ' };
  const pending = approveGoal(sample, edited, true, h.ports);
  assert.deepEqual(h.events, ['save', 'hints']); assert.equal(h.ports.allGoals()[0].steps.tiny, edited.tiny);
  resolve({ status: 'ready', sizeHints: { tiny: { exceedsSlot: true, needsConcreteAction: false } } });
  assert.equal((await pending).status, 'approved_with_hints');
  assert.deepEqual(Object.keys(h.payloads[0] as object).sort(), ['goalText', 'steps']);
});
test('localOnly manual steps are saved on phone but never included in provider or sync payloads', async () => {
  const goal = { ...sample, localOnly: true, latestVerdict: 'needs_support' as const };
  const h = harness(goal); assert.equal((await approveGoal(goal, goal.steps, true, h.ports)).status, 'local_only');
  assert.deepEqual(h.events, ['save', 'sync']); assert.deepEqual(h.payloads, [[]]);
});
test('local phrase match in manual steps prevents saving and every request', async () => {
  const h = harness();
  assert.equal((await approveGoal(sample, { ...sample.steps, tiny: 'I intend to harm myself' }, true, h.ports)).status, 'blocked_manual_step');
  assert.deepEqual(h.events, []);
});
test('a post-approval safety block keeps edited text local, opens Help and omits the goal on next PUT', async () => {
  const h = harness(); h.ports.requestHints = async () => ({ status: 'needs_support' });
  const result = await approveGoal(sample, sample.steps, true, h.ports);
  assert.equal(result.status, 'needs_support');
  assert.equal(h.ports.allGoals()[0].localOnly, true); assert.deepEqual(h.events, ['save', 'save', 'help', 'sync']);
  assert.deepEqual(h.payloads, [[]]);
});
test('a technical hint failure leaves the approved text intact', async () => {
  const h = harness(); h.ports.requestHints = async () => { throw new Error('offline'); };
  assert.equal((await approveGoal(sample, sample.steps, true, h.ports)).status, 'approved_with_hints');
  assert.deepEqual(h.ports.allGoals()[0].steps, sample.steps); assert.equal(h.ports.allGoals()[0].localOnly, false);
});
test('unchanged generated steps are not judged again on approval', async () => {
  const h = harness(); await approveGoal(sample, sample.steps, false, h.ports); assert.deepEqual(h.events, ['save', 'sync']);
});
test('remote snapshots expose no private marker or local verdict/revision', () => {
  const output = remoteGoalSnapshot([sample, { ...sample, id: 'private', localOnly: true }]);
  assert.ok(output);
  assert.equal(output.length, 1); assert.deepEqual(Object.keys(output[0]).sort(), ['goalText', 'id', 'steps']);
});
test('overlapping approvals from the same captured goal cannot apply an older safety verdict to newer edits', async () => {
  const h = harness(); const pending: ((value: HintResult) => void)[] = [];
  h.ports.requestHints = () => new Promise(resolve => pending.push(resolve));
  const first = approveGoal(sample, sample.steps, true, h.ports);
  const newSteps = { ...sample.steps, tiny: 'Open another book.' };
  const second = approveGoal(sample, newSteps, true, h.ports);
  assert.equal(h.ports.allGoals()[0].revision, 3);
  pending[0]({ status: 'needs_support' }); assert.equal((await first).status, 'stale');
  assert.equal(h.events.includes('help'), false); assert.equal(h.ports.allGoals()[0].localOnly, false);
  pending[1]({ status: 'ready', sizeHints: {} }); assert.equal((await second).status, 'approved_with_hints');
  assert.deepEqual(h.ports.allGoals()[0].steps, newSteps);
});
test('mobile client blocks local phrase matches and private hints before all network calls', async () => {
  let calls = 0;
  const client = createGoalClient({ shrink: async () => { calls++; throw Error(); }, hints: async () => { calls++; throw Error(); } });
  assert.equal((await client.shrink('I intend to harm myself')).verdict, 'needs_support');
  await client.hints({ ...sample, localOnly: true });
  assert.equal(calls, 0);
});
test('mobile cancellation settles immediately and propagates to the single transport attempt', async () => {
  let transportSignal: AbortSignal | undefined; let calls = 0;
  const client = createGoalClient({
    shrink: (_body, signal) => { calls++; transportSignal = signal; return new Promise(() => {}); },
    hints: async () => ({ status: 'unavailable' }),
  });
  const controller = new AbortController();
  const pending = client.shrink('Read', controller.signal); controller.abort();
  assert.equal((await pending).source, 'fallback'); assert.equal(transportSignal?.aborted, true); assert.equal(calls, 1);
});
test('approval hint check settles at the 30-second client deadline without losing the saved steps', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(); let requestedSignal: AbortSignal | undefined;
  h.ports.requestHints = (_body, signal) => { requestedSignal = signal; return new Promise(() => {}); };
  const pending = approveGoal(sample, sample.steps, true, h.ports);
  t.mock.timers.tick(30_000);
  const result = await pending;
  assert.equal(result.status, 'approved_with_hints'); assert.equal(requestedSignal?.aborted, true);
  assert.deepEqual(h.ports.allGoals()[0].steps, sample.steps);
});

const cleanResult: ShrinkResult = { verdict: 'ok', source: 'model', judgeSource: 'decisions',
  steps: { tiny: 'Choose a different book.', small: 'Read ten minutes.', full: 'Read thirty minutes.' }, sizeHints: {} };
const failedResult: ShrinkResult = { verdict: null, source: 'fallback', steps: null, error: 'suggestions_unavailable' };
const supportResult: ShrinkResult = { verdict: 'needs_support', source: 'model', judgeSource: 'decisions', steps: null };

test('manual approval during a pending goal check stays local, then syncs the manual steps after a clean result', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-1', h.ports);
  const edited = { ...sample.steps, tiny: 'Open my own book.' };
  const pending = approveGoal(sample, edited, true, h.ports);
  assert.deepEqual(h.ports.allGoals()[0].steps, edited); // local save is immediate
  assert.equal((await pending).status, 'approved_deferred');
  assert.equal(h.events.includes('sync'), false);
  assert.equal(remoteGoalSnapshot(h.ports.allGoals()), null); // never an incomplete replacement list
  assert.equal(await finishGoalCheck(sample.id, 'check-1', cleanResult, h.ports), 'synced');
  assert.deepEqual(h.ports.allGoals()[0].steps, edited);
  assert.deepEqual(h.payloads.at(-1), [{ id: sample.id, goalText: sample.goalText, steps: edited }]);
});

test('a timed-out or failed original goal check releases the approved manual steps without a support flag', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-failure', h.ports);
  await approveGoal(sample, sample.steps, true, h.ports);
  assert.equal(await finishGoalCheck(sample.id, 'check-failure', failedResult, h.ports), 'synced');
  assert.equal(h.ports.allGoals()[0].localOnly, false); assert.equal(h.events.includes('help'), false);
  assert.deepEqual(h.payloads.at(-1), [{ id: sample.id, goalText: sample.goalText, steps: sample.steps }]);
});

test('late original needs_support keeps manual steps local and submits only the removal snapshot', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-support', h.ports);
  await approveGoal(sample, sample.steps, true, h.ports);
  assert.equal(h.events.includes('sync'), false);
  assert.equal(await finishGoalCheck(sample.id, 'check-support', supportResult, h.ports), 'needs_support');
  assert.equal(h.ports.allGoals()[0].localOnly, true); assert.deepEqual(h.ports.allGoals()[0].steps, sample.steps);
  assert.deepEqual(h.payloads.at(-1), []);
  assert.equal(await finishGoalCheck(sample.id, 'check-support', supportResult, h.ports), 'stale');
  assert.equal(h.events.filter(e => e === 'help').length, 1);
});

test('an old original request cannot classify a new request or a changed goal title', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'old', h.ports); beginGoalCheck(sample.id, 'new', h.ports);
  assert.equal(await finishGoalCheck(sample.id, 'old', supportResult, h.ports), 'stale');
  h.ports.saveLocal({ ...h.ports.allGoals()[0], goalText: 'A different goal' });
  assert.equal(await finishGoalCheck(sample.id, 'new', supportResult, h.ports), 'stale');
  assert.equal(h.events.includes('help'), false); assert.equal(h.events.includes('sync'), false);
});

test('a clean original check cannot bypass an outstanding approval-time hint check', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-1', h.ports);
  let resolveHint: (value: HintResult) => void = () => {};
  h.ports.requestHints = () => new Promise(resolve => { resolveHint = resolve; });
  const pending = approveGoal(sample, sample.steps, true, h.ports);
  assert.equal(await finishGoalCheck(sample.id, 'check-1', cleanResult, h.ports), 'deferred');
  assert.equal(h.events.includes('sync'), false);
  resolveHint({ status: 'ready', sizeHints: {} });
  assert.equal((await pending).status, 'approved_with_hints');
  assert.equal(h.events.filter(e => e === 'sync').length, 1);
});

test('a late clean hint cannot undo an original-check support verdict', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-1', h.ports);
  let resolveHint: (value: HintResult) => void = () => {};
  h.ports.requestHints = () => new Promise(resolve => { resolveHint = resolve; });
  const pending = approveGoal(sample, sample.steps, true, h.ports);
  await finishGoalCheck(sample.id, 'check-1', supportResult, h.ports);
  resolveHint({ status: 'ready', sizeHints: {} }); assert.equal((await pending).status, 'stale');
  assert.equal(h.ports.allGoals()[0].localOnly, true); assert.deepEqual(h.payloads.at(-1), []);
});

test('an original clean result cannot revoke a newer hint safety verdict', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'check-1', h.ports);
  h.ports.requestHints = async () => ({ status: 'needs_support' });
  await approveGoal(sample, sample.steps, true, h.ports);
  await finishGoalCheck(sample.id, 'check-1', cleanResult, h.ports);
  assert.equal(h.ports.allGoals()[0].latestVerdict, 'needs_support');
  assert.equal(h.ports.allGoals()[0].localOnly, true); assert.deepEqual(h.payloads.at(-1), []);
  assert.equal(h.ports.allGoals()[0].supportEvidence?.goalText, sample.goalText);
});

test('a late hint cannot classify a changed title even when its revision was not incremented', async () => {
  for (const hints of [{ status: 'needs_support' }, { status: 'ready', sizeHints: {} }] as HintResult[]) {
    const h = harness(); let resolveHint: (value: HintResult) => void = () => {};
    h.ports.requestHints = () => new Promise(resolve => { resolveHint = resolve; });
    const pending = approveGoal(sample, sample.steps, true, h.ports);
    const current = h.ports.allGoals()[0];
    h.ports.saveLocal({ ...current, goalText: 'A different reading goal' });
    resolveHint(hints);
    assert.equal((await pending).status, 'stale');
    assert.equal(h.ports.allGoals()[0].localOnly, false);
    assert.equal(h.ports.allGoals()[0].latestVerdict, 'ok');
    assert.equal(h.ports.allGoals()[0].hintCheckRevision, undefined);
    assert.equal(h.events.includes('help'), false);
    assert.equal(h.events.includes('sync'), false);
  }
});

test('a clean reworded check clears the original support evidence without replacing approved manual steps', async () => {
  for (const origin of ['goal', 'hint']) {
    const h = harness();
    if (origin === 'goal') {
      beginGoalCheck(sample.id, 'original', h.ports);
      await finishGoalCheck(sample.id, 'original', supportResult, h.ports);
    } else {
      h.ports.requestHints = async () => ({ status: 'needs_support' });
      await approveGoal(sample, sample.steps, true, h.ports);
    }
    const flagged = h.ports.allGoals()[0];
    assert.equal(flagged.supportEvidence?.goalText, sample.goalText);
    h.ports.saveLocal({ ...flagged, goalText: 'Read one short book' });
    beginGoalCheck(sample.id, 'reworded', h.ports);
    assert.equal(await finishGoalCheck(sample.id, 'reworded', cleanResult, h.ports), 'synced');
    const cleared = h.ports.allGoals()[0];
    assert.equal(cleared.localOnly, false);
    assert.equal(cleared.latestVerdict, 'ok');
    assert.equal(cleared.supportEvidence, undefined);
    assert.deepEqual(cleared.steps, sample.steps);
    assert.deepEqual(h.payloads.at(-1), [{ id: sample.id, goalText: cleared.goalText, steps: sample.steps }]);
  }
});

test('an unchanged flagged title or a failed reworded check cannot clear localOnly', async () => {
  for (const reworded of [false, true]) {
    const h = harness(); beginGoalCheck(sample.id, 'original', h.ports);
    await finishGoalCheck(sample.id, 'original', supportResult, h.ports);
    if (reworded) h.ports.saveLocal({ ...h.ports.allGoals()[0], goalText: 'Read one short book' });
    beginGoalCheck(sample.id, 'recheck', h.ports);
    await finishGoalCheck(sample.id, 'recheck', reworded ? failedResult : cleanResult, h.ports);
    assert.equal(h.ports.allGoals()[0].localOnly, true);
    assert.equal(h.ports.allGoals()[0].latestVerdict, 'needs_support');
    assert.deepEqual(h.payloads.at(-1), []);
  }
});

test('a claimed clean result does not release reworded text that still matches the local phrase list', async () => {
  const h = harness(); beginGoalCheck(sample.id, 'original', h.ports);
  await finishGoalCheck(sample.id, 'original', supportResult, h.ports);
  h.ports.saveLocal({ ...h.ports.allGoals()[0], goalText: 'I intend to harm myself' });
  beginGoalCheck(sample.id, 'reworded', h.ports);
  await finishGoalCheck(sample.id, 'reworded', cleanResult, h.ports);
  assert.equal(h.ports.allGoals()[0].localOnly, true);
  assert.deepEqual(h.payloads.at(-1), []);
});

test('completed hint results remain available while an original goal check defers remote sync', async () => {
  for (const hints of [
    { status: 'ready', sizeHints: { tiny: { exceedsSlot: true, needsConcreteAction: false } } },
    { status: 'unavailable' },
  ] as HintResult[]) {
    const h = harness(); beginGoalCheck(sample.id, 'pending', h.ports);
    h.ports.requestHints = async () => hints;
    const approved = await approveGoal(sample, sample.steps, true, h.ports);
    assert.equal(approved.status, 'approved_deferred');
    if (approved.status === 'approved_deferred') assert.deepEqual(approved.hints, hints);
    assert.equal(h.events.includes('sync'), false);
    assert.equal(await finishGoalCheck(sample.id, 'pending', cleanResult, h.ports), 'synced');
    assert.equal(h.ports.allGoals()[0].approved, true);
  }
});

test('a pending approved goal defers the whole replacement PUT; unapproved drafts are not uploaded', () => {
  const pending: LocalGoal = { ...sample, goalCheck: { requestId: 'pending', state: 'pending', goalText: sample.goalText } };
  assert.equal(remoteGoalSnapshot([pending, { ...sample, id: 'other' }]), null);
  assert.deepEqual(remoteGoalSnapshot([{ ...pending, approved: false }, { ...sample, id: 'other' }]), [
    { id: 'other', goalText: sample.goalText, steps: sample.steps },
  ]);
});

test('replacement PUTs are serialized so an older save cannot finish after the privacy removal', async () => {
  const h = harness(); const sent: unknown[] = [];
  let release: () => void = () => {}; let started: () => void = () => {};
  const firstStarted = new Promise<void>(resolve => { started = resolve; });
  h.ports.syncGoals = values => {
    sent.push(values);
    if (sent.length === 1) { started(); return new Promise<void>(resolve => { release = resolve; }); }
    return Promise.resolve();
  };
  const older = syncApprovedGoals(h.ports); await firstStarted;
  beginGoalCheck(sample.id, 'privacy', h.ports);
  const removal = finishGoalCheck(sample.id, 'privacy', supportResult, h.ports);
  await Promise.resolve(); assert.equal(sent.length, 1);
  release(); await older; await removal;
  assert.equal(sent.length, 2); assert.deepEqual(sent[1], []);
});
