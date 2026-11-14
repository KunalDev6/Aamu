import { setMessageCompletion, type MessageDayLedger, type MessageMetadata } from '../../shared/messages/engine.ts';
import type { StepSize } from '../../shared/mornings/engine.ts';
import { homeConfig, type RemovalNoticeMorning } from './presentation.ts';

export type RemovalMorning = RemovalNoticeMorning & {
  goalId: string | null; stepSize: StepSize | null; stepText?: string | null;
  stepDone: boolean | null; stepLadder?: Record<StepSize, string>;
  messageLedger?: MessageDayLedger; syncPending?: boolean;
};
export type RemovalState = {
  mornings: RemovalMorning[];
  messages: MessageMetadata[];
  goals: { id: string; steps: Record<StepSize, string> }[];
};
const activeDate = (morning: RemovalMorning, now: number) =>
  new Date(now + morning.utcOffsetMinutes * 60_000).toISOString().slice(0, 10) === morning.localDate;

/** Too much today clears credit at each reduction; Tiny removal can be undone briefly. */
export function shrinkOfferedStep<T extends RemovalState>(state: T, date: string, now: number): T {
  const morning = state.mornings.find(item => item.localDate === date);
  if (!morning?.stepOffered || !morning.stepSize || morning.stepRemoved || morning.level === 'off'
    || !activeDate(morning, now)) return state;
  const size = morning.stepSize === 'full' ? 'small' : morning.stepSize === 'small' ? 'tiny' : null;
  const goal = state.goals.find(item => item.id === morning.goalId);
  const learned = morning.messageLedger
    ? setMessageCompletion(state.messages, morning.messageLedger, null, date) : null;
  const updated = {
    ...morning, stepSize: size,
    stepText: size ? goal?.steps[size] ?? morning.stepLadder?.[size] ?? null : null,
    stepRemoved: size === null, stepDone: null, syncPending: true,
    messageLedger: learned?.ledger ?? morning.messageLedger,
    stepRemovalUndo: size === null ? {
      expiresAt: now + homeConfig.removalUndoMs,
      stepText: morning.stepText ?? null,
      stepDone: morning.stepDone,
    } : undefined,
  };
  return { ...state, messages: learned?.messages ?? state.messages,
    mornings: state.mornings.map(item => item.localDate === date ? updated : item) };
}

/** Reuses the current ledger so a separately rested/blocked message gains no credit. */
export function undoRemovedStep<T extends RemovalState>(state: T, date: string, now: number): T {
  const morning = state.mornings.find(item => item.localDate === date);
  const undo = morning?.stepRemovalUndo;
  if (!morning?.stepOffered || !morning.stepRemoved || morning.level === 'off' || !undo
    || now >= undo.expiresAt || !activeDate(morning, now)) return state;
  const learned = morning.messageLedger
    ? setMessageCompletion(state.messages, morning.messageLedger, undo.stepDone, date) : null;
  const updated = { ...morning, stepSize: 'tiny' as const, stepText: undo.stepText,
    stepDone: undo.stepDone, stepRemoved: false, stepRemovalUndo: undefined, syncPending: true,
    messageLedger: learned?.ledger ?? morning.messageLedger };
  return { ...state, messages: learned?.messages ?? state.messages,
    mornings: state.mornings.map(item => item.localDate === date ? updated : item) };
}
