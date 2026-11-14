import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { AppText, Card, PillButton } from '../ui';
import { SceneScreen } from '../SceneScreen';
import { usePartner } from '../partner';
import { Recorder } from '../Recorder';
import { localDate, messageLevel, sizeLabels, sizeMinutes, useStore } from '../store';
import { morningTiming, offerToday, replaceMorning, shrinkToday, undoTodayRemoval } from '../morning';
import { homeCopy, removalNoticeVisible } from '../../../src/home/presentation';
import { createMessageLedger, messageConfig, recordAudiblePlayback, restMessage, selectMessage } from '../../../shared/messages/engine';
import { skyProgressForClock } from '../../../src/theme';
import { protectPrivateAudioFile } from '../privateAudio';
import { MomentPhoto } from '../MomentPhoto';

export default function Message() {
  const { date = localDate(), play } = useLocalSearchParams<{ date?: string; play?: string }>();
  const store = useStore(); const [reply, setReply] = useState(false);
  const partner = usePartner();
  const { update } = store;
  const player = useAudioPlayer(null, { updateInterval: 100, allowsExternalPlayback: false });
  const playback = useAudioPlayerStatus(player);
  const audible = useRef(0); const lastPosition = useRef(0);
  const [preparedId, setPreparedId] = useState<string | null>(null); const [failedId, setFailedId] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now); const playRequest = useRef(0);
  const cancelPendingPlayback = useEffectEvent(() => { playRequest.current++; });
  const morning = store.state.mornings.find(item => item.localDate === date);
  const selected = store.state.messages.find(message => message.id === morning?.messageId);
  const selectedId = selected?.id; const selectedUri = selected?.uri; const selectedBlocked = selected?.blocked;
  const shouldPlay = play === 'true' || morning?.phase === 'message';
  const goal = store.state.goals.find(item => item.id === morning?.goalId);
  const early = morning?.upAt !== null && morning?.upAt !== undefined && morning.upAt < morning.scheduledAt;
  const heldSky = morning?.skyTransitionFrom ?? skyProgressForClock(new Date(clock).getHours(), new Date(clock).getMinutes());
  const transition = morning?.skyTransitionStartedAt === undefined ? 1 : Math.min(1, Math.max(0, (clock - morning.skyTransitionStartedAt) / morningTiming.skyFinishMs));
  const sky = early ? heldSky : heldSky + (1 - heldSky) * transition;
  const audioReadyAt = !early && morning?.upAt ? morning.upAt + morningTiming.soundFadeMs : 0;
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 50); return () => clearInterval(timer); }, []);
  useEffect(() => {
    update(old => {
      const current = old.mornings.find(item => item.localDate === date);
      if (!current || !current.upAt || !current.level || current.messageLedger) return old;
      const yesterday = new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const prior = old.mornings.find(item => item.localDate === yesterday);
      const previousPlayed = prior?.messageLedger?.entries.find(entry => entry.playedAt !== null)?.messageId;
      const message = selectMessage(old.messages, messageLevel(current.level), previousPlayed, Math.random);
      const next = replaceMorning(old, { ...current, messageId: message?.id ?? null, messageLedger: createMessageLedger(date, message?.id ?? null) });
      return message ? next : offerToday(next, date);
    });
  }, [date, update]);
  useEffect(() => {
    if (!selectedId || !selectedUri || selectedBlocked) return;
    let alive = true;
    void protectPrivateAudioFile(selectedUri).then(uri => {
      if (!alive) return;
      player.replace({ uri }); setPreparedId(selectedId);
    }).catch(() => { if (alive) { setFailedId(selectedId); update(old => offerToday(old, date)); } });
    return () => { alive = false; cancelPendingPlayback(); player.pause(); };
  }, [selectedId, selectedUri, selectedBlocked, player, update, date]);
  useEffect(() => {
    if (!shouldPlay || !selectedId || preparedId !== selectedId || selectedBlocked) return;
    const request = ++playRequest.current;
    const timer = setTimeout(() => {
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false }).then(() => {
        if (request === playRequest.current) player.play();
      }).catch(() => {});
    }, Math.max(0, audioReadyAt - Date.now()));
    return () => { clearTimeout(timer); cancelPendingPlayback(); };
  }, [selectedId, preparedId, selectedBlocked, shouldPlay, audioReadyAt, player]);
  // A photo with no sound has nothing to listen to: showing it starts the step,
  // and three seconds on screen counts as the day's one play.
  const selectedSilent = Boolean(selected && !selected.uri && !selected.blocked);
  useEffect(() => {
    if (!shouldPlay || !selectedId || !selectedSilent) return;
    const shown = setTimeout(() => update(old => offerToday(old, date)), Math.max(0, audioReadyAt - Date.now()));
    const counted = setTimeout(() => update(old => {
      const current = old.mornings.find(item => item.localDate === date);
      if (!current?.messageLedger) return old;
      const recordedDateNow = new Date(Date.now() + current.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
      const result = recordAudiblePlayback(old.messages, current.messageLedger, { localDate: recordedDateNow, messageId: selectedId, context: 'morning',
        audibleMs: messageConfig.playThresholdMs, durationMs: messageConfig.playThresholdMs, ended: true, at: Date.now() });
      if (result.ledger === current.messageLedger) return old;
      return replaceMorning({ ...old, messages: result.messages }, { ...current, messageLedger: result.ledger });
    }), Math.max(0, audioReadyAt - Date.now()) + messageConfig.playThresholdMs);
    return () => { clearTimeout(shown); clearTimeout(counted); };
  }, [shouldPlay, selectedId, selectedSilent, audioReadyAt, date, update]);
  const onLeaveMessage = useEffectEvent(() => { playRequest.current++; try { player.pause(); } catch {} });
  useEffect(() => () => onLeaveMessage(), [player]);
  useEffect(() => {
    if (!morning?.messageLedger || !selected) return;
    if ((playback.playing || playback.error) && !morning.stepOffered) update(old => offerToday(old, date));
    const delta = playback.currentTime - lastPosition.current; lastPosition.current = playback.currentTime;
    if ((playback.playing || playback.didJustFinish) && delta > 0 && delta <= 0.5 && !player.muted && player.volume > 0) audible.current += delta * 1000;
    if (audible.current < 3000 && !playback.didJustFinish) return;
    update(old => {
      const current = old.mornings.find(item => item.localDate === date);
      if (!current?.messageLedger) return old;
      const recordedDateNow = new Date(Date.now() + current.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
      const result = recordAudiblePlayback(old.messages, current.messageLedger, { localDate: recordedDateNow, messageId: selected.id, context: 'morning', audibleMs: audible.current,
        durationMs: playback.duration > 0 ? playback.duration * 1000 : selected.durationMs, ended: playback.didJustFinish, at: Date.now() });
      if (result.ledger === current.messageLedger) return old;
      return replaceMorning({ ...old, messages: result.messages }, { ...current, messageLedger: result.ledger });
    });
  }, [date, morning?.messageLedger, morning?.stepOffered, selected, playback.currentTime, playback.playing, playback.didJustFinish, playback.duration, playback.error, player, update]);
  function rest() {
    playRequest.current++; player.pause();
    store.update(old => {
      const current = old.mornings.find(item => item.localDate === date); if (!current?.messageLedger || !current.messageId) return old;
      const dayNow = new Date(Date.now() + current.utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
      if (dayNow !== date) return old;
      const result = restMessage(old.messages, current.messageLedger, current.messageId);
      return offerToday(replaceMorning({ ...old, messages: result.messages }, { ...current, messageLedger: result.ledger }), date);
    });
  }
  function home() {
    playRequest.current++; player.pause();
    store.update(old => ({ ...old, mornings: old.mornings.map(item => item.localDate === date ? { ...item, phase: 'home' } : item) }));
    router.replace('/home');
  }
  const currentDayEnabled = Boolean(store.state.alarm?.enabled && morning?.level !== 'off' && date === localDate(new Date(clock)));
  const sunUp = Boolean(currentDayEnabled && morning?.upAt);
  const partnerUp = currentDayEnabled && partner.localDate === date && partner.partnerUpToday;
  if (reply && (morning?.level === 'medium' || morning?.level === 'hard')) return <SceneScreen progress={sky} up={sunUp}
    paired={partner.paired} partnerUp={partnerUp} scroll>
    <Recorder title="Say something back" maxSeconds={20} onCancel={() => setReply(false)} onSave={clip => {
      const level = morning.level === 'medium' ? 'medium' : 'hard';
      store.update(old => ({ ...old, replyNotes: [...(old.replyNotes ?? []), { ...clip, level, createdAt: Date.now(), answered: false }] })); setReply(false);
    }} />
  </SceneScreen>;
  return <SceneScreen progress={sky} up={sunUp} sunriseProgress={transition}
    paired={partner.paired} partnerUp={partnerUp}
    scroll header={<AppText variant="label">aamu</AppText>} footer={<View style={{ gap: 12 }}>
    <PillButton label="Home" onPress={home} /><PillButton label="Help" variant="quiet" outlined onPress={() => router.push('/help')} />
  </View>}>
    <AppText variant="title">{selected && !selected.blocked ? (selected.photoUri ? 'A moment you saved.' : 'No need to reply.') : 'You’re up.'}</AppText>
    <View style={{ gap: 16 }}>
    {selected && !selected.blocked && <Card>
      <MomentPhoto uri={selected.photoUri} arrive={shouldPlay} />
      {Boolean(selected.uri) && <PillButton label={playback.playing ? 'Pause' : selected.photoUri ? 'Play the sound' : 'Play'} variant="secondary" outlined disabled={preparedId !== selectedId || failedId === selectedId} onPress={() => {
        const request = ++playRequest.current;
        if (playback.playing) player.pause(); else void (async () => {
          const wait = Math.max(0, audioReadyAt - Date.now()); if (wait) await new Promise(resolve => setTimeout(resolve, wait));
          if (request !== playRequest.current) return;
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
          if (request !== playRequest.current) return;
          if (playback.didJustFinish) { await player.seekTo(0); lastPosition.current = 0; } player.play();
        })().catch(() => {});
      }} />}
      <PillButton label={selected.photoUri ? 'Rest this moment' : 'Rest message'} variant="quiet" outlined onPress={rest} />
      {(playback.error || failedId === selectedId) && <AppText tone="secondary">We couldn’t play this recording.</AppText>}
    </Card>}
    {morning?.stepSize && morning.stepOffered && (morning.stepText || goal || morning.stepLadder) && <Card>
      <AppText variant="caption" tone="secondary">{sizeLabels[morning.stepSize]} · Up to {sizeMinutes[morning.stepSize]} min</AppText>
      <AppText variant="step">{morning.stepText ?? goal?.steps[morning.stepSize] ?? morning.stepLadder?.[morning.stepSize]}</AppText>
      <PillButton label="Too much today" variant="quiet" outlined onPress={() => store.update(old => shrinkToday(old, date))} />
    </Card>}
    {(morning?.level === 'medium' || morning?.level === 'hard') && <PillButton label="Say something back" variant="quiet" outlined onPress={() => { player.pause(); setReply(true); }} />}
    {removalNoticeVisible(morning, Boolean(store.state.alarm?.enabled), clock) && <Card tone="protected" padding={18}>
      <AppText accessibilityLiveRegion="polite">{homeCopy.removed}</AppText>
      <PillButton label="Undo" variant="quiet" outlined onPress={() => store.update(old => undoTodayRemoval(old, date))} />
    </Card>}
    </View>
  </SceneScreen>;
}
