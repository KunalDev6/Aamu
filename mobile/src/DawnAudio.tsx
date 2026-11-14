import React, { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { AudioPlayer, AudioSource, AudioStatus } from 'expo-audio';
import { useStore } from './store';
import type { AppMorning } from './store';
import { morningTiming, recordMidnight } from './morning';
import { protectPrivateAudioFile } from './privateAudio';

/** Playback gain only: these engineering values never alter system volume. */
export const dawnAudioConfig = Object.freeze({
  initialVolume: 0.08,
  lowerInitialVolume: 0.04,
  maximumVolume: 0.4,
  fadeOutMs: morningTiming.soundFadeMs,
  updateIntervalMs: 50,
});

export type DawnAudioProps = {
  /** Disable for native visual previews. The web component is always silent. */
  enabled?: boolean;
  /** Optional local technical notice, with no recording paths or personal data. */
  onPlaybackError?: () => void;
};

/** Mount once under StoreProvider so the hold → voice transition can fade audio. */
export function DawnAudio(props: DawnAudioProps) {
  if (Platform.OS === 'web') return null;
  return <NativeDawnAudio {...props} />;
}

type Settings = {
  enabled: boolean;
  morning: AppMorning | null;
  source: AudioSource;
  sourceKey: string;
  privateAudioUri?: string;
  onPlaybackError?: () => void;
};
type Controller = {
  update(settings: Settings): void;
  setAppActive(active: boolean): void;
  onStatus(status: AudioStatus): void;
  dispose(): void;
};

function NativeDawnAudio({ enabled = true, onPlaybackError }: DawnAudioProps) {
  const { state, ready } = useStore();
  const morning = state.mornings.reduce<AppMorning | null>((latest, item) =>
    !latest || item.scheduledAt > latest.scheduledAt ? item : latest, null);
  const personalUri = state.placeClip?.uri;
  const source = useMemo<AudioSource>(() => {
    if (state.place === 'personal') {
      // The native storage boundary verifies ownership + backup exclusion before
      // this candidate URI is ever passed to the audio player.
      return personalUri ? { uri: personalUri } : null;
    }
    return state.place === 'forest' ? require('../assets/audio/forest.m4a') : require('../assets/audio/sea.m4a');
  }, [state.place, personalUri]);
  const sourceKey = state.place === 'personal' ? `personal:${personalUri ?? ''}` : state.place;
  // Keep the native object stable; replacing a hook source recreates its player.
  const player = useAudioPlayer(null, { updateInterval: 100, allowsExternalPlayback: false });
  const controller = useRef<Controller | null>(null);

  useEffect(() => {
    const current = createController(player, AppState.currentState === 'active');
    controller.current = current;
    const audioSubscription = player.addListener('playbackStatusUpdate', current.onStatus);
    const lifecycle = AppState.addEventListener('change', next => current.setAppActive(next === 'active'));
    return () => {
      controller.current = null;
      audioSubscription.remove();
      lifecycle.remove();
      current.dispose();
      // useAudioPlayer owns final native-object release.
    };
  }, [player]);

  useEffect(() => {
    controller.current?.update({ enabled: ready && enabled, morning, source, sourceKey,
      privateAudioUri: state.place === 'personal' ? personalUri : undefined, onPlaybackError });
  }, [ready, enabled, morning, source, sourceKey, state.place, personalUri, onPlaybackError]);

  return null;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const occurrenceKey = (morning: AppMorning) => `${morning.localDate}:${morning.scheduledAt}`;

function createController(player: AudioPlayer, initiallyActive: boolean): Controller {
  let settings: Settings | null = null;
  let appActive = initiallyActive;
  let disposed = false;
  let generation = 0;
  let sessionKey: string | null = null;
  let playingOccurrence: string | null = null;
  let failedSessionKey: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let fade: { startedAt: number; endsAt: number; volume: number } | null = null;

  function clearTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function silence() {
    generation += 1; // Invalidate an unfinished audio-session setup.
    clearTimer();
    sessionKey = null;
    playingOccurrence = null;
    fade = null;
    try { player.volume = 0; } catch { /* Native object may already be released. */ }
    try { player.pause(); } catch { /* Hook disposal also stops its player. */ }
    try { player.replace(null); } catch { /* No raw errors or paths are logged. */ }
  }

  function canPlayDawn(now: number): boolean {
    const morning = settings?.morning;
    return Boolean(!disposed && appActive && settings?.enabled && morning
      && morning.phase === 'dawn' && morning.firstRingAt !== null && morning.upAt === null
      && !['off', 'stopped', 'no_response'].includes(morning.level ?? '')
      && Number.isFinite(morning.dawnStartedAt) && Number.isFinite(morning.dawnDurationMs)
      && morning.dawnDurationMs! > 0 && now < recordMidnight(morning));
  }

  function desiredSessionKey(): string | null {
    const morning = settings?.morning;
    return morning ? `${occurrenceKey(morning)}:${morning.dawnStartedAt}:${settings!.sourceKey}` : null;
  }

  function volumeAt(now: number): number {
    const morning = settings!.morning!;
    const savedProgress = Number.isFinite(morning.dawnProgress) ? morning.dawnProgress! : 0;
    // Alarm persists progress on snooze and resets the start timestamp on resume.
    const progress = clamp(savedProgress + Math.max(0, now - morning.dawnStartedAt!) / morning.dawnDurationMs!);
    const start = morning.dawnLowerStart ? dawnAudioConfig.lowerInitialVolume : dawnAudioConfig.initialVolume;
    return start + (dawnAudioConfig.maximumVolume - start) * progress;
  }

  function fail(key: string | null) {
    const shouldReport = key !== null && failedSessionKey !== key;
    failedSessionKey = key;
    silence();
    // Silence is a technical fallback, never a sensing/difficulty signal.
    if (shouldReport) {
      try { settings?.onPlaybackError?.(); } catch { /* A notice must not restart sound. */ }
    }
  }

  function tick() {
    if (disposed) return;
    const now = Date.now();
    if (fade) {
      if (!appActive || !settings?.enabled || now >= fade.endsAt) { silence(); return; }
      try {
        // Respect native interruption/headphone-disconnection pauses.
        if (!player.playing) { silence(); return; }
        player.volume = fade.volume * (1 - clamp((now - fade.startedAt) / (fade.endsAt - fade.startedAt)));
      } catch { fail(sessionKey); }
      return;
    }
    if (!canPlayDawn(now)) { silence(); return; }
    try { player.volume = volumeAt(now); } catch { fail(sessionKey); }
    // Never call play() from this timer: OS audio interruptions retain control.
  }

  function startTimer() {
    if (timer === null) timer = setInterval(tick, dawnAudioConfig.updateIntervalMs);
  }

  function reconcile() {
    if (disposed) return;
    const now = Date.now();
    const morning = settings?.morning;
    if (!appActive || !settings?.enabled || !morning || now >= recordMidnight(morning)) { silence(); return; }
    if (morning.phase === 'voice' && playingOccurrence === occurrenceKey(morning)) {
      if (fade) return;
      const endsAt = (morning.upAt ?? now) + dawnAudioConfig.fadeOutMs;
      try {
        if (endsAt <= now || !player.playing) { silence(); return; }
        generation += 1;
        fade = { startedAt: now, endsAt, volume: player.volume };
        startTimer();
      } catch { fail(sessionKey); }
      return;
    }
    // Includes snoozed, early holds, late Home and completed mornings.
    if (!canPlayDawn(now)) { silence(); return; }
    const key = desiredSessionKey();
    if (key === failedSessionKey) return; // No retry loop on a broken local file.
    if (key === sessionKey && !fade) return;
    silence();
    sessionKey = key;
    playingOccurrence = occurrenceKey(morning);
    if (!settings.source) { fail(key); return; }
    const source = settings.source;
    const privateAudioUri = settings.privateAudioUri;
    const token = generation;
    void (async () => {
      try {
        const verifiedSource = privateAudioUri ? { uri: await protectPrivateAudioFile(privateAudioUri) } : source;
        if (disposed || token !== generation || !canPlayDawn(Date.now()) || key !== desiredSessionKey()) return;
        await setAudioModeAsync({
          allowsRecording: false, allowsBackgroundRecording: false,
          shouldPlayInBackground: false, playsInSilentMode: true,
          interruptionMode: 'doNotMix', shouldRouteThroughEarpiece: false,
        });
        if (disposed || token !== generation || !canPlayDawn(Date.now()) || key !== desiredSessionKey()) return;
        player.replace(verifiedSource);
        if (disposed || token !== generation) return;
        player.loop = true;
        player.volume = volumeAt(Date.now());
        player.play();
        if (!disposed && token === generation) startTimer();
      } catch { if (!disposed && token === generation) fail(key); }
    })();
  }

  return {
    update(next) { settings = next; reconcile(); },
    setAppActive(active) { appActive = active; reconcile(); },
    onStatus(status) {
      if (disposed || sessionKey === null) return;
      if (status.error || status.mediaServicesDidReset) { fail(sessionKey); return; }
      if (status.playing && !fade && !canPlayDawn(Date.now())) silence();
    },
    dispose() { disposed = true; silence(); },
  };
}
