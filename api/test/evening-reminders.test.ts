import test from 'node:test';
import assert from 'node:assert/strict';
import { canAnswerEveningReminder, eveningReminder, parseEveningData, planEveningReminder,
  reconcileEveningQueue, type EveningMorning } from '../../shared/reminders/evening.ts';

const at = (value: string) => Date.parse(`2026-11-14T${value}:00+02:00`);
const row = (changes: Partial<EveningMorning> = {}): EveningMorning => ({ localDate: '2026-11-14',
  utcOffsetMinutes: 120, stepOffered: true, stepOfferedAt: at('08:00'), stepRemoved: false, stepDone: null, ...changes });
const plan = () => planEveningReminder(row(), at('09:00'))!;
const pending = () => [{ identifier: plan().identifier, data: plan().data }];

test('an offered step schedules exactly once at 18:00 in its recorded local offset', () => {
  assert.equal(plan().dueAt, at('18:00'));
  assert.equal(plan().expiresAt, Date.parse('2026-11-15T00:00:00+02:00'));
  assert.equal(reconcileEveningQueue([row()], [], [], at('09:00')).schedule.length, 1);
  assert.deepEqual(reconcileEveningQueue([row()], pending(), [], at('10:00')), { cancel: [], schedule: [], dismiss: [] });
});
test('an offer just before18 is eligible; an offer exactly18 or later is suppressed', () => {
  assert.ok(planEveningReminder(row({ stepOfferedAt: at('17:59') }), at('17:59')));
  assert.equal(planEveningReminder(row({ stepOfferedAt: at('18:00') }), at('18:00')), null);
  assert.equal(planEveningReminder(row({ stepOfferedAt: at('20:00') }), at('20:00')), null);
});
test('removed steps never schedule and cancel an existing pending and presented reminder', () => {
  const result = reconcileEveningQueue([row({ stepRemoved: true })], pending(), pending(), at('17:00'));
  assert.deepEqual(result, { cancel: [plan().identifier], schedule: [], dismiss: [plan().identifier] });
});
test('Done cancels the reminder, Undo before18 restores it, Undo after18 does not catch up', () => {
  assert.deepEqual(reconcileEveningQueue([row({ stepDone: true })], pending(), [], at('12:00')).cancel, [plan().identifier]);
  assert.equal(reconcileEveningQueue([row()], [], [], at('17:00')).schedule.length, 1);
  assert.equal(reconcileEveningQueue([row()], [], [], at('18:01')).schedule.length, 0);
});
test('do not cancel a due native notification during OS delivery or send a late catch-up', () => {
  assert.deepEqual(reconcileEveningQueue([row()], pending(), [], at('18:00')), { cancel: [], schedule: [], dismiss: [] });
  assert.deepEqual(reconcileEveningQueue([row()], [], [], at('20:00')), { cancel: [], schedule: [], dismiss: [] });
});
test('a reminder may answer today but never the next recorded day, including midnight equality', () => {
  assert.equal(canAnswerEveningReminder(row(), plan().data, at('18:00')), true);
  assert.equal(canAnswerEveningReminder(row(), plan().data, plan().expiresAt - 1), true);
  assert.equal(canAnswerEveningReminder(row(), plan().data, plan().expiresAt), false);
  assert.deepEqual(reconcileEveningQueue([row()], pending(), pending(), plan().expiresAt), {
    cancel: [plan().identifier], schedule: [], dismiss: [plan().identifier],
  });
});
test('duplicate or stale replies cannot change an answered, removed or replaced offer', () => {
  for (const changed of [row({ stepDone: true }), row({ stepDone: false }), row({ stepRemoved: true }), row({ stepOfferedAt: at('09:00') })]) {
    assert.equal(canAnswerEveningReminder(changed, plan().data, at('19:00')), false);
  }
  assert.equal(canAnswerEveningReminder(undefined, plan().data, at('19:00')), false);
  assert.equal(canAnswerEveningReminder(row(), { ...plan().data, localDate: '2026-11-13' }, at('19:00')), false);
});
test('a first-offer timestamp is required; wake time or launch time is never substituted', () => {
  assert.equal(planEveningReminder(row({ stepOfferedAt: undefined }), at('10:00')), null);
  assert.equal(planEveningReminder(row({ stepOffered: false }), at('10:00')), null);
  assert.equal(planEveningReminder(row({ stepOfferedAt: at('11:00') }), at('10:00')), null);
});
test('notification payload contains only opaque local offer identity, never goal or step text', () => {
  assert.deepEqual(Object.keys(plan().data).sort(), ['kind', 'localDate', 'offeredAt', 'version']);
  assert.equal(eveningReminder.yes, 'aamu_evening_yes');
  assert.equal(eveningReminder.notToday, 'aamu_evening_not_today');
});
test('deleted goals do not suppress a still-valid stored offer', () => {
  // Planner deliberately accepts only the stored morning; it has no goal lookup.
  assert.ok(planEveningReminder(row(), at('17:00')));
});
test('notification reconciliation leaves unrelated local notifications untouched', () => {
  const other = { identifier: 'some_other_notification', data: {} };
  assert.deepEqual(reconcileEveningQueue([], [other], [other], at('10:00')), { cancel: [], schedule: [], dismiss: [] });
});
test('invalid payloads and calendar dates are rejected without normalizing into another day', () => {
  for (const value of [null, {}, { ...plan().data, version: 2 }, { ...plan().data, offeredAt: NaN }]) assert.equal(parseEveningData(value), null);
  assert.equal(planEveningReminder(row({ localDate: '2026-02-30' }), at('10:00')), null);
  assert.equal(planEveningReminder(row({ utcOffsetMinutes: Infinity }), at('10:00')), null);
  assert.equal(canAnswerEveningReminder(row(), plan().data, NaN), false);
});
