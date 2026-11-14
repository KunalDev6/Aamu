import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteGoal, nextGoalAfterDeletion, reconcileGoalCounts, reorderGoals, type GoalCounts, type GoalSettingsState } from '../../src/goals/settings.ts';
import { remoteGoalSnapshot, type LocalGoal } from '../../src/goals/approval.ts';

const goal = (id: string, localOnly = false): LocalGoal => ({ id, goalText: `Goal ${id}`,
  steps: { tiny: 'Open a book.', small: 'Read a page.', full: 'Read a chapter.' },
  approved: true, revision: 1, localOnly, latestVerdict: localOnly ? 'needs_support' : 'ok' });
type Fixture = GoalSettingsState & { mornings: NonNullable<GoalSettingsState['mornings']>; goalCounts: Record<string, GoalCounts> };
const fixture = (): Fixture => ({ goals: [goal('A'), goal('B', true), goal('C')], rotationGoalId: 'B',
  mornings: [{ localDate: '2026-11-13', goalId: 'A', stepOffered: true, stepDone: true, stepSize: 'small' }],
  goalCounts: { A: { offered: 1, done: 1, removed: 0 } } });

test('moving goals preserves the pointed identity, all history and local-only contents', () => {
  const before = fixture(); const after = reorderGoals(before, ['C', 'A', 'B']);
  assert.deepEqual(after.goals.map(item => item.id), ['C', 'A', 'B']); assert.equal(after.rotationGoalId, 'B');
  assert.equal(after.goals[2], before.goals[1]); assert.equal(after.goals[2].localOnly, true);
  assert.equal(after.mornings, before.mornings); assert.equal(after.goalCounts, before.goalCounts);
  assert.deepEqual(remoteGoalSnapshot(after.goals)?.map(item => item.id), ['C', 'A']);
});

test('invalid or unchanged reorder is a no-op and never drops or duplicates a goal', () => {
  const before = fixture();
  for (const ids of [['A', 'B', 'C'], ['A', 'C'], ['A', 'A', 'C'], ['A', 'B', 'unknown']]) assert.equal(reorderGoals(before, ids), before);
});

test('deleting a non-pointed goal preserves pointer and history and persists a fresh redaction generation', () => {
  const before = { ...fixture(), goalSync: { generation: 4, pending: false, lastAllocatedRevision: 9 } };
  const after = deleteGoal(before, 'A', null);
  assert.deepEqual(after.goals.map(item => item.id), ['B', 'C']); assert.equal(after.rotationGoalId, 'B');
  assert.equal(after.mornings, before.mornings); assert.equal(after.goalCounts, before.goalCounts);
  assert.deepEqual(after.goalSync, { generation: 5, pending: true, lastAllocatedRevision: 9 });
  assert.deepEqual(remoteGoalSnapshot(after.goals)?.map(item => item.id), ['C']);
  assert.equal(deleteGoal(after, 'A', null), after);
});

test('deleting pointed B with the confirmed explicit successor C retains C instead of its prior array index', () => {
  const before = fixture(); const after = deleteGoal(before, 'B', 'C');
  assert.equal(after.rotationGoalId, 'C'); assert.deepEqual(after.goals.map(item => item.id), ['A', 'C']);
  assert.equal(after.mornings, before.mornings);
  assert.equal(deleteGoal(before, 'B', 'missing'), before);
});

test('deletion follows the pre-delete circular order, skips drafts, and permits no surviving goals', () => {
  const before = { ...fixture(), rotationGoalId: 'C' };
  assert.equal(nextGoalAfterDeletion(before, 'C'), 'A');
  assert.equal(deleteGoal(before, 'C').rotationGoalId, 'A');
  const withDraft = { ...before, goals: [goal('A'), { ...goal('draft'), approved: false }, goal('C')], rotationGoalId: 'A' };
  assert.equal(deleteGoal(withDraft, 'A').rotationGoalId, 'C');
  const only = { ...before, goals: [goal('C')], rotationGoalId: 'C' };
  const empty = deleteGoal(only, 'C');
  assert.deepEqual(empty.goals, []); assert.equal(empty.rotationGoalId, null); assert.equal(empty.mornings, before.mornings);
  assert.equal(empty.goalSync?.pending, true);
});

test('deleting today’s offered goal preserves its exact text, ladder, identity and outcome without a new offer', () => {
  const now = Date.parse('2026-11-14T09:00:00Z');
  const offered = { localDate: '2026-11-14', goalId: 'A', stepOffered: true, stepSize: 'small',
    stepText: 'My edited page step.', stepDone: true, stepRemoved: false, utcOffsetMinutes: 120 };
  const before: Fixture = { ...fixture(), mornings: [offered] };
  const after = deleteGoal(before, 'A', undefined, now);
  assert.equal(after.mornings[0].stepText, offered.stepText);
  assert.deepEqual(after.mornings[0].stepLadder, goal('A').steps);
  assert.equal(after.mornings[0].stepDone, true); assert.equal(after.mornings[0].stepOffered, true);
  assert.equal(after.mornings[0].goalId, 'A'); assert.equal(after.rotationGoalId, 'B');
  assert.equal(remoteGoalSnapshot(after.goals)?.some(item => item.id === 'A'), false);
});

test('deletion uses the recorded morning offset and retains a previously captured ladder', () => {
  const now = Date.parse('2026-11-13T23:30:00Z');
  const captured = { tiny: 'Saved tiny.', small: 'Saved small.', full: 'Saved full.' };
  const morning = { localDate: '2026-11-14', goalId: 'A', stepOffered: true, stepSize: 'small',
    stepText: 'Saved small.', stepLadder: captured, utcOffsetMinutes: 120 };
  const before = { ...fixture(), mornings: [morning] };
  assert.equal(deleteGoal(before, 'A', undefined, now).mornings[0].stepLadder, captured);
  const noSnapshot = { ...before, mornings: [{ ...morning, stepLadder: undefined }] };
  assert.deepEqual(deleteGoal(noSnapshot, 'A', undefined, now).mornings[0].stepLadder, goal('A').steps);
});

test('counts use one offered/removed outcome per date, include private goals, and ignore no-offer days', () => {
  const day = { localDate: '2026-11-14', goalId: 'B', stepOffered: true, stepDone: null, stepRemoved: true };
  const state = reconcileGoalCounts({ ...fixture(), mornings: [
    { ...day, localDate: '2026-11-12', goalId: 'A', stepDone: true, stepRemoved: false },
    { ...day, localDate: '2026-11-13', stepOffered: false, stepDone: true }, day, { ...day },
  ] });
  assert.deepEqual(state.goalCounts, { A: { offered: 1, done: 1, removed: 0 }, B: { offered: 1, done: 0, removed: 1 }, C: { offered: 0, done: 0, removed: 0 } });
  assert.equal(reconcileGoalCounts(state), state);
});

test('Done replay is idempotent, Undo subtracts, and Done again restores only one count', () => {
  let state: Fixture = reconcileGoalCounts({ ...fixture(), mornings: [{ localDate: '2026-11-14', goalId: 'A', stepOffered: true, stepDone: true, stepRemoved: false }] });
  assert.equal(state.goalCounts.A.done, 1);
  state = reconcileGoalCounts({ ...state, mornings: state.mornings.map(morning => ({ ...morning, stepDone: true })) });
  assert.equal(state.goalCounts.A.done, 1);
  state = reconcileGoalCounts({ ...state, mornings: state.mornings.map(morning => ({ ...morning, stepDone: false })) });
  assert.equal(state.goalCounts.A.done, 0);
  state = reconcileGoalCounts({ ...state, mornings: state.mornings.map(morning => ({ ...morning, stepDone: true })) });
  assert.equal(state.goalCounts.A.done, 1);
  const undone = reconcileGoalCounts({ ...state, mornings: state.mornings.map(morning => ({ ...morning, stepDone: null })) });
  assert.equal(undone.goalCounts.A.done, 0); assert.equal(undone.goalCounts.A.offered, 1);
});

test('deleted goal history keeps phone-only counts and never enters the approved remote snapshot', () => {
  const state = reconcileGoalCounts(deleteGoal(fixture(), 'A'));
  assert.deepEqual(state.goalCounts.A, { offered: 1, done: 1, removed: 0 });
  const payload = JSON.stringify(remoteGoalSnapshot(state.goals));
  assert.doesNotMatch(payload, /goalCounts|offered|removed|stepLadder|Goal A|Goal B|localOnly/);
  const renamed = reconcileGoalCounts({ ...state, goals: state.goals.map(item => ({ ...item, goalText: 'A new title' })) });
  assert.deepEqual(renamed.goalCounts, state.goalCounts);
});
