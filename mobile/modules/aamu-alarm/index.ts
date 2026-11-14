import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type AlarmAuthorization = 'notDetermined' | 'authorized' | 'denied' | 'unavailable';
export type NativeAlarmEvent = {
  sequence: number;
  type: 'ring' | 'stop' | 'snooze' | 'app_open';
  source: 'system_intent' | 'native_observer' | 'app';
  occurredAt: string;
  alarmId: string;
  originalScheduledAt: string;
  localDate: string;
  offsetMinutes: number;
};
export type NativeAlarmSnapshot = {
  id: string;
  state: 'scheduled' | 'countdown' | 'paused' | 'alerting' | 'unknown';
  kind: 'daily' | 'snooze';
  scheduledAt: string;
  originalScheduledAt: string;
  localDate: string;
  offsetMinutes: number;
};
export type AlarmPlan = {
  enabled: boolean;
  hour: number | null;
  minute: number | null;
  horizonEnd: string | null;
  alarms: NativeAlarmSnapshot[];
};

interface AamuAlarmNative {
  preparePrivateStorage(): Promise<{ audioDirectoryUri: string }>;
  protectPrivateAudioFile(uri: string): Promise<string>;
  getAuthorization(): Promise<AlarmAuthorization>;
  requestAuthorization(): Promise<AlarmAuthorization>;
  scheduleDaily(hour: number, minute: number): Promise<AlarmPlan>;
  scheduleSnooze(seconds: number): Promise<AlarmPlan>;
  stopCurrentOccurrence(): Promise<AlarmPlan>;
  cancelToday(): Promise<AlarmPlan>;
  rescheduleNext(): Promise<AlarmPlan>;
  cancelAll(): Promise<AlarmPlan>;
  getEvents(afterSequence: number): Promise<NativeAlarmEvent[]>;
  getAlarms(): Promise<AlarmPlan>;
}

const native = Platform.OS === 'ios' || Platform.OS === 'android'
  ? requireOptionalNativeModule<AamuAlarmNative>('AamuAlarm')
  : null;

export const isNativeAlarmAvailable = native !== null;
export const nativeAlarmUnavailableReason = Platform.OS === 'android'
  ? 'A local Android development build with native alarm support is required.'
  : 'A local iOS 26 or later development build is required.';

function implementation(): AamuAlarmNative {
  if (!native) throw new Error(nativeAlarmUnavailableReason);
  return native;
}

export const getAuthorization = (): Promise<AlarmAuthorization> =>
  native ? native.getAuthorization() : Promise.resolve('unavailable');
export const requestAuthorization = (): Promise<AlarmAuthorization> =>
  native ? native.requestAuthorization() : Promise.resolve('unavailable');
export const scheduleDaily = (hour: number, minute: number) =>
  implementation().scheduleDaily(hour, minute);
export const scheduleSnooze = (seconds = 300) => implementation().scheduleSnooze(seconds);
export const stopCurrentOccurrence = () => implementation().stopCurrentOccurrence();
export const cancelToday = () => implementation().cancelToday();
export const rescheduleNext = () => implementation().rescheduleNext();
export const cancelAll = () => implementation().cancelAll();
export const getEvents = (afterSequence = 0): Promise<NativeAlarmEvent[]> =>
  native ? native.getEvents(afterSequence) : Promise.resolve([]);
export const getAlarms = () => implementation().getAlarms();
export const prepareNativePrivateStorage = () => implementation().preparePrivateStorage();
export const protectNativePrivateAudioFile = (uri: string) => implementation().protectPrivateAudioFile(uri);
