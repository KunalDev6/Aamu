import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeMorningUpload, morningNeedsUpload, projectMorningUpload, type SyncMorning } from '../../shared/mornings/sync.ts';
import { goalRemoteEligibility } from '../../src/goals/eligibility.ts';
import type { LocalGoal } from '../../src/goals/approval.ts';

const goal = (): LocalGoal => ({ id: 'goal', goalText: 'Read', steps: { tiny: 'Open a book.', small: 'Read a page.', full: 'Read a chapter.' }, approved: true, localOnly: false, latestVerdict: 'ok', revision: 1 });
const acknowledged = { pending: false, acknowledgedRevision: 1 };
const row = (): SyncMorning => ({ localDate: '2026-11-14', scheduledAt: 1, firstRingAt: 1, upAt: 2, minutesToUp: 1, minutesBeforeAlarm: null,
  snoozeCount: 0, voiceState: 'skipped', speechShare: null, speechOnsetMs: null, stepSize: 'small', stepDone: null,
  stepOffered: true, stepRemoved: false, utcOffsetMinutes: 120, level: 'easy', goalId: 'goal', stepText: 'Read my chosen page.', syncPending: true });

test('pending original or hint checks send measurements without step text and retain a local text retry', () => {
  for (const pending of [{ goalCheck: { requestId: 'pending', goalText: 'Read', state: 'pending' as const } }, { hintCheckRevision: 1 }]) {
    const goals = [{ ...goal(), ...pending }]; const original = row();
    const sent = projectMorningUpload(original, goals, acknowledged);
    assert.equal(sent.payload.stepText, null); assert.equal(sent.payload.level, 'easy'); assert.equal(sent.deferredText, true);
    const saved = acknowledgeMorningUpload(original, goals, sent, acknowledged);
    assert.equal(saved.syncPending, false); assert.equal(saved.stepTextSyncPending, true);
    assert.equal(morningNeedsUpload(saved, goals, { pending: false, acknowledgedRevision: 1 }), false);
    const restored = JSON.parse(JSON.stringify(saved)) as SyncMorning;
    assert.equal(morningNeedsUpload(restored, [goal()], { pending: false, acknowledgedRevision: 1 }), true);
    const later = projectMorningUpload(restored, [goal()], { pending: false, acknowledgedRevision: 1 }); assert.equal(later.payload.stepText, original.stepText);
    assert.equal(acknowledgeMorningUpload(restored, [goal()], later, { pending: false, acknowledgedRevision: 1 }).stepTextSyncPending, false);
  }
});

test('text waits for the approved goal snapshot to reach the server, then the row retries', () => {
  const original = row(); const sent = projectMorningUpload(original, [goal()], { pending: true, acknowledgedRevision: 1 });
  assert.equal(sent.payload.stepText, null);
  const saved = acknowledgeMorningUpload(original, [goal()], sent, { pending: true, acknowledgedRevision: 1 });
  assert.equal(morningNeedsUpload(saved, [goal()], { pending: true, acknowledgedRevision: 1 }), false);
  assert.equal(morningNeedsUpload(saved, [goal()], { pending: false, acknowledgedRevision: 1 }), true);
  assert.equal(projectMorningUpload(saved, [goal()], { pending: false, acknowledgedRevision: 1 }).payload.stepText, original.stepText);
});

test('support, unapproved and deleted goals never send text; a pending retry is retired without a private marker', () => {
  for (const goals of [[{ ...goal(), localOnly: true }], [{ ...goal(), latestVerdict: 'needs_support' as const }], [{ ...goal(), approved: false }], []]) {
    const original = { ...row(), syncPending: false, stepTextSyncPending: true };
    assert.equal(morningNeedsUpload(original, goals), true);
    const sent = projectMorningUpload(original, goals, acknowledged); assert.equal(sent.payload.stepText, null); assert.equal(sent.deferredText, false);
    assert.equal(acknowledgeMorningUpload(original, goals, sent, acknowledged).stepTextSyncPending, false);
    assert.doesNotMatch(JSON.stringify(sent.payload), /localOnly|needs_support|stepTextSyncPending|deferredText/);
  }
  assert.equal(goalRemoteEligibility({ ...goal(), goalText: 'I intend to harm myself' }), 'excluded');
});

test('a check resolving or a morning changing during upload cannot clear the newer pending work', () => {
  const pending = [{ ...goal(), goalCheck: { requestId: 'pending', goalText: 'Read', state: 'pending' as const } }];
  const original = row(); const sent = projectMorningUpload(original, pending, acknowledged);
  assert.equal(acknowledgeMorningUpload(original, [goal()], sent, acknowledged), original);
  const changed = { ...original, stepDone: true };
  assert.equal(acknowledgeMorningUpload(changed, pending, sent, acknowledged), changed);
});

test('morning upload projection excludes local ladder, counts, paths and coordination fields', () => {
  const local = { ...row(), stepLadder: goal().steps, goalCounts: { done: 1 }, recordingUri: 'file:///private/clip', stepOfferedAt: 3, stepTextSyncPending: true };
  const payload = projectMorningUpload(local, [goal()], acknowledged).payload;
  assert.doesNotMatch(JSON.stringify(payload), /stepLadder|goalCounts|recordingUri|file:|stepOfferedAt|stepTextSyncPending/);
  assert.equal(payload.goalId, 'goal'); assert.equal(payload.stepText, local.stepText);
});

test('missing acknowledgement withholds text and revision; an accepted snapshot releases both', () => {
  const original = row(); const sent = projectMorningUpload(original, [goal()]);
  assert.equal(sent.payload.stepText, null); assert.equal('goalSnapshotRevision' in sent.payload, false);
  const saved = acknowledgeMorningUpload(original, [goal()], sent);
  assert.equal(saved.stepTextSyncPending, true); assert.equal(morningNeedsUpload(saved, [goal()]), false);
  const snapshot = { pending: false, acknowledgedRevision: 3 };
  assert.equal(morningNeedsUpload(saved, [goal()], snapshot), true);
  const current = projectMorningUpload(saved, [goal()], snapshot);
  assert.equal(current.payload.stepText, original.stepText); assert.equal(current.payload.goalSnapshotRevision, 3);
  assert.equal(acknowledgeMorningUpload(saved, [goal()], current, snapshot).stepTextSyncPending, false);
});

test('a newer acknowledged goal snapshot cannot be cleared by an older morning upload acknowledgement', () => {
  const original = row(); const sent = projectMorningUpload(original, [goal()], acknowledged);
  const newer = { pending: false, acknowledgedRevision: 3 };
  assert.equal(acknowledgeMorningUpload(original, [goal()], sent, newer), original);
  assert.equal(projectMorningUpload(original, [goal()], newer).payload.goalSnapshotRevision, 3);
});
