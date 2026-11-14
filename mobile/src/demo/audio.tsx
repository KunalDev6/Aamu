import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { AppText, PillButton } from '../ui';
import { TextAction } from '../TextAction';
import { protectPrivateAudioFile } from '../privateAudio';
import { demoSky, demoTiming, type DemoMorning } from '../../../shared/demo/session';

// Expo's imperative native player owns these mutable playback properties.
function setDemoVolume(player: AudioPlayer, volume: number) { player.volume = volume; }
function configureDemoLoop(player: AudioPlayer, volume: number) { player.loop = true; player.volume = volume; }

/** Read-only playback: no recording, real message learning or store access. */
export function DemoAmbience({ morning, place, personalUri }: { morning?: DemoMorning; place: 'sea' | 'forest' | 'personal'; personalUri?: string }) {
  const player = useAudioPlayer(null, { allowsExternalPlayback: false });
  const active = morning?.phase === 'dawn' && morning.upAt === null && morning.level === null;
  // Skip may reach the message stage immediately. The same hold fade continues
  // across that transition instead of cutting the ambience off with the voice UI.
  const fading = morning?.upAt != null;
  const source = place === 'personal' ? personalUri : place;
  const startedAt = morning?.dawnStartedAt; const date = morning?.localDate;
  const latest = useRef(morning);
  const fadeStartVolume = useRef(0);
  useEffect(() => { latest.current = morning; }, [morning]);
  useEffect(() => {
    let cancelled = false;
    if (active && source && AppState.currentState === 'active') {
      void (async () => {
        const verified = place === 'personal' ? { uri: await protectPrivateAudioFile(source) } : place === 'forest'
          ? require('../../assets/audio/forest.m4a') : require('../../assets/audio/sea.m4a');
        if (cancelled) return;
        player.replace(verified);
        configureDemoLoop(player, latest.current?.dawnLowerStart ? 0.04 : 0.08);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
        if (!cancelled) player.play();
      })().catch(() => {});
    } else if (!fading) player.pause();
    if (fading) fadeStartVolume.current = player.volume;
    const timer = setInterval(() => {
      const current = latest.current; const now = Date.now();
      if (current?.upAt != null) {
        const left = Math.max(0, 1 - (now - current.upAt) / demoTiming.fadeMs);
        setDemoVolume(player, fadeStartVolume.current * left); if (left === 0) player.pause();
      } else if (current?.phase === 'dawn' && current.upAt === null && current.level === null) {
        const start = current.dawnLowerStart ? 0.04 : 0.08;
        setDemoVolume(player, start + (0.4 - start) * demoSky(current, now));
      }
      else player.pause();
    }, 50);
    const lifecycle = AppState.addEventListener('change', next => { if (next !== 'active') { cancelled = true; player.pause(); } });
    return () => { cancelled = true; clearInterval(timer); lifecycle.remove(); };
  }, [active, fading, source, place, startedAt, date, player]);
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);
  return null;
}

/** A photo-only moment in Demo: showing it offers the step. Nothing is played or counted. */
export function DemoSilentMoment({ autoPlay, notBefore, onStart, onRest }: { autoPlay: boolean; notBefore: number; onStart(): void; onRest(): void }) {
  const began = useEffectEvent(() => onStart());
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => began(), Math.max(0, notBefore - Date.now()));
    return () => clearTimeout(timer);
  }, [autoPlay, notBefore]);
  return <TextAction label="Rest this moment" onPress={onRest} />;
}

export function DemoMessagePlayer({ uri, autoPlay, notBefore, now, onStart, onRest, moment = false }: { uri: string; autoPlay: boolean; notBefore: number; now: number; onStart(): void; onRest(): void; moment?: boolean }) {
  const player = useAudioPlayer(null, { updateInterval: 100, allowsExternalPlayback: false });
  const [prepared, setPrepared] = useState(false); const [sourceFailed, setSourceFailed] = useState(false);
  const status = useAudioPlayerStatus(player); const offered = useRef(false);
  const markStarted = () => { if (!offered.current) { offered.current = true; onStart(); } };
  const began = useEffectEvent(() => markStarted());
  useEffect(() => {
    let alive = true;
    void protectPrivateAudioFile(uri).then(protectedUri => {
      if (!alive) return;
      player.replace({ uri: protectedUri }); setPrepared(true);
    }).catch(() => { if (alive) { setSourceFailed(true); began(); } });
    return () => { alive = false; try { player.pause(); } catch {} };
  }, [uri, player]);
  useEffect(() => {
    if (!autoPlay || !prepared) return;
    let alive = true;
    const timer = setTimeout(() => {
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false })
        .then(() => { if (alive && AppState.currentState === 'active') player.play(); }).catch(() => began());
    }, Math.max(0, notBefore - Date.now()));
    return () => { alive = false; clearTimeout(timer); try { player.pause(); } catch {} };
  }, [autoPlay, prepared, notBefore, player]);
  useEffect(() => {
    const lifecycle = AppState.addEventListener('change', next => { if (next !== 'active') player.pause(); });
    return () => lifecycle.remove();
  }, [player]);
  useEffect(() => { if (status.playing || status.error) began(); }, [status.playing, status.error]);
  return <>
    <PillButton label={status.playing ? 'Pause' : moment ? 'Play the sound' : 'Play'} variant="secondary" outlined disabled={!prepared || now < notBefore} onPress={() => {
      if (status.playing) player.pause();
      else void (async () => { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false }); if (status.didJustFinish) await player.seekTo(0); player.play(); })().catch(() => markStarted());
    }} />
    <TextAction label={moment ? 'Rest this moment' : 'Rest message'} onPress={() => { player.pause(); onRest(); }} />
    {(status.error || sourceFailed) && <AppText tone="secondary">We couldn’t play this recording.</AppText>}
  </>;
}
