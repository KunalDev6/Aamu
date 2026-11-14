import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { AppText, PillButton } from './ui';
import { protectPrivateAudioFile } from './privateAudio';

/** Deliberate playback outside the morning message stage never updates learning. */
export function LocalClipPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(null, { allowsExternalPlayback: false });
  const status = useAudioPlayerStatus(player);
  const request = useRef(0); const loadedUri = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const stop = useEffectEvent(() => { request.current++; try { player.pause(); } catch {} });
  useEffect(() => {
    const lifecycle = AppState.addEventListener('change', next => { if (next !== 'active') stop(); });
    return () => { lifecycle.remove(); stop(); };
  }, [player]);
  return <>
    <PillButton label={status.playing ? 'Pause' : 'Play'} variant="secondary" onPress={() => {
      const token = ++request.current;
      if (status.playing) player.pause();
      else void (async () => {
        const verified = await protectPrivateAudioFile(uri);
        if (token !== request.current) return;
        if (loadedUri.current !== verified) { player.replace({ uri: verified }); loadedUri.current = verified; }
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
        if (token !== request.current || AppState.currentState !== 'active') return;
        if (status.didJustFinish) await player.seekTo(0);
        if (token === request.current) player.play();
      })().catch(() => { if (token === request.current) setFailed(true); });
    }} />
    {(status.error || failed) && <AppText tone="secondary">We couldn’t play this recording.</AppText>}
  </>;
}
