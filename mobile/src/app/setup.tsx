import React, { useEffect, useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Card, Field, PillButton, Screen, SectionHeading } from '../ui';
import { GoalEditor } from '../GoalEditor';
import { Recorder } from '../Recorder';
import { MomentEditor } from '../MomentEditor';
import { MomentPhoto } from '../MomentPhoto';
import { deleteMomentFiles } from '../moments';
import { TextAction } from '../TextAction';
import { messageLabels, useStore, type MessageClip } from '../store';
import { apiPost, checkConnection, ensureIdentity } from '../api';
import { getAuthorization, requestAuthorization, scheduleDaily, nativeAlarmUnavailableReason } from '../../modules/aamu-alarm';
import { requestEveningReminderPermission } from '../reminders/native';
import { requestPartnerRefresh, usePartner } from '../partner';
import { PartnerSetup } from '../PartnerSetup';
import { useAlarmControl } from '../useAlarmControl';
import { colors } from '../../../src/theme';
import { demoEnabled, demoText } from '../demo/config';
import { changeClinicSharing } from '../../../shared/demo/clinic';
import { clinicSynchronizer } from '../ClinicSyncCoordinator';

const titles = ['Goals', 'Moments', 'Place sound', 'Alarm', 'Partner', 'Your people'];
export default function Setup() {
  const store = useStore();
  const realPartner = usePartner();
  const alarmControl = useAlarmControl();
  const params = useLocalSearchParams<{ step?: string; goalId?: string; add?: string; tour?: string }>();
  const requestedStep = params.step === undefined ? undefined : Number(params.step);
  const step = requestedStep !== undefined && Number.isFinite(requestedStep)
    ? Math.max(0, Math.min(5, Math.trunc(requestedStep))) : store.state.setupStep;
  const [editorKey, setEditorKey] = useState(params.goalId ?? 'first');
  const [goalId, setGoalId] = useState<string | undefined>(params.goalId);
  const [messageLevel, setMessageLevel] = useState<MessageClip['level'] | null>(
    params.add === 'easy' || params.add === 'medium' || params.add === 'hard' ? params.add : null);
  const [placeRecording, setPlaceRecording] = useState(false);
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(store.safePerson?.name ?? '');
  const [number, setNumber] = useState(store.safePerson?.number ?? '');
  const [clinicCode, setClinicCode] = useState(store.state.clinicSharing?.code ?? '');
  const [time, setTime] = useState(() => { const date = new Date(); if (store.state.alarm) date.setHours(store.state.alarm.hour, store.state.alarm.minute, 0, 0); return date; });
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [alarmAuthorized, setAlarmAuthorized] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pairCode, setPairCode] = useState(''); const [createdCode, setCreatedCode] = useState('');
  const [paired, setPaired] = useState(false);
  useEffect(() => { void getAuthorization().then(value => setAlarmAuthorized(value === 'authorized')); }, [step]);
  const editing = store.state.setupComplete;
  const returnToTour = editing && step === 4 && params.tour === '1';
  function move(next: number) {
    setNotice('');
    if (params.step !== undefined) router.setParams({ step: String(next) });
    if (!editing) store.update(state => ({ ...state, setupStep: next }));
  }
  async function saveAlarm() {
    setBusy(true); setNotice('');
    try {
      const authorization = await requestAuthorization();
      setPermissionDenied(authorization === 'denied');
      if (authorization !== 'authorized') {
        setNotice(authorization === 'denied' ? 'Allow alarms in Settings to continue.' : nativeAlarmUnavailableReason); return;
      }
      const plan = await scheduleDaily(time.getHours(), time.getMinutes());
      store.update(state => ({ ...state, alarm: { hour: time.getHours(), minute: time.getMinutes(), enabled: true },
        ...(state.demoSeed ? { demoSeed: { ...state.demoSeed, nativeAlarmSetupPending: false } } : {}),
        alarmScheduleHistory: [...(state.alarmScheduleHistory ?? []), { effectiveAt: Date.now(), hour: time.getHours(), minute: time.getMinutes(), enabled: true, utcOffsetMinutes: -new Date().getTimezoneOffset() }],
        nativeScheduleHorizonEnd: plan.horizonEnd ? Date.parse(plan.horizonEnd) : null }));
      setAlarmAuthorized(true);
      const reminderPermission = await requestEveningReminderPermission();
      setNotice(reminderPermission === 'authorized' ? 'Your alarm is set.'
        : 'Your alarm is set. Evening reminders are unavailable. You can allow notifications in Settings.');
    } catch { setNotice('Your alarm could not be set. Please try again.'); }
    finally { setBusy(false); }
  }
  async function finish() {
    setBusy(true); setNotice('');
    try {
      if (!store.read().goals.some(goal => goal.approved) || !store.read().alarm) { setNotice('Add a goal and set your alarm before continuing.'); return; }
      if (await getAuthorization() !== 'authorized') { setPermissionDenied(true); setNotice('Allow alarms in Settings to continue.'); return; }
      if (!await checkConnection()) { setNotice('Connect to the internet to finish setup.'); return; }
      await ensureIdentity();
      store.update(state => ({ ...state, setupComplete: true, setupStep: 5 }));
      router.replace('/home');
    } catch { setNotice('Aamu could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  async function pair(create: boolean) {
    setBusy(true); setNotice('');
    try {
      const result = await apiPost<{ code?: string; paired?: boolean }>('/partner/match', { mode: 'code', ...(create ? {} : { code: pairCode.trim() }) });
      requestPartnerRefresh();
      if (result.code) setCreatedCode(result.code);
      if (result.paired) { setPaired(true); setNotice('You’re connected.'); }
    } catch { setNotice('We couldn’t connect you this time. Please try again.'); }
    finally { setBusy(false); }
  }
  const canContinue = step === 0 ? store.state.goals.some(goal => goal.approved)
    : step === 3 ? Boolean(store.state.alarm && alarmAuthorized) : true;
  return <Screen scroll header={<View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="label">aamu</AppText>
      {(editing || step > 0) && <PillButton label="Back" variant="quiet" style={{ width: 112 }} onPress={() => returnToTour ? router.replace('/how') : editing ? router.back() : move(step - 1)} />}
    </View>
    <AppText variant="caption" tone="secondary">{editing ? titles[step] : `${step + 1} of 6 · ${titles[step]}`}</AppText>
  </View>} footer={!messageLevel && !placeRecording ? <View style={{ gap: 10 }}>
    {notice || (step === 3 && alarmControl.notice) ? <AppText tone="secondary" accessibilityLiveRegion="polite">{notice || alarmControl.notice}</AppText> : null}
    {permissionDenied && <PillButton label="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />}
    <PillButton label={returnToTour ? 'Ring alarm' : editing ? 'Back to Home' : step === 5 ? 'Begin' : 'Continue'} variant={returnToTour ? 'primary' : editing ? 'quiet' : 'primary'} disabled={!canContinue} loading={busy}
      onPress={() => returnToTour ? router.replace('/demo?tour=1') : editing ? router.replace('/home') : step === 5 ? void finish() : move(step + 1)} />
    {!editing && [1, 2, 4, 5].includes(step) && <PillButton label="Skip for now" variant="quiet" disabled={busy}
      onPress={() => step === 5 ? void finish() : move(step + 1)} />}
  </View> : undefined}>
    {step === 0 && <>
      <GoalEditor key={editorKey} goalId={goalId} onApproved={() => {}} />
      {store.state.goals.filter(goal => goal.approved).map(goal => <PillButton key={goal.id} variant="quiet" label={goal.goalText}
        onPress={() => { setGoalId(goal.id); setEditorKey(goal.id); }} />)}
      {store.state.goals.length < 3 && store.state.goals.every(goal => goal.approved) && <PillButton label="Add another" variant="secondary"
        onPress={() => { setGoalId(undefined); setEditorKey(`new-${Date.now()}`); }} />}
    </>}
    {step === 1 && (messageLevel ? <MomentEditor title={messageLabels[messageLevel]} onCancel={() => setMessageLevel(null)} onSave={moment => {
      store.update(state => ({ ...state, messages: [...state.messages, { ...moment, level: messageLevel, blocked: false, createdAt: Date.now(), timesPlayed: 0, timesFollowedByDoneStep: 0, lastPlayedAt: null }] }));
      setMessageLevel(null);
    }} /> : <>
      <SectionHeading title="A moment from a good day" description="A photo you like, and the sound around it if you want. Aamu shows one after you get up." />
      {(Object.keys(messageLabels) as MessageClip['level'][]).map(level => {
        const moments = store.state.messages.filter(message => message.level === level && !message.blocked);
        return <Card key={level}>
          <AppText variant="label">{messageLabels[level]}</AppText>
          <AppText tone="secondary">{moments.length === 1 ? '1 moment' : `${moments.length} moments`}</AppText>
          {moments.map((moment, index) => <View key={moment.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <MomentPhoto uri={moment.photoUri} style={{ width: 72, aspectRatio: 1, borderRadius: 16 }} />
            <AppText tone="secondary" style={{ flex: 1 }}>{moment.photoUri ? (moment.uri ? 'Photo and sound' : 'Photo') : 'Recording'}</AppText>
            <TextAction label="Remove" accessibilityLabel={`Remove moment ${index + 1}`} onPress={() => {
              deleteMomentFiles(moment);
              store.update(state => ({ ...state, messages: state.messages.filter(item => item.id !== moment.id) }));
            }} />
          </View>)}
          <PillButton label="Add a moment" variant="secondary" onPress={() => setMessageLevel(level)} />
        </Card>;
      })}
      {store.state.messages.some(message => message.blocked) && <Card>
        <AppText variant="label">Resting moments</AppText>
        {store.state.messages.filter(message => message.blocked).map((message, index) => <PillButton
          key={message.id} label={`Restore moment ${index + 1}`} variant="secondary"
          onPress={() => store.update(state => ({ ...state, messages: state.messages.map(item => item.id === message.id ? { ...item, blocked: false } : item) }))}
        />)}
      </Card>}
    </>)}
    {step === 2 && (placeRecording ? <Recorder title="Your place sound" maxSeconds={30} onCancel={() => setPlaceRecording(false)} onSave={clip => {
      store.update(state => ({ ...state, place: 'personal', placeClip: clip })); setPlaceRecording(false);
    }} /> : <>
      <SectionHeading title="Somewhere to begin" description="Choose the sound for your dawn." />
      {(['sea', 'forest'] as const).map(place => <PillButton key={place} label={`${place === 'sea' ? 'Sea' : 'Forest'}${store.state.place === place ? ' · Selected' : ''}`}
        variant={store.state.place === place ? 'primary' : 'secondary'} onPress={() => store.update(state => ({ ...state, place }))} />)}
      {store.state.placeClip && <PillButton label={`Your recording${store.state.place === 'personal' ? ' · Selected' : ''}`} variant="secondary" onPress={() => store.update(state => ({ ...state, place: 'personal' }))} />}
      <PillButton label="Record your place" variant="secondary" onPress={() => setPlaceRecording(true)} />
      <AppText tone="secondary">Up to 30 seconds. Your recording stays on this phone.</AppText>
    </>)}
    {step === 3 && <>
      <SectionHeading title="Your morning begins here" description="One alarm, every day. You can turn it off in Settings." />
      {editing && store.state.alarm && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <AppText>Alarm</AppText>
          <Switch
            accessibilityLabel="Alarm"
            value={store.state.alarm.enabled}
            disabled={busy || alarmControl.busy}
            onValueChange={enabled => { setNotice(''); void alarmControl.setEnabled(enabled); }}
            trackColor={{ false: colors.lineQuiet, true: colors.textSecondary }}
            thumbColor={colors.textPrimary}
            ios_backgroundColor={colors.lineQuiet}
          />
        </View>
      </Card>}
      {Platform.OS === 'web' ? <AppText tone="secondary">Set the alarm in the iOS app.</AppText> : <>
        {Platform.OS === 'android' && <PillButton label="Choose time" variant="secondary" onPress={() => setShowPicker(true)} />}
        {showPicker && <DateTimePicker value={time} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} themeVariant="dark" onValueChange={(_event, value) => {
          if (Platform.OS === 'android') setShowPicker(false); setTime(value);
        }} onDismiss={() => { if (Platform.OS === 'android') setShowPicker(false); }} />}
      </>}
      <PillButton label="Set alarm" variant={editing ? 'primary' : 'secondary'} outlined={!editing} onPress={() => void saveAlarm()} loading={busy} disabled={alarmControl.busy} />
    </>}
    {step === 4 && <PartnerSetup paired={paired || realPartner.paired} partnerUp={realPartner.partnerUpToday}
      createdCode={createdCode} pairCode={pairCode} busy={busy} primaryAvailable={editing && !returnToTour}
      onChangeCode={setPairCode} onCreateCode={() => void pair(true)} onConnect={() => void pair(false)} />}
    {step === 5 && <>
      <SectionHeading title="Your people" description="Someone you can call when you want a little company." />
      <Card><Field label="Safe person’s name" value={name} onChangeText={setName} textContentType="name" />
        <Field label="Phone number" value={number} onChangeText={setNumber} keyboardType="phone-pad" />
        <AppText tone="secondary">Their name and number stay on this phone.</AppText>
        {demoEnabled && <AppText variant="caption" tone="secondary">Demo: calls and texts are simulated, even after you replace this contact.</AppText>}
        <PillButton label="Save safe person" variant="secondary" disabled={!name.trim() || !number.trim()} onPress={() => {
          void store.saveSafePerson({ name: name.trim(), number: number.trim() }).then(() => setNotice('Saved on this phone.')).catch(() => setNotice('Couldn’t save. Please try again.'));
        }} />
      </Card>
      {demoEnabled && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <AppText>{demoText('Demo clinic sharing', 'Clinic sharing')}</AppText>
          <Switch accessibilityLabel={demoText('Demo clinic sharing', 'Clinic sharing')} value={Boolean(store.state.clinicSharing?.enabled)}
            onValueChange={enabled => store.update(state => changeClinicSharing(state, enabled, clinicCode))}
            trackColor={{ false: colors.lineQuiet, true: colors.textSecondary }} thumbColor={colors.textPrimary} ios_backgroundColor={colors.lineQuiet} />
        </View>
        <Field label={demoText('Demo clinic code', 'Clinic code')} value={clinicCode} onChangeText={setClinicCode} autoCapitalize="characters" autoCorrect={false} />
        <AppText variant="caption" tone="secondary">{demoText('This connects to the demo clinic dashboard. No real clinician receives a request.', 'Your clinic sees your recent mornings.')}</AppText>
        <AppText variant="caption" tone="secondary">{store.state.clinicSharing?.syncPending ? 'Waiting to connect.'
          : store.state.clinicSharing?.enabled ? demoText('Connected to the demo clinic.', 'Connected to your clinic.') : 'Clinic sharing is off.'}</AppText>
        <PillButton label="Save clinic connection" variant="secondary" loading={busy} disabled={Boolean(store.state.clinicSharing?.enabled && !clinicCode.trim())} onPress={() => {
          store.update(state => changeClinicSharing(state, Boolean(state.clinicSharing?.enabled), clinicCode));
          setBusy(true); setNotice('');
          void clinicSynchronizer(store).flush().then(ok => setNotice(ok ? demoText('Demo clinic connection saved.', 'Clinic connection saved.') : demoText('The demo clinic could not connect. Please try again.', 'Your clinic could not connect. Please try again.')))
            .finally(() => setBusy(false));
        }} />
      </Card>}
    </>}
  </Screen>;
}
