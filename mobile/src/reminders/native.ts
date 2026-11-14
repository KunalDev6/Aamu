import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { IosAuthorizationStatus } from 'expo-notifications/build/NotificationPermissions.types';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications/build/NotificationChannelManager.types';
import { canAnswerEveningReminder, eveningReminder, parseEveningData, planEveningReminder,
  reconcileEveningQueue, type EveningMorning } from '../../../shared/reminders/evening';

export type EveningPermission = 'authorized' | 'denied' | 'notDetermined' | 'unavailable';
export const reminderCopy = { title: 'Your step today', question: 'Did you do your step today?' };
const channel = 'aamu_evening';

// Do not import the package barrel: it loads push-token auto-registration.
// These pinned SDK58 modules expose local APIs without that side effect.
async function loadLocalNotifications() {
  if (Platform.OS === 'web' || !requireOptionalNativeModule('ExpoNotificationScheduler')) return null;
  const [permissions, categories, schedule, pending, cancel, presented, dismiss, emitter, handler, channels] = await Promise.all([
    import('expo-notifications/build/NotificationPermissions'),
    import('expo-notifications/build/setNotificationCategoryAsync'),
    import('expo-notifications/build/scheduleNotificationAsync'),
    import('expo-notifications/build/getAllScheduledNotificationsAsync'),
    import('expo-notifications/build/cancelScheduledNotificationAsync'),
    import('expo-notifications/build/getPresentedNotificationsAsync'),
    import('expo-notifications/build/dismissNotificationAsync'),
    import('expo-notifications/build/NotificationsEmitter'),
    import('expo-notifications/build/NotificationsHandler'),
    import('expo-notifications/build/setNotificationChannelAsync'),
  ]);
  return { ...permissions, ...categories, ...schedule, ...pending, ...cancel, ...presented, ...dismiss, ...emitter, ...handler, ...channels };
}
type LocalNotifications = NonNullable<Awaited<ReturnType<typeof loadLocalNotifications>>>;
let loaded: ReturnType<typeof loadLocalNotifications> | undefined;
function api() { return loaded ??= loadLocalNotifications().catch(() => { loaded = undefined; return null; }); }

function permissionFrom(result: Awaited<ReturnType<LocalNotifications['getPermissionsAsync']>>): EveningPermission {
  if (Platform.OS === 'ios') {
    if ([IosAuthorizationStatus.AUTHORIZED, IosAuthorizationStatus.PROVISIONAL, IosAuthorizationStatus.EPHEMERAL].some(status => status === result.ios?.status)) return 'authorized';
    return result.ios?.status === IosAuthorizationStatus.DENIED ? 'denied' : 'notDetermined';
  }
  return result.granted ? 'authorized' : result.canAskAgain ? 'notDetermined' : 'denied';
}

async function configure(notifications: LocalNotifications) {
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync(channel, {
    name: 'Evening step reminder', importance: AndroidImportance.DEFAULT,
    sound: null, enableVibrate: false, lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
  await notifications.setNotificationCategoryAsync(eveningReminder.category, [
    { identifier: eveningReminder.yes, buttonTitle: 'Yes', options: { opensAppToForeground: true } },
    { identifier: eveningReminder.notToday, buttonTitle: 'Not today', options: { opensAppToForeground: true } },
  ], { showTitle: false, showSubtitle: false, customDismissAction: false });
}

/** Called only by the explicit Alarm setup action. Denial never blocks AlarmKit. */
export async function requestEveningReminderPermission(): Promise<EveningPermission> {
  try {
    const notifications = await api();
    if (!notifications) return 'unavailable';
    await configure(notifications);
    return permissionFrom(await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: false } }));
  } catch { return 'unavailable'; }
}

let writes: Promise<unknown> = Promise.resolve();
/** Serialized operations read fresh state after native awaits. A newer Done or
 * removal queues behind an in-flight schedule and cancels it deterministically. */
export function syncEveningReminders(read: () => readonly EveningMorning[]): Promise<EveningPermission> {
  const operation = writes.catch(() => {}).then(async (): Promise<EveningPermission> => {
    const notifications = await api();
    if (!notifications) return 'unavailable';
    const permission = permissionFrom(await notifications.getPermissionsAsync());
    const [pending, presented] = await Promise.all([notifications.getAllScheduledNotificationsAsync(), notifications.getPresentedNotificationsAsync()]);
    const delta = reconcileEveningQueue(permission === 'authorized' ? read() : [],
      pending.map(row => ({ identifier: row.identifier, data: row.content.data })),
      presented.map(row => ({ identifier: row.request.identifier, data: row.request.content.data })), Date.now());
    for (const id of delta.cancel) await notifications.cancelScheduledNotificationAsync(id);
    for (const id of delta.dismiss) await notifications.dismissNotificationAsync(id);
    if (permission !== 'authorized') return permission;
    await configure(notifications);
    for (const plan of delta.schedule) {
      const current = read().find(row => row.localDate === plan.data.localDate);
      if (!current || planEveningReminder(current, Date.now())?.data.offeredAt !== plan.data.offeredAt) continue;
      await notifications.scheduleNotificationAsync({ identifier: plan.identifier,
        content: { title: reminderCopy.title, body: reminderCopy.question, data: plan.data,
          categoryIdentifier: eveningReminder.category, sound: false },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: new Date(plan.dueAt), channelId: channel },
      });
    }
    return permission;
  }).catch((): EveningPermission => 'unavailable');
  writes = operation;
  return operation;
}

export async function listenToEveningReminders(read: () => readonly EveningMorning[],
  receive: (response: NotificationResponse) => void): Promise<() => void> {
  const notifications = await api();
  if (!notifications) return () => {};
  notifications.setNotificationHandler({ handleNotification: async notification => {
    const data = parseEveningData(notification.request.content.data);
    const show = !!data && canAnswerEveningReminder(read().find(row => row.localDate === data.localDate), data, Date.now());
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: false, shouldSetBadge: false };
  } });
  const listener = notifications.addNotificationResponseReceivedListener(receive);
  const last = notifications.getLastNotificationResponse();
  if (last) receive(last);
  return () => { listener.remove(); notifications.setNotificationHandler(null); };
}

export async function clearEveningResponse(identifier: string): Promise<void> {
  const notifications = await api();
  if (!notifications) return;
  await notifications.dismissNotificationAsync(identifier);
  const last = notifications.getLastNotificationResponse();
  if (last?.notification.request.identifier === identifier) notifications.clearLastNotificationResponse();
}
