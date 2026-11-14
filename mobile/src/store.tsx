import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { LocalGoal } from '../../src/goals/approval';
import type { MorningRecord, MorningLevel, Baselines } from '../../shared/mornings/engine';
import type { MessageDayLedger } from '../../shared/messages/engine';
import { preparePrivateStorage } from './privateAudio';
import { recoverInterruptedGoalSync } from '../../src/goals/sync';
import { reconcileGoalCounts, type GoalCounts } from '../../src/goals/settings';
import type { Steps } from '../../api/src/goals/contracts';
import { uuid } from 'expo';
import { demoEnabled } from './demo/config';
import { demoSafePerson, demoSeedConfig, initialAppState } from './demo/seed';

export type Clip = { id: string; uri: string; durationMs: number };
/** A moment: a photo the person chose, with an optional recording of the sound around it.
 * A photo-only moment has an empty uri and zero duration. Both files stay on the phone. */
export type MessageClip = Clip & { photoUri?: string; level: 'easy' | 'medium' | 'hard'; blocked: boolean; createdAt: number;
  timesPlayed: number; timesFollowedByDoneStep: number; lastPlayedAt: number | null };
export type AppMorning = MorningRecord & { goalId: string | null; messageId: string | null;
  phase?: 'dawn' | 'snoozed' | 'voice' | 'message' | 'home';
  interactionAt?: number[]; dawnProgress?: number; snoozeUntil?: number; voiceStartedAt?: number;
  messageLedger?: MessageDayLedger; ringObserved?: boolean; nativeAlarmId?: string;
  syncPending?: boolean; upSyncPending?: boolean; stepText?: string | null;
  stepTextSyncPending?: boolean;
  stepOfferedAt?: number;
  stepLadder?: Steps;
  stepRemovalUndo?: { expiresAt: number; stepText: string | null; stepDone: boolean | null };
  dawnStartedAt?: number; dawnDurationMs?: number; dawnLowerStart?: boolean;
  skyTransitionFrom?: number; skyTransitionStartedAt?: number;
};
export type ReplyNote = Clip & { level: 'medium' | 'hard'; createdAt: number; answered: boolean };
export type AppState = {
  version: 1; setupStep: number; setupComplete: boolean; goals: LocalGoal[];
  alarm: { hour: number; minute: number; enabled: boolean } | null;
  messages: MessageClip[]; place: 'sea' | 'forest' | 'personal'; placeClip: Clip | null;
  mornings: AppMorning[]; rotationGoalId: string | null;
  nativeEventSequence?: number;
  alarmScheduleHistory?: { effectiveAt: number; hour: number; minute: number; enabled: boolean; utcOffsetMinutes: number }[];
  nativeScheduleHorizonEnd?: number | null;
  sensingBaselines?: Baselines;
  replyNotes?: ReplyNote[];
  goalSync?: { generation: number; pending: boolean; lastAllocatedRevision: number; acknowledgedRevision?: number };
  goalCounts?: Record<string, GoalCounts>;
  demoSeed?: { version: 1; seededAt: number; nativeAlarmSetupPending: boolean };
  /** Goals made by the guided demo, so the next Start demo can clear them and begin again. */
  demoTourGoalIds?: string[];
  clinicSharing?: { enabled: boolean; code: string; revision: number; syncedRevision?: number;
    syncPending: boolean; callbackRequestedAt?: number };
};
const emptyState: AppState = { version: 1, setupStep: 0, setupComplete: false, goals: [], alarm: null,
  messages: [], place: 'sea', placeClip: null, mornings: [], rotationGoalId: null };
const storageKey = demoEnabled ? demoSeedConfig.stateKey : demoSeedConfig.normalStateKey;
const safePersonKey = demoEnabled ? demoSeedConfig.safePersonKey : demoSeedConfig.normalSafePersonKey;
type Store = { state: AppState; ready: boolean; loadError: boolean; saveError: boolean; retrySave(): void; read(): AppState;
  update(change: (state: AppState) => AppState): void; retryLoad(): void;
  safePerson: { name: string; number: string } | null;
  saveSafePerson(contact: { name: string; number: string }): Promise<void>;
};
const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(emptyState);
  const ref = useRef(state); const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false); const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reload, setReload] = useState(0);
  const [safePerson, setSafePerson] = useState<Store['safePerson']>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (Platform.OS === 'ios') await preparePrivateStorage();
        const stored = await AsyncStorage.getItem(storageKey);
        const parsed = initialAppState({ demo: demoEnabled, stored: stored ? JSON.parse(stored) as AppState : null,
          empty: emptyState, now: Date.now(), goalId: uuid.v4() });
        if (parsed.version !== 1 || !Array.isArray(parsed.goals) || !Array.isArray(parsed.mornings)) throw Error();
        const restored = reconcileGoalCounts(recoverInterruptedGoalSync(parsed));
        // Commit the first seed before exposing Home, so relaunch cannot create
        // a second goal/date set. Normal storage is never read, reset or written.
        if (!stored && demoEnabled) await AsyncStorage.setItem(storageKey, JSON.stringify(restored));
        if (!alive) return;
        ref.current = restored; setState(restored);
        if (Platform.OS !== 'web') {
          const person = await SecureStore.getItemAsync(safePersonKey);
          const contact = person ? JSON.parse(person) : demoEnabled ? { ...demoSafePerson } : null;
          if (!person && contact) await SecureStore.setItemAsync(safePersonKey, JSON.stringify(contact),
            { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
          if (alive) setSafePerson(contact);
        } else if (demoEnabled && alive) {
          setSafePerson({ ...demoSafePerson });
        }
        if (alive) setReady(true);
      } catch {
        if (alive) setLoadError(true);
      } // Preserve unreadable storage; never silently reset it.
    })();
    return () => { alive = false; };
  }, [reload]);
  const read = useCallback(() => ref.current, []);
  const update = useCallback((change: (old: AppState) => AppState) => {
    const next = reconcileGoalCounts(change(ref.current)); if (next === ref.current) return;
    ref.current = next; setState(next);
    const serialized = JSON.stringify(next);
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, serialized))
      .then(() => setSaveError(false)).catch(() => setSaveError(true));
  }, []);
  const retrySave = useCallback(() => {
    const serialized = JSON.stringify(ref.current);
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, serialized))
      .then(() => setSaveError(false)).catch(() => setSaveError(true));
  }, []);
  async function saveSafePerson(contact: { name: string; number: string }) {
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(safePersonKey, JSON.stringify(contact),
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    setSafePerson(contact); // Web preview keeps the contact in memory, never browser storage.
  }
  return <Context.Provider value={{ state, ready, loadError, saveError, retrySave, read, update,
    retryLoad: () => { setReady(false); setLoadError(false); setReload(value => value + 1); }, safePerson, saveSafePerson }}>{children}</Context.Provider>;
}
export function useStore() { const store = useContext(Context); if (!store) throw Error('Missing StoreProvider'); return store; }
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export const sizeLabels = { tiny: 'Tiny', small: 'Small', full: 'Full' } as const;
export const sizeMinutes = { tiny: 2, small: 10, full: 30 } as const;
export const messageLabels = { easy: 'For an easier morning', medium: 'For an in-between morning', hard: 'For a hard morning' } as const;
export function messageLevel(level: MorningLevel | null): 'easy' | 'medium' | 'hard' {
  return level === 'easy' || level === 'medium' ? level : 'hard';
}
