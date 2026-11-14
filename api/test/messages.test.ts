import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMessageLedger, recordAudiblePlayback, restMessage, restoreMessage, selectMessage, setMessageCompletion,
  type AudiblePlayback, type MessageDayLedger, type MessageMetadata,
} from '../../shared/messages/engine.ts';

const today = '2026-11-14';
const tomorrow = '2026-11-15';
type Clip = MessageMetadata & { uri: string; durationMs: number };
function clip(id: string, overrides: Partial<Clip> = {}): Clip {
  return { id, level: 'easy', blocked: false, createdAt: 100, lastPlayedAt: null,
    timesPlayed: 0, timesFollowedByDoneStep: 0, uri: `file:///${id}.m4a`, durationMs: 8_000, ...overrides };
}
function playback(messageId: string, overrides: Partial<AudiblePlayback> = {}): AudiblePlayback {
  return { localDate: today, messageId, context: 'morning', audibleMs: 3_000,
    durationMs: 8_000, ended: false, at: 1_000, ...overrides };
}
function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freezeDeep);
  }
  return value;
}

test('selection uses only the first eligible level and never falls back brighter', () => {
  const easy = clip('easy'); const medium = clip('medium', { level: 'medium' });
  const hard = clip('hard', { level: 'hard' });
  assert.equal(selectMessage([hard, medium, easy], 'easy')?.id, 'easy');
  assert.equal(selectMessage([hard, medium], 'easy')?.id, 'medium');
  assert.equal(selectMessage([hard], 'easy')?.id, 'hard');
  assert.equal(selectMessage([easy, hard], 'medium')?.id, 'hard');
  assert.equal(selectMessage([easy], 'medium'), null);
  assert.equal(selectMessage([easy, medium], 'hard'), null);
  assert.equal(selectMessage([], 'easy'), null);
});

test('blocked messages are ineligible, including during fallback', () => {
  assert.equal(selectMessage([clip('easy', { blocked: true }), clip('medium', { level: 'medium', blocked: true }),
    clip('hard', { level: 'hard' })], 'easy')?.id, 'hard');
  assert.equal(selectMessage([clip('hard', { level: 'hard', blocked: true })], 'hard'), null);
});

test('yesterday is excluded when another remains, before unplayed preference or scores', () => {
  const previous = clip('previous');
  const other = clip('other', { timesPlayed: 2, timesFollowedByDoneStep: 0, lastPlayedAt: 30 });
  assert.equal(selectMessage([previous, other], 'easy', 'previous')?.id, 'other');
  assert.equal(selectMessage([previous], 'easy', 'previous')?.id, 'previous');
  // A gentler recording does not displace the only recording at today's level.
  assert.equal(selectMessage([previous, clip('gentler', { level: 'medium' })], 'easy', 'previous')?.id, 'previous');
});

test('unplayed recordings win over the best played score, ordered by creation then ID', () => {
  const best = clip('best', { timesPlayed: 20, timesFollowedByDoneStep: 20, lastPlayedAt: 1 });
  const later = clip('later', { createdAt: 200 });
  const first = clip('first', { createdAt: 100 });
  assert.equal(selectMessage([best, later, first], 'easy')?.id, 'first');
  assert.equal(selectMessage([clip('b'), clip('a')], 'easy')?.id, 'a');
});

test('played scores use smoothing, then oldest playback, creation and lowest ID', () => {
  const strong = clip('strong', { timesPlayed: 2, timesFollowedByDoneStep: 1, lastPlayedAt: 300 });
  const weak = clip('weak', { timesPlayed: 8, timesFollowedByDoneStep: 2, lastPlayedAt: 100 });
  assert.equal(selectMessage([weak, strong], 'easy')?.id, 'strong');
  const equal = clip('equal', { timesPlayed: 4, timesFollowedByDoneStep: 2, lastPlayedAt: 100 });
  assert.equal(selectMessage([strong, equal], 'easy')?.id, 'equal');
  const firstCreated = { ...equal, id: 'first-created', createdAt: 1 };
  assert.equal(selectMessage([equal, firstCreated], 'easy')?.id, 'first-created');
  assert.equal(selectMessage([{ ...equal, id: 'b' }, { ...equal, id: 'a' }], 'easy')?.id, 'a');
});

test('selection is deterministic and leaves frozen inputs and their ordering intact', () => {
  const messages = freezeDeep([clip('b'), clip('a')]);
  for (let n = 0; n < 20; n++) assert.equal(selectMessage(messages, 'easy')?.id, 'a');
  assert.deepEqual(messages.map(message => message.id), ['b', 'a']);
});

test('a play counts at three audible seconds exactly once, surviving pause and replay', () => {
  const messages = freezeDeep([clip('a')]);
  const ledger = freezeDeep(createMessageLedger(today, 'a'));
  const below = recordAudiblePlayback(messages, ledger, playback('a', { audibleMs: 2_999 }));
  assert.equal(below.messages[0].timesPlayed, 0);
  const counted = recordAudiblePlayback(below.messages, below.ledger, playback('a'));
  assert.equal(counted.messages[0].timesPlayed, 1);
  assert.equal(counted.messages[0].lastPlayedAt, 1_000);
  assert.equal(counted.messages[0].uri, messages[0].uri);
  const paused = recordAudiblePlayback(counted.messages, counted.ledger, playback('a'));
  assert.deepEqual(paused, counted);
  const replayed = recordAudiblePlayback(paused.messages, paused.ledger, playback('a', { at: 9_000 }));
  assert.deepEqual(replayed, counted);
  assert.equal(messages[0].timesPlayed, 0);
  assert.equal(ledger.entries.length, 0);
});

test('a short message counts at natural audible completion, not pause or skipped-to-end time', () => {
  const messages = [clip('a', { durationMs: 1_500 })];
  const ledger = createMessageLedger(today, 'a');
  const early = playback('a', { durationMs: 1_500, audibleMs: 1_400 });
  assert.equal(recordAudiblePlayback(messages, ledger, early).messages[0].timesPlayed, 0);
  assert.equal(recordAudiblePlayback(messages, ledger, { ...early, audibleMs: 1_500 }).messages[0].timesPlayed, 0);
  assert.equal(recordAudiblePlayback(messages, ledger, { ...early, ended: true }).messages[0].timesPlayed, 1);
  assert.equal(recordAudiblePlayback(messages, ledger, { ...early, audibleMs: 0, ended: true }).messages[0].timesPlayed, 0);
  const exactlyThree = playback('a', { durationMs: 3_000, audibleMs: 2_900, ended: true });
  assert.equal(recordAudiblePlayback(messages, ledger, exactlyThree).messages[0].timesPlayed, 0);
});

test('Settings playback, another day, invalid measurements and absent recordings never count', () => {
  const messages = [clip('a')]; const ledger = createMessageLedger(today, 'a');
  for (const event of [playback('a', { context: 'settings' }), playback('a', { localDate: tomorrow }),
    playback('missing'), playback('a', { audibleMs: NaN }), playback('a', { audibleMs: -1 }),
    playback('a', { durationMs: 0 }), playback('a', { durationMs: Infinity }), playback('a', { at: NaN })]) {
    assert.deepEqual(recordAudiblePlayback(messages, ledger, event), { messages, ledger });
  }
});

test('serializable persisted daily ledgers prevent double counts after a process restart', () => {
  const first = recordAudiblePlayback([clip('a')], createMessageLedger(today, 'a'), playback('a'));
  const restored = JSON.parse(JSON.stringify(first)) as typeof first;
  assert.deepEqual(recordAudiblePlayback(restored.messages, restored.ledger, playback('a', { at: 2_000 })), first);
  const nextDay = recordAudiblePlayback(first.messages, createMessageLedger(tomorrow, 'a'),
    playback('a', { localDate: tomorrow, at: 10_000 }));
  assert.equal(nextDay.messages[0].timesPlayed, 2);
  assert.equal(nextDay.messages[0].lastPlayedAt, 10_000);
});

test('only the selected message earns credit, independently of its audible play threshold', () => {
  const otherPlayed = recordAudiblePlayback([clip('selected'), clip('other')],
    createMessageLedger(today, 'selected'), playback('other'));
  const done = setMessageCompletion(otherPlayed.messages, otherPlayed.ledger, true, today);
  assert.equal(done.messages[0].timesPlayed, 0);
  assert.equal(done.messages[0].timesFollowedByDoneStep, 1);
  assert.equal(done.messages[1].timesPlayed, 1);
  assert.equal(done.messages[1].timesFollowedByDoneStep, 0);
  assert.deepEqual(setMessageCompletion(done.messages, done.ledger, true, today), done);
});

test('Done undo removes only today’s credit and a later Done adds it back once', () => {
  const messages = [clip('a', { timesPlayed: 6, timesFollowedByDoneStep: 4, lastPlayedAt: 200 })];
  const done = setMessageCompletion(messages, createMessageLedger(today, 'a'), true, today);
  assert.equal(done.messages[0].timesFollowedByDoneStep, 5);
  const undone = setMessageCompletion(done.messages, done.ledger, false, today);
  assert.equal(undone.messages[0].timesFollowedByDoneStep, 4);
  assert.deepEqual(setMessageCompletion(undone.messages, undone.ledger, false, today), undone);
  const again = setMessageCompletion(undone.messages, undone.ledger, true, today);
  assert.equal(again.messages[0].timesFollowedByDoneStep, 5);
  const unknown = setMessageCompletion(again.messages, again.ledger, null, today);
  assert.equal(unknown.messages[0].timesFollowedByDoneStep, 4);
  assert.equal(unknown.messages[0].timesPlayed, 6);
});

test('no selected recording means no credit; a different local day cannot change the old ledger', () => {
  const messages = [clip('a')];
  for (const selected of [null, 'deleted']) {
    const done = setMessageCompletion(messages, createMessageLedger(today, selected), true, today);
    assert.equal(done.messages[0].timesFollowedByDoneStep, 0);
    assert.equal(done.ledger.stepDone, true);
  }
  const ledger = createMessageLedger(today, 'a');
  assert.deepEqual(setMessageCompletion(messages, ledger, true, tomorrow), { messages, ledger });
});

test('Rest reverses only today’s play and credit, restores the historical timestamp, and blocks', () => {
  const messages = freezeDeep([clip('a', { timesPlayed: 5, timesFollowedByDoneStep: 3, lastPlayedAt: 90 }), clip('b')]);
  const played = recordAudiblePlayback(messages, createMessageLedger(today, 'a'), playback('a'));
  const done = setMessageCompletion(played.messages, played.ledger, true, today);
  const rested = restMessage(done.messages, done.ledger, 'a');
  assert.deepEqual(rested.messages[0], { ...messages[0], blocked: true });
  assert.equal(rested.ledger.selectedMessageId, 'a');
  assert.equal(rested.ledger.stepDone, true);
  assert.deepEqual(restMessage(rested.messages, rested.ledger, 'a'), rested);
  const afterPlay = recordAudiblePlayback(rested.messages, rested.ledger, playback('a', { at: 4_000 }));
  assert.deepEqual(afterPlay, rested);
  assert.deepEqual(setMessageCompletion(rested.messages, rested.ledger, false, today).messages, rested.messages);
  assert.equal(messages[0].timesPlayed, 5);
});

test('Rest without today’s plays or credits preserves all older counters', () => {
  const message = clip('a', { timesPlayed: 9, timesFollowedByDoneStep: 7, lastPlayedAt: 500 });
  const rested = restMessage([message], createMessageLedger(today, 'a'), 'a');
  assert.deepEqual(rested.messages, [{ ...message, blocked: true }]);
  assert.deepEqual(recordAudiblePlayback(rested.messages, rested.ledger, playback('a')), rested);
  const done = setMessageCompletion(rested.messages, rested.ledger, true, today);
  assert.equal(done.messages[0].timesFollowedByDoneStep, 7);
});

test('Rest can reverse a completion credited before any play without subtracting historical plays', () => {
  const message = clip('a', { timesPlayed: 2, timesFollowedByDoneStep: 1, lastPlayedAt: 90 });
  const done = setMessageCompletion([message], createMessageLedger(today, 'a'), true, today);
  const rested = restMessage(done.messages, done.ledger, 'a');
  assert.deepEqual(rested.messages, [{ ...message, blocked: true }]);
});

test('manual restoration preserves history and does not resurrect the rested day’s learning', () => {
  const first = recordAudiblePlayback([clip('a')], createMessageLedger(today, 'a'), playback('a'));
  const rested = restMessage(first.messages, first.ledger, 'a');
  const restored = restoreMessage(rested.messages, 'a');
  assert.equal(restored[0].blocked, false);
  assert.equal(restored[0].timesPlayed, 0);
  assert.equal(restored[0].lastPlayedAt, null);
  assert.equal(recordAudiblePlayback(restored, rested.ledger, playback('a')).messages[0].timesPlayed, 0);
  assert.equal(setMessageCompletion(restored, rested.ledger, true, today).messages[0].timesFollowedByDoneStep, 0);
  const next = recordAudiblePlayback(restored, createMessageLedger(tomorrow, 'a'),
    playback('a', { localDate: tomorrow, at: 2_000 }));
  assert.equal(next.messages[0].timesPlayed, 1);
  assert.equal(selectMessage(restored, 'easy')?.id, 'a');
});

test('an already blocked recording earns neither play nor selected completion credit', () => {
  const messages = [clip('a', { blocked: true })];
  const ledger: MessageDayLedger = createMessageLedger(today, 'a');
  assert.equal(recordAudiblePlayback(messages, ledger, playback('a')).messages[0].timesPlayed, 0);
  assert.equal(setMessageCompletion(messages, ledger, true, today).messages[0].timesFollowedByDoneStep, 0);
});
