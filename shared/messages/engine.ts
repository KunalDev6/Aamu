/** Phone-local message selection and learning. No clocks, audio, storage or network. */
export type MessageLevel = 'easy' | 'medium' | 'hard';

/** Extra fields such as uri and durationMs are preserved by every operation. */
export interface MessageMetadata {
  id: string;
  level: MessageLevel;
  blocked: boolean;
  createdAt: number;
  lastPlayedAt: number | null;
  timesPlayed: number;
  timesFollowedByDoneStep: number;
}

export interface MessageDayEntry {
  messageId: string;
  playedAt: number | null;
  lastPlayedAtBeforeToday: number | null;
  credited: boolean;
  rested: boolean;
}

/** Persist with its morning. Reuse it for replays and after process restarts. */
export interface MessageDayLedger {
  localDate: string;
  selectedMessageId: string | null;
  stepDone: boolean | null;
  entries: MessageDayEntry[];
}

export interface MessageLearningResult<T extends MessageMetadata> {
  messages: T[];
  ledger: MessageDayLedger;
}

export interface AudiblePlayback {
  /** The current day in the morning's recorded timezone, not a fresh device timezone. */
  localDate: string;
  messageId: string;
  context: 'morning' | 'settings';
  /** Audible listening time for this playback, excluding paused/muted/seeked time. */
  audibleMs: number;
  durationMs: number;
  /** True only at a naturally reached audible end, not a seek or manual stop. */
  ended: boolean;
  at: number;
}

export const messageConfig = Object.freeze({ playThresholdMs: 3_000 });

const fallbackLevels: Record<MessageLevel, readonly MessageLevel[]> = {
  easy: ['easy', 'medium', 'hard'],
  medium: ['medium', 'hard'],
  hard: ['hard'],
};

function breakTie(left: MessageMetadata, right: MessageMetadata): number {
  const leftLast = left.timesPlayed === 0 ? -Infinity : left.lastPlayedAt ?? -Infinity;
  const rightLast = right.timesPlayed === 0 ? -Infinity : right.lastPlayedAt ?? -Infinity;
  if (leftLast !== rightLast) return leftLast < rightLast ? -1 : 1;
  if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? -1 : 1;
  // Code-point comparison is stable across phone locales.
  return left.id === right.id ? 0 : left.id < right.id ? -1 : 1;
}

/** U16: level first, then yesterday exclusion, unplayed preference, score and ties. */
export function selectMessage<T extends MessageMetadata>(
  messages: readonly T[],
  level: MessageLevel,
  yesterdayPlayedMessageId: string | null = null,
): T | null {
  let eligible: T[] = [];
  for (const candidateLevel of fallbackLevels[level]) {
    eligible = messages.filter(message => !message.blocked && message.level === candidateLevel);
    if (eligible.length > 0) break;
  }
  if (eligible.length === 0) return null;
  const alternatives = eligible.filter(message => message.id !== yesterdayPlayedMessageId);
  if (alternatives.length > 0) eligible = alternatives;
  const unplayed = eligible.filter(message => message.timesPlayed === 0);
  if (unplayed.length > 0) return unplayed.sort(breakTie)[0];
  return eligible.sort((left, right) => {
    const leftScore = (left.timesFollowedByDoneStep + 1) / (left.timesPlayed + 2);
    const rightScore = (right.timesFollowedByDoneStep + 1) / (right.timesPlayed + 2);
    return rightScore - leftScore || breakTie(left, right);
  })[0];
}

export function createMessageLedger(localDate: string, selectedMessageId: string | null): MessageDayLedger {
  return { localDate, selectedMessageId, stepDone: null, entries: [] };
}

function emptyEntry(messageId: string): MessageDayEntry {
  return { messageId, playedAt: null, lastPlayedAtBeforeToday: null, credited: false, rested: false };
}

function withEntry(ledger: MessageDayLedger, entry: MessageDayEntry): MessageDayLedger {
  const exists = ledger.entries.some(current => current.messageId === entry.messageId);
  return { ...ledger, entries: exists
    ? ledger.entries.map(current => current.messageId === entry.messageId ? entry : current)
    : [...ledger.entries, entry] };
}

/** U17: threshold is audible time, never player position or time since pressing Play. */
export function recordAudiblePlayback<T extends MessageMetadata>(
  messages: readonly T[], ledger: MessageDayLedger, event: AudiblePlayback,
): MessageLearningResult<T> {
  const unchanged = { messages: [...messages], ledger };
  if (event.context !== 'morning' || event.localDate !== ledger.localDate) return unchanged;
  if (!Number.isFinite(event.audibleMs) || event.audibleMs < 0
    || !Number.isFinite(event.durationMs) || event.durationMs <= 0
    || !Number.isFinite(event.at)) return unchanged;
  const thresholdReached = event.durationMs < messageConfig.playThresholdMs
    ? event.ended && event.audibleMs > 0
    : event.audibleMs >= messageConfig.playThresholdMs;
  if (!thresholdReached) return unchanged;
  const message = messages.find(current => current.id === event.messageId);
  const entry = ledger.entries.find(current => current.messageId === event.messageId) ?? emptyEntry(event.messageId);
  if (!message || message.blocked || entry.rested || entry.playedAt !== null) return unchanged;
  return {
    messages: messages.map(current => current.id === message.id
      ? { ...current, timesPlayed: current.timesPlayed + 1, lastPlayedAt: event.at } : current),
    ledger: withEntry(ledger, { ...entry, playedAt: event.at, lastPlayedAtBeforeToday: message.lastPlayedAt }),
  };
}

/** Credit belongs only to the selected message; U17 imposes no play prerequisite. */
export function setMessageCompletion<T extends MessageMetadata>(
  messages: readonly T[], ledger: MessageDayLedger, done: boolean | null, localDate: string,
): MessageLearningResult<T> {
  if (localDate !== ledger.localDate) return { messages: [...messages], ledger };
  const nextLedger = { ...ledger, stepDone: done };
  const message = messages.find(current => current.id === ledger.selectedMessageId);
  if (!message) return { messages: [...messages], ledger: nextLedger };
  const entry = ledger.entries.find(current => current.messageId === message.id) ?? emptyEntry(message.id);
  const credited = done === true && !message.blocked && !entry.rested;
  if (credited === entry.credited) return { messages: [...messages], ledger: nextLedger };
  const delta = credited ? 1 : -1;
  return {
    messages: messages.map(current => current.id === message.id
      ? { ...current, timesFollowedByDoneStep: Math.max(0, current.timesFollowedByDoneStep + delta) } : current),
    ledger: withEntry(nextLedger, { ...entry, credited }),
  };
}

/**
 * Pass today's persisted ledger. Caller stops audio; do not select a replacement.
 * U18 reverses only that ledger's increments, retaining historical counters.
 * Keep selectedMessageId so navigating/reopening cannot silently choose another.
 */
export function restMessage<T extends MessageMetadata>(
  messages: readonly T[], ledger: MessageDayLedger, messageId: string,
): MessageLearningResult<T> {
  const entry = ledger.entries.find(current => current.messageId === messageId) ?? emptyEntry(messageId);
  return {
    messages: messages.map(message => message.id !== messageId ? message : {
      ...message,
      blocked: true,
      timesPlayed: Math.max(0, message.timesPlayed - (entry.playedAt !== null ? 1 : 0)),
      timesFollowedByDoneStep: Math.max(0, message.timesFollowedByDoneStep - (entry.credited ? 1 : 0)),
      lastPlayedAt: entry.playedAt !== null && message.lastPlayedAt === entry.playedAt
        ? entry.lastPlayedAtBeforeToday : message.lastPlayedAt,
    }),
    ledger: withEntry(ledger, { ...entry, playedAt: null, credited: false, rested: true }),
  };
}

/** Explicit restoration makes it eligible again; it cannot restore today's credit. */
export function restoreMessage<T extends MessageMetadata>(messages: readonly T[], messageId: string): T[] {
  return messages.map(message => message.id === messageId ? { ...message, blocked: false } : message);
}
