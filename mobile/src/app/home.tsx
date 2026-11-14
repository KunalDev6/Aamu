import React, { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { TextAction } from '../TextAction';
import { HomeView } from '../HomeView';
import { localDate, useStore, messageLevel } from '../store';
import { shrinkToday, updateStepDone, undoTodayRemoval } from '../morning';
import { usePartner } from '../partner';
import { selectMessage } from '../../../shared/messages/engine';
import { homePresentation, removalNoticeVisible } from '../../../src/home/presentation';
import { useAlarmControl } from '../useAlarmControl';
import { DemoAlarmNotice } from '../demo/DemoAlarmNotice';
import { demoEnabled } from '../demo/config';
import { currentTour, startTour, useTour } from '../demo/tour';
import { resetDemo } from '../demo/store';
import { deleteGoal } from '../../../src/goals/settings';

export default function Home() {
  const { state, update } = useStore();
  const alarmControl = useAlarmControl(); const partner = usePartner(); const touring = Boolean(useTour());
  const [clock, setClock] = useState(Date.now);
  // Home's time-based copy changes on minute boundaries. Do not re-render an
  // idle landscape ten times a second or keep a timer while it is hidden.
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { if (timer) clearTimeout(timer); timer = undefined; };
    const tick = () => {
      stop(); const now = Date.now(); setClock(now);
      if (AppState.currentState === 'active') timer = setTimeout(tick, 60_000 - now % 60_000);
    };
    tick();
    const subscription = AppState.addEventListener('change', status => { if (status === 'active') tick(); else stop(); });
    return () => { stop(); subscription.remove(); };
  }, []));
  const today = state.mornings.find(m => m.localDate === localDate(new Date(clock)));
  const removalExpiresAt = today?.stepRemovalUndo?.expiresAt;
  useEffect(() => {
    if (!removalExpiresAt || removalExpiresAt <= Date.now()) return;
    const timer = setTimeout(() => setClock(Date.now()), removalExpiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [removalExpiresAt]);
  const goal = state.goals.find(g => g.id === today?.goalId);
  const model = homePresentation({ now: clock, alarm: state.alarm, today, paired: partner.paired, partnerUp: partner.partnerUpToday });
  const changeDone = (value: boolean | null) => { if (today) update(old => updateStepDone(old, today.localDate, value)); };
  const note = today?.level === 'easy' ? state.replyNotes?.filter(item => !item.answered).sort((a, b) => a.createdAt - b.createdAt)[0] : null;
  const availableMessage = today?.messageLedger ? state.messages.find(item => item.id === today.messageId && !item.blocked)
    : today ? selectMessage(state.messages, messageLevel(today.level)) : null;
  const stepText = today?.stepText ?? (today?.stepSize ? goal?.steps[today.stepSize] ?? today.stepLadder?.[today.stepSize] : undefined);
  return <HomeView now={clock} presentation={model} paired={partner.paired} alarmEnabled={Boolean(state.alarm?.enabled)}
    alarmBusy={alarmControl.busy} notice={alarmControl.notice}
    touring={touring}
    alarmSetupNotice={!touring && state.demoSeed?.nativeAlarmSetupPending
      ? <DemoAlarmNotice time={model.formattedAlarmTime ?? '07:00'} onSetup={() => router.push('/setup?step=3')} /> : undefined}
    step={today?.stepOffered && !today.stepRemoved && today.stepSize && stepText
      ? { size: today.stepSize, text: stepText, done: today.stepDone } : undefined}
    removalVisible={removalNoticeVisible(today, Boolean(state.alarm?.enabled), clock)}
    hasMessage={Boolean(today?.upAt && availableMessage)}
    onTryMorning={demoEnabled ? () => {
      // Start demo always begins again at picking a goal: clear unfinished goals and
      // the goals earlier demo runs made, and free a slot if all three are still taken.
      update(old => {
        const made = new Set(old.demoTourGoalIds ?? []);
        let next = old.goals.filter(item => !item.approved || made.has(item.id)).reduce((state, item) => deleteGoal(state, item.id), old);
        if (next.goals.length >= 3) next = deleteGoal(next, next.goals[next.goals.length - 1].id);
        return { ...next, demoTourGoalIds: [] };
      });
      resetDemo(); startTour(); router.push('/goals?tour=1');
    } : undefined}
    // A separate action: during the guided demo it rings the next guided morning,
    // otherwise an ordinary fast demo morning.
    onRingAlarm={demoEnabled ? () => router.push(currentTour() ? '/demo?tour=1' : '/demo?start=1') : undefined}
    onSettings={() => router.push('/settings')} onHelp={() => router.push('/help')}
    onEnableAlarm={() => state.alarm ? void alarmControl.setEnabled(true) : router.push('/setup?step=3')}
    onEarlyHold={() => router.push('/alarm?kind=early')}
    onDone={() => changeDone(true)} onNotToday={() => changeDone(false)} onUndoDone={() => changeDone(null)}
    onShrink={() => { if (today) update(old => shrinkToday(old, today.localDate)); }}
    onUndoRemoval={() => { if (today) update(old => undoTodayRemoval(old, today.localDate)); }}
    onPlayMessage={() => { if (today) router.push(`/message?date=${today.localDate}&play=true`); }}
    note={note ? <TextAction label="A note from your past self" onPress={() => router.push(`/answer?noteId=${note.id}`)} />
      // An easy morning is a good day: one quiet way to keep something from it.
      : today?.level === 'easy' && today.upAt ? <TextAction label="Save a moment from today" onPress={() => router.push('/setup?step=1&add=easy')} /> : undefined}
  />;
}
