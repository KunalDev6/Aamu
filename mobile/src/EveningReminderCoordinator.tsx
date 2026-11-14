import { useEffect, useEffectEvent, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { useStore } from './store';
import { updateStepDone } from './morning';
import { canAnswerEveningReminder, eveningReminder, parseEveningData } from '../../shared/reminders/evening';
import { clearEveningResponse, listenToEveningReminders, reminderCopy, syncEveningReminders } from './reminders/native';

/** Local notifications only. No token registration, background server or text
 * payload. The same completion function as Home preserves message learning. */
export function EveningReminderCoordinator() {
  const store = useStore();
  const read = store.read;
  const seen = useRef(new Set<string>());
  const reconcile = useEffectEvent(() => syncEveningReminders(() => store.read().mornings));
  const receive = useEffectEvent((response: NotificationResponse) => {
    const request = response.notification.request;
    if (!request.identifier.startsWith(eveningReminder.prefix)) return;
    const data = parseEveningData(request.content.data);
    const responseKey = `${request.identifier}:${data?.offeredAt}:${response.actionIdentifier}`;
    if (seen.current.has(responseKey)) return;
    seen.current.add(responseKey);
    void clearEveningResponse(request.identifier).catch(() => {});
    const valid = () => !!data && canAnswerEveningReminder(store.read().mornings.find(row => row.localDate === data.localDate), data, Date.now());
    if (!data || !valid()) return;
    const answer = (done: boolean) => {
      // Recheck after an Alert was left open across midnight/removal/Done.
      if (valid()) store.update(state => updateStepDone(state, data.localDate, done));
      void reconcile();
    };
    if (response.actionIdentifier === eveningReminder.yes) answer(true);
    else if (response.actionIdentifier === eveningReminder.notToday) answer(false);
    else if (response.actionIdentifier === 'expo.modules.notifications.actions.DEFAULT') {
      router.replace('/home');
      Alert.alert(reminderCopy.question, undefined, [
        { text: 'Yes', onPress: () => answer(true) },
        { text: 'Not today', onPress: () => answer(false) },
      ], { cancelable: true });
    }
  });

  useEffect(() => {
    if (!store.ready || !store.state.setupComplete) return;
    let stopped = false; let stopListening: (() => void) | undefined;
    void listenToEveningReminders(() => read().mornings, response => { if (!stopped) receive(response); })
      .then(stop => { if (stopped) stop(); else stopListening = stop; }).catch(() => {});
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void reconcile(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void reconcile(); }, 60_000);
    return () => { stopped = true; stopListening?.(); foreground.remove(); clearInterval(timer); };
  }, [store.ready, store.state.setupComplete, read]);
  useEffect(() => {
    if (store.ready && store.state.setupComplete) void reconcile();
  }, [store.ready, store.state.setupComplete, store.state.mornings]);
  return null;
}
