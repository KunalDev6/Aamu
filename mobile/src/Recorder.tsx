import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { uuid } from 'expo';
import {
  getRecordingPermissionsAsync, requestRecordingPermissionsAsync, RecordingPresets,
  setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import type { RecordingStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { AppText, Card, PillButton, SectionHeading } from './ui';
import { preparePrivateStorage, protectPrivateAudioFile } from './privateAudio';

export type PersonalClip = { id: string; uri: string; durationMs: number };
export type RecorderProps = {
  title: string;
  maxSeconds: number;
  onSave: (clip: PersonalClip) => void;
  onCancel: () => void;
};

type Phase = 'idle' | 'preparing' | 'recording' | 'stopping' | 'ready' | 'saving' | 'denied' | 'error' | 'closed';
const recordingOptions = { ...RecordingPresets.HIGH_QUALITY, directory: 'cache' as const };
const clock = (milliseconds: number) => {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Personal recordings only. The automatic five-second sensing sample is separate. */
export function Recorder(props: RecorderProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.stack}>
        <SectionHeading title={props.title} />
        <AppText tone="secondary">Recording is available in the phone app.</AppText>
        <PillButton label="Cancel" variant="quiet" onPress={props.onCancel} />
      </View>
    );
  }
  return <NativeRecorder key={`${props.title}:${props.maxSeconds}`} {...props} />;
}

function NativeRecorder({ title, maxSeconds, onSave, onCancel }: RecorderProps) {
  const limit = Number.isFinite(maxSeconds) && maxSeconds > 0 ? Math.min(30, maxSeconds) : 0;
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const mounted = useRef(true);
  const phaseRef = useRef<Phase>('idle');
  const operation = useRef(0);
  const exiting = useRef(false);
  const temporaryUris = useRef(new Set<string>());
  const currentUri = useRef<string | null>(null);
  const pendingPrepare = useRef<Promise<void> | null>(null);
  const pendingCopy = useRef<Promise<void> | null>(null);
  const uncommittedFile = useRef<File | null>(null);
  const stopTask = useRef<Promise<void> | null>(null);
  const handlingRecordingError = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusListener = useRef<(status: RecordingStatus) => void>(() => {});
  const finishRef = useRef<(alreadyStopped?: boolean, uri?: string | null) => Promise<void>>(async () => {});
  const recorder = useAudioRecorder(recordingOptions, status => statusListener.current(status));
  const recorderState = useAudioRecorderState(recorder, 100);
  // Keep the native object stable: changing the hook's source recreates it.
  const player = useAudioPlayer(null, { updateInterval: 100, allowsExternalPlayback: false });
  const playback = useAudioPlayerStatus(player);

  const transition = useCallback((next: Phase) => {
    phaseRef.current = next;
    if (mounted.current) setPhase(next);
  }, []);

  const clearLimitTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const removeTemporaryFiles = useCallback(() => {
    for (const uri of temporaryUris.current) {
      try {
        // Never delete an approved document file or another recorder's files.
        if (uri.startsWith(Paths.cache.uri)) {
          const file = new File(uri);
          if (file.exists) file.delete();
        }
      } catch { /* Cache cleanup can be retried by the OS; never log audio paths. */ }
    }
    temporaryUris.current.clear();
  }, []);

  const cleanup = useCallback(async () => {
    clearLimitTimer();
    try { player.pause(); } catch { /* The hook may already have released it. */ }
    try { await pendingPrepare.current; } catch { /* Preparation was cancelled/failed. */ }
    try { if (recorder.isRecording) await recorder.stop(); } catch { /* Hook disposal also stops capture. */ }
    try { await pendingCopy.current; } catch { /* A partial destination is removed below. */ }
    const abandoned = uncommittedFile.current;
    uncommittedFile.current = null;
    try { if (abandoned?.exists) abandoned.delete(); } catch { /* No raw file errors or paths leave this component. */ }
    removeTemporaryFiles();
  }, [clearLimitTimer, player, recorder, removeTemporaryFiles]);

  useEffect(() => {
    mounted.current = true;
    exiting.current = false;
    return () => {
      mounted.current = false;
      operation.current += 1;
      exiting.current = true;
      void cleanup();
      // expo-audio hooks own native player/recorder disposal.
    };
  }, [cleanup]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active' || phaseRef.current !== 'denied') return;
      const token = operation.current;
      void getRecordingPermissionsAsync().then(permission => {
        if (mounted.current && token === operation.current && phaseRef.current === 'denied' && permission.granted) {
          setMessage(null);
          transition('idle'); // Returning from Settings never starts recording.
        }
      }).catch(() => {});
    });
    return () => subscription.remove();
  }, [transition]);

  const finishRecording = useCallback(async (alreadyStopped = false, eventUri?: string | null) => {
    if (stopTask.current) return stopTask.current;
    if (!['recording', 'stopping'].includes(phaseRef.current)) return;
    const token = operation.current;
    clearLimitTimer();
    setDurationMs(Math.min(limit * 1000, Math.max(0, recorderState.durationMillis)));
    transition('stopping');
    const task = (async () => {
      try {
        if (!alreadyStopped && recorder.isRecording) await recorder.stop();
        const uri = eventUri ?? recorder.uri ?? currentUri.current;
        if (uri) temporaryUris.current.add(uri);
        await setAudioModeAsync({ allowsRecording: false });
        if (!mounted.current || token !== operation.current) return;
        if (!uri || !uri.startsWith(Paths.cache.uri)) throw new Error('No local recording');
        const file = new File(uri);
        if (!file.exists || file.size <= 0) throw new Error('Empty recording');
        currentUri.current = uri;
        player.replace({ uri });
        setPreviewUri(uri);
        transition('ready');
      } catch {
        if (mounted.current && token === operation.current) {
          setMessage('That recording didn’t finish. You can record again.');
          transition('error');
        }
      } finally { stopTask.current = null; }
    })();
    stopTask.current = task;
    return task;
  }, [clearLimitTimer, limit, player, recorder, recorderState.durationMillis, transition]);
  useEffect(() => { finishRef.current = finishRecording; }, [finishRecording]);

  useEffect(() => { statusListener.current = status => {
    if (!mounted.current || !['recording', 'stopping'].includes(phaseRef.current)) return;
    if (status.url && currentUri.current && status.url !== currentUri.current) return;
    if (status.hasError || status.mediaServicesDidReset) {
      if (handlingRecordingError.current) return;
      handlingRecordingError.current = true;
      const token = ++operation.current;
      clearLimitTimer();
      transition('stopping');
      void (async () => {
        try { if (recorder.isRecording) await recorder.stop(); } catch { /* Native capture is already interrupted. */ }
        try { await setAudioModeAsync({ allowsRecording: false }); } catch { /* No raw native errors leave the component. */ }
        handlingRecordingError.current = false;
        if (mounted.current && token === operation.current) {
          setMessage('That recording didn’t finish. You can record again.');
          transition('error');
        }
      })();
      return;
    }
    if (handlingRecordingError.current) return;
    if (status.isFinished) void finishRef.current(true, status.url);
  }; }, [clearLimitTimer, recorder, transition]);

  async function startRecording() {
    if (!['idle', 'ready', 'error'].includes(phaseRef.current) || !limit || exiting.current) return;
    const token = ++operation.current;
    transition('preparing');
    setMessage(null);
    try {
      let permission = await getRecordingPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) permission = await requestRecordingPermissionsAsync();
      if (!mounted.current || token !== operation.current) return;
      if (!permission.granted) { transition('denied'); return; }
      player.pause();
      player.replace(null);
      setPreviewUri(null);
      removeTemporaryFiles();
      currentUri.current = null;
      setDurationMs(0);
      await setAudioModeAsync({
        allowsRecording: true, allowsBackgroundRecording: false,
        shouldPlayInBackground: false, playsInSilentMode: true, interruptionMode: 'doNotMix',
      });
      if (!mounted.current || token !== operation.current) return;
      const fileName = uuid.v4();
      // Expo 58 documents these cache subdirectories. Track the expected file
      // before preparation so cancellation during preparation can remove it.
      temporaryUris.current.add(new File(Paths.cache, Platform.OS === 'ios' ? 'ExpoAudio' : 'Audio', `${fileName}.m4a`).uri);
      const preparing = recorder.prepareToRecordAsync({ fileName });
      pendingPrepare.current = preparing;
      await preparing;
      pendingPrepare.current = null;
      if (!mounted.current || token !== operation.current) return;
      currentUri.current = recorder.uri;
      if (recorder.uri) temporaryUris.current.add(recorder.uri);
      recorder.record({ forDuration: limit }); // Native limit, including when JS is suspended.
      transition('recording');
      timer.current = setTimeout(() => { void finishRef.current(); }, limit * 1000);
    } catch {
      if (mounted.current && token === operation.current) {
        setMessage('We couldn’t start recording. You can try again.');
        transition('error');
      }
    }
  }

  async function playRecording() {
    if (phaseRef.current !== 'ready' || !player.isLoaded || !previewUri) return;
    const token = operation.current;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
      await player.seekTo(0);
      if (mounted.current && token === operation.current && phaseRef.current === 'ready') player.play();
    } catch { if (mounted.current) setMessage('We couldn’t play this recording. You can record again.'); }
  }

  async function saveRecording() {
    if (phaseRef.current !== 'ready' || !previewUri || !player.isLoaded || player.duration <= 0 || exiting.current) return;
    const token = ++operation.current;
    transition('saving');
    setMessage(null);
    let clip: PersonalClip;
    try {
      player.pause();
      const source = new File(previewUri);
      if (!source.exists || source.size <= 0) throw new Error('Recording unavailable');
      const { audioDirectoryUri } = await preparePrivateStorage();
      if (!mounted.current || token !== operation.current || exiting.current) return;
      const directory = new Directory(audioDirectoryUri);
      directory.create({ idempotent: true, intermediates: true });
      const id = uuid.v4();
      const destination = new File(directory, `${id}.m4a`);
      uncommittedFile.current = destination;
      const copying = source.copy(destination);
      pendingCopy.current = copying;
      await copying;
      pendingCopy.current = null;
      if (!mounted.current || token !== operation.current || exiting.current) {
        if (destination.exists) destination.delete();
        return;
      }
      if (!destination.exists || destination.size <= 0) throw new Error('Recording not copied');
      const protectedUri = await protectPrivateAudioFile(destination.uri);
      if (!mounted.current || token !== operation.current || exiting.current) {
        if (destination.exists) destination.delete();
        return;
      }
      clip = { id, uri: protectedUri, durationMs: Math.min(limit * 1000, Math.round(player.duration * 1000)) };
      uncommittedFile.current = null; // Only completed explicit Save retains private audio.
      removeTemporaryFiles();
      exiting.current = true;
      transition('closed');
    } catch {
      const partial = uncommittedFile.current;
      uncommittedFile.current = null;
      try { if (partial?.exists) partial.delete(); } catch { /* No audio paths/errors are logged. */ }
      if (mounted.current && token === operation.current) {
        setMessage('We couldn’t save this recording. Please try again.');
        transition('ready');
      }
      return;
    }
    onSave(clip);
  }

  async function cancel() {
    if (exiting.current) return;
    exiting.current = true;
    operation.current += 1;
    transition('closed');
    await cleanup();
    try { await setAudioModeAsync({ allowsRecording: false }); } catch { /* Capture is already stopped/disposed. */ }
    if (mounted.current) onCancel();
  }

  async function openSettings() {
    try { await Linking.openSettings(); }
    catch { if (mounted.current) setMessage('Open your phone’s Settings to allow microphone access.'); }
  }

  const readyToSave = playback.isLoaded && playback.duration > 0 && !playback.error && player.isLoaded;
  // Derive the display from audio hook state, avoiding extra effect-triggered
  // renders. Saved metadata still comes from the completed local media.
  const displayedDuration = phase === 'recording' ? Math.min(limit * 1000, Math.max(0, recorderState.durationMillis))
    : playback.isLoaded && playback.duration > 0 ? Math.min(limit * 1000, Math.round(playback.duration * 1000)) : durationMs;
  const displayedMessage = phase === 'ready' && playback.error
    ? 'We couldn’t play this recording. You can record again.' : message;
  const status = phase === 'recording' ? 'Recording'
    : phase === 'preparing' ? 'Getting ready…' : phase === 'stopping' ? 'Finishing…'
      : phase === 'saving' ? 'Saving…' : phase === 'ready' ? (playback.playing ? 'Playing' : 'Your recording')
        : 'Tap Record when you’re ready.';
  return (
    <View style={styles.stack}>
      <SectionHeading title={title} description={limit ? `Up to ${limit} seconds` : undefined} />
      {phase === 'denied' ? (
        <>
          <AppText tone="secondary">Microphone access is needed to record.</AppText>
          <PillButton label="Open Settings" onPress={() => { void openSettings(); }} />
        </>
      ) : (
        <>
          <Card tone="protected" style={styles.readout}>
            <AppText variant="clock" align="center" style={styles.timer}>{clock(displayedDuration)}</AppText>
            <AppText variant="caption" tone="secondary" align="center" accessibilityLiveRegion="polite">{status}</AppText>
          </Card>
          {phase === 'ready' ? (
            <>
              <PillButton label="Play" variant="secondary" disabled={!readyToSave || playback.playing} onPress={() => { void playRecording(); }} />
              <PillButton label="Record again" variant="secondary" onPress={() => { void startRecording(); }} />
              <PillButton label="Save" disabled={!readyToSave} onPress={() => { void saveRecording(); }} />
            </>
          ) : phase === 'recording' ? (
            <PillButton label="Stop" onPress={() => { void finishRecording(); }} />
          ) : (
            <PillButton
              label={phase === 'error' ? 'Record again' : 'Record'}
              disabled={!limit || !['idle', 'error'].includes(phase)}
              onPress={() => { void startRecording(); }}
            />
          )}
        </>
      )}
      {displayedMessage ? <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{displayedMessage}</AppText> : null}
      <PillButton label="Cancel" variant="quiet" disabled={phase === 'closed'} onPress={() => { void cancel(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  readout: { paddingVertical: 28 },
  timer: { fontSize: 48, lineHeight: 60, letterSpacing: -2 },
});
