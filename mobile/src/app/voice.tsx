import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { AppText, Card, PillButton } from '../ui';
import { SceneScreen } from '../SceneScreen';
import { usePartner } from '../partner';
import { localDate, useStore } from '../store';
import { finishVoice, morningTiming } from '../morning';
import { analyzeRecording, isNativeVoiceAnalysisAvailable } from '../../modules/aamu-voice';
import type { VoiceState } from '../../../shared/mornings/engine';
import { skyProgressForClock } from '../../../src/theme';

export default function Voice() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [fallbackDay] = useState(() => localDate()); const date = params.date ?? fallbackDay;
  const store = useStore(); const [phase, setPhase] = useState<'starting' | 'recording' | 'analyzing'>('starting');
  const partner = usePartner();
  const [skyNow, setSkyNow] = useState(() => Date.now());
  const morning = store.state.mornings.find(item => item.localDate === date);
  const early = morning?.upAt !== null && morning?.upAt !== undefined && morning.upAt < morning.scheduledAt;
  const skyStartedAt = morning?.skyTransitionStartedAt;
  const sunriseProgress = skyStartedAt === undefined ? 1 : Math.min(1, Math.max(0, (skyNow - skyStartedAt) / morningTiming.skyFinishMs));
  const skyFrom = morning?.skyTransitionFrom ?? 1;
  const skyClock = new Date(skyNow);
  const skyProgress = early ? morning?.skyTransitionFrom ?? skyProgressForClock(skyClock.getHours(), skyClock.getMinutes())
    : skyFrom + (1 - skyFrom) * sunriseProgress;
  const finished = useRef(false); const active = useRef(false); const fileUri = useRef<string | null>(null);
  const endRef = useRef<(complete: boolean) => Promise<void>>(async () => {});
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'cache' }, status => {
    if (finished.current) return;
    if (status.hasError || status.mediaServicesDidReset) void endRef.current(false);
    else if (status.isFinished) { if (status.url) fileUri.current = status.url; void endRef.current(true); }
  });
  const capture = useAudioRecorderState(recorder, 100);
  useEffect(() => {
    if (skyStartedAt === undefined || early || Date.now() >= skyStartedAt + morningTiming.skyFinishMs) return;
    const timer = setInterval(() => {
      const now = Date.now(); setSkyNow(now);
      if (now >= skyStartedAt + morningTiming.skyFinishMs) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [early, skyStartedAt]);
  async function finish(state: VoiceState, measurement?: { speechShare: number; speechOnsetMs: number | null }) {
    if (finished.current) return; finished.current = true;
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* Outcome already records failure/skip. */ }
    try { await setAudioModeAsync({ allowsRecording: false }); } catch { /* No audio leaves the phone. */ }
    store.update(old => finishVoice(old, date, state, measurement));
    const uri = fileUri.current ?? recorder.uri;
    if (uri?.startsWith(Paths.cache.uri)) { try { const file = new File(uri); if (file.exists) file.delete(); } catch {} }
    router.replace(`/message?date=${date}`);
  }
  async function analyze(complete: boolean) {
    if (finished.current || !active.current) return; active.current = false;
    if (!complete) { await finish('failed'); return; }
    setPhase('analyzing');
    try {
      const uri = fileUri.current ?? recorder.uri;
      if (!uri) { await finish('failed'); return; }
      const result = await analyzeRecording(uri, { recordingComplete: true });
      await finish(result.status, result.status === 'spoke' || result.status === 'silent'
        ? { speechShare: result.speechShare ?? 0, speechOnsetMs: result.speechOnsetMs } : undefined);
    } catch { await finish('failed'); }
  }
  const onRecordingEnded = useEffectEvent((complete: boolean) => analyze(complete));
  useEffect(() => {
    endRef.current = complete => onRecordingEnded(complete);
    return () => { endRef.current = async () => {}; };
  }, []);
  const onVoiceEntry = useEffectEvent((entryDate: string) => {
    const morning = store.read().mornings.find(item => item.localDate === entryDate);
    if (!morning || morning.phase !== 'voice' || morning.upAt === null) { router.replace('/home'); return null; }
    if (morning.voiceStartedAt) { void finish('failed'); return null; }
    const early = morning.upAt < morning.scheduledAt;
    // The stage is already visible. Only microphone startup waits for the
    // remaining global two-second sound fade; early holds have no dawn sound.
    return early ? 0 : Math.max(0, morning.upAt + morningTiming.soundFadeMs - Date.now());
  });
  const onStartRecording = useEffectEvent(async (entryDate: string, isDisposed: () => boolean) => {
    if (isDisposed() || finished.current) return;
    if (!isNativeVoiceAnalysisAvailable) { await finish('unavailable'); return; }
    try {
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await requestRecordingPermissionsAsync();
      if (isDisposed() || finished.current) return;
      if (!permission.granted) { await finish('unavailable'); return; }
      if (AppState.currentState === 'background') { await finish('failed'); return; }
      await setAudioModeAsync({ allowsRecording: true, allowsBackgroundRecording: false, shouldPlayInBackground: false, interruptionMode: 'doNotMix' });
      await recorder.prepareToRecordAsync();
      if (isDisposed() || finished.current) return;
      fileUri.current = recorder.uri; active.current = true;
      store.update(old => ({ ...old, mornings: old.mornings.map(item => item.localDate === entryDate ? { ...item, voiceStartedAt: Date.now() } : item) }));
      recorder.record({ forDuration: 5 }); setPhase('recording');
    } catch { if (!isDisposed()) await finish('failed'); }
  });
  const onAppStateChange = useEffectEvent((next: string) => {
    if (next !== 'active' && active.current) void analyze(false);
    else if (next === 'background' && !finished.current) void finish('failed');
  });
  useEffect(() => {
    let disposed = false;
    const remainingFade = onVoiceEntry(date);
    const timer = remainingFade === null ? undefined : setTimeout(() => {
      void onStartRecording(date, () => disposed);
    }, remainingFade);
    const lifecycle = AppState.addEventListener('change', next => onAppStateChange(next));
    return () => {
      disposed = true; clearTimeout(timer); lifecycle.remove();
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    };
  }, [date, recorder]);
  const currentDayEnabled = Boolean(store.state.alarm?.enabled && morning?.level !== 'off' && date === localDate(new Date(skyNow)));
  return <SceneScreen progress={skyProgress} up={Boolean(currentDayEnabled && morning?.upAt)} sunriseProgress={early ? 1 : sunriseProgress}
    paired={partner.paired} partnerUp={currentDayEnabled && partner.localDate === date && partner.partnerUpToday}
    header={<AppText variant="label">aamu</AppText>}
    footer={<PillButton label="Skip" variant="quiet" outlined onPress={() => void finish('skipped')} />}>
    <View style={{ gap: 12 }}>
      <AppText variant="title">A moment for your voice</AppText>
      <AppText tone="secondary">Say a few words, if you like.</AppText>
    </View>
    <Card tone="protected"><AppText align="center" variant="step">{phase === 'recording' ? Math.max(0, 5 - Math.floor(capture.durationMillis / 1000)) : phase === 'analyzing' ? 'One moment…' : 'Getting ready…'}</AppText></Card>
  </SceneScreen>;
}
