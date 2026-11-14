import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { SceneScreen } from '../SceneScreen';
import { TextAction } from '../TextAction';
import { localDate, sizeLabels, sizeMinutes, useStore } from '../store';
import { demoEnabled, demoLabelsVisible, demoText } from '../demo/config';
import { changeDemo, resetDemo, useDemoSession } from '../demo/store';
import { DemoAmbience, DemoMessagePlayer, DemoSilentMoment } from '../demo/audio';
import { MomentPhoto } from '../MomentPhoto';
import { Rise, SunBloom, TodaySize, doneLine, type SizeChoice } from '../TodaySize';
import { getCarrySize, scoreMorning, sizeForMorning } from '../../../shared/mornings/engine';
import { advanceTour, endTour, useTour } from '../demo/tour';
import { emptyDemoSession } from '../../../shared/demo/session';
import { advanceDemoTime, completeDemoStep, currentDemoMorning, demoSky, demoTiming, finishDemoVoice, holdDemo,
  demoRemovalNoticeVisible, offerDemoStep, restDemoMessage, ringDemo, showDemoHome, shrinkDemoStep, snoozeDemo, undoDemoRemoval,
  type DemoLevelChoice } from '../../../shared/demo/session';
import type { MessageLevel } from '../../../shared/messages/engine';
import { homeCopy } from '../../../src/home/presentation';

const levelLabels: Record<MessageLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const choices: DemoLevelChoice[] = ['sensed', 'easy', 'medium', 'hard'];
const choiceLabels: Record<DemoLevelChoice, string> = { sensed: 'Sensed from snoozes and time', ...levelLabels };
export default function Demo() {
  const real = useStore().state; // Read-only resources. This route never obtains the real store's update function.
  const { start } = useLocalSearchParams<{ start?: string }>(); const started = useRef(false);
  const tour = useTour(); const guided = tour?.stage === 'easy' || tour?.stage === 'hard';
  const { session, ready, error } = useDemoSession(demoEnabled);
  const [controls, setControls] = useState(true); const [clock, setClock] = useState(Date.now);
  const [hold, setHold] = useState(0); const pressing = useRef<number | null>(null);
  const morning = currentDemoMorning(session); const late = morning?.level === 'stopped' || morning?.level === 'no_response';
  const selected = real.messages.find(message => message.id === morning?.messageId && !message.blocked && !session.restedMessageIds.includes(message.id));
  const onTick = useEffectEvent(() => {
    const now = Date.now(); setClock(now);
    changeDemo(current => advanceDemoTime(current, real, now, Math.random));
    if (pressing.current !== null) {
      const amount = Math.min(1, (now - pressing.current) / demoTiming.holdMs); setHold(amount);
      if (amount >= 1) { pressing.current = null; changeDemo(current => holdDemo(current, real, now)); setHold(0); }
    }
  });
  useEffect(() => {
    if (!ready || !demoEnabled) return;
    const timer = setInterval(() => onTick(), 50);
    const lifecycle = AppState.addEventListener('change', next => { if (next !== 'active') { pressing.current = null; setHold(0); } });
    return () => { clearInterval(timer); lifecycle.remove(); };
  }, [ready]);
  const offerMissingMessage = useEffectEvent(() => { changeDemo(current => offerDemoStep(current, real)); });
  useEffect(() => { if (morning?.phase === 'message' && !selected) offerMissingMessage(); }, [morning?.phase, selected]);
  // Home's "Try a morning" opens straight into a fast, sensed ring.
  const startMorning = useEffectEvent(() => {
    changeDemo(current => ringDemo({ ...current, fast: true, selectedLevel: 'sensed' }, Date.now(), localDate(), -new Date().getTimezoneOffset()));
    setControls(false); setHold(0);
  });
  useEffect(() => {
    if (!ready || !demoEnabled || start !== '1' || started.current) return;
    started.current = true; startMorning();
  }, [ready, start]);
  // Guided demo: a fresh demo history with the one goal just approved, a partner,
  // and a carried size of Full so the easier morning shows the whole step.
  const startGuided = useEffectEvent(() => {
    changeDemo(() => ({ ...ringDemo({ ...emptyDemoSession(), fast: true, selectedLevel: 'sensed', paired: true,
      onlyGoalId: tour?.goalId ?? null, initialCarry: 'full' }, Date.now(), localDate(), -new Date().getTimezoneOffset()), partnerUp: true }));
    setControls(false); setHold(0);
  });
  // Arriving from Home's "Ring the alarm": the first guided morning starts the fresh
  // history; the second rings the next day in the same history.
  const ringGuidedNext = useEffectEvent(() => {
    changeDemo(current => ({ ...ringDemo({ ...current, fast: true, selectedLevel: 'sensed' }, Date.now(), localDate(), -new Date().getTimezoneOffset()), partnerUp: true }));
    setControls(false); setHold(0);
  });
  const beginGuided = useEffectEvent(() => { if (tour?.stage === 'easy') startGuided(); else ringGuidedNext(); });
  useEffect(() => {
    if (!ready || !demoEnabled || !guided || started.current) return;
    started.current = true; beginGuided();
  }, [ready, guided]);
  if (!demoEnabled) return <Redirect href="/settings" />;
  if (!ready) return <Screen><AppText>Opening Demo…</AppText></Screen>;
  // In the guided demo the simulated partner is already up when each morning rings,
  // so the person's own half is the only thing left to fill.
  const ring = () => {
    changeDemo(current => { const next = ringDemo(current, Date.now(), localDate(), -new Date().getTimezoneOffset()); return guided ? { ...next, partnerUp: true } : next; });
    setControls(false); setHold(0);
  };
  // The guided demo shows the morning it stands for: the alarm time, plus five minutes per snooze.
  const ringClock = new Date(clock);
  if (guided && morning) ringClock.setHours(real.alarm?.hour ?? 7, (real.alarm?.minute ?? 0) + morning.snoozeCount * demoTiming.snoozeMinutes, 0, 0);
  const sensedPause = morning?.phase === 'voice' && morning.selectedLevel === 'sensed';
  // The same rule that picked the size, recomputed for display from the demo record.
  let choice: SizeChoice | undefined;
  if (morning && morning.selectedLevel === 'sensed' && morning.upAt !== null && morning.level) {
    const prior = session.history.filter(item => item.localDate !== morning.localDate);
    const score = scoreMorning({ ...morning, level: null, voiceState: 'unavailable' }, prior);
    const carry = getCarrySize(prior, session.initialCarry ?? 'small');
    choice = { snoozePoints: score.snoozePoints, timingPoints: score.timingPoints, usualSnoozes: score.baselines.main.snoozeCount,
      usualMinutes: score.baselines.main.minutesToUp, usualFromHistory: score.baselines.main.ready,
      carry, limit: sizeForMorning(morning.level, 'full') ?? 'tiny' };
  }
  // What the demo morning was scored from, in plain words. No level is shown before it exists.
  const sensedLevel = morning?.level === 'easy' || morning?.level === 'medium' || morning?.level === 'hard' ? morning.level : null;
  const summary = !morning ? demoText(`Demo morning ${session.history.length}`, '')
    : morning.selectedLevel !== 'sensed' ? demoText(`Demo morning ${session.history.length} · ${levelLabels[morning.selectedLevel]} picked`, '')
      : sensedLevel && morning.minutesToUp !== null
        ? `Sensed · ${levelLabels[sensedLevel]} morning · ${morning.snoozeCount} ${morning.snoozeCount === 1 ? 'snooze' : 'snoozes'} · ${Math.max(1, Math.round(morning.minutesToUp))} min to get up`
        : demoText(`Demo morning ${session.history.length}${session.fast ? ' · Fast time' : ''}`, '');
  const header = <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}><AppText variant="label">{controls || demoLabelsVisible ? 'aamu · Demo' : 'aamu'}</AppText>
    <TextAction label={controls || demoLabelsVisible ? 'Exit Demo' : 'Close'} onPress={() => { endTour(); router.replace(start === '1' || tour ? '/home' : '/settings'); }} />
  </View>;
  const footer = <TextAction label={controls ? 'Show morning' : demoText('Demo controls', 'Options')} disabled={controls && !morning} onPress={() => setControls(!controls)} />;
  const surface = (children: React.ReactNode) => controls
    ? <Screen scroll header={header} footer={footer}>{children}</Screen>
    // The person's half fills with the hold itself, so the two seconds of holding
    // are the animation. Letting go early empties it again; only a completed hold keeps it.
    : <SceneScreen clearHorizon sunLabels progress={demoSky(morning, clock)} up={Boolean(morning?.upAt) || hold > 0} paired={session.paired} partnerUp={session.partnerUp}
      sunriseProgress={morning?.upAt ? 1 : hold}
      overlay={morning?.upAt ? <SunBloom key={morning.upAt} /> : undefined}
      header={header} footer={guided ? undefined : footer}>{children}</SceneScreen>;
  return <>
    <DemoAmbience morning={morning} place={real.place} personalUri={real.placeClip?.uri} />
    {surface(<>
    {error && <AppText tone="secondary">Demo history couldn’t be saved or opened. Reset Demo to start again.</AppText>}
    {controls ? <>
      <AppText variant="title">A morning to try</AppText>
      <AppText tone="secondary">Demo uses its own history. Your goals, recordings and real pairing stay intact.</AppText>
      <Card><AppText variant="label">Morning difficulty · Demo</AppText>
        {choices.map(level => <PillButton key={level} label={`${choiceLabels[level]}${session.selectedLevel === level ? ' · Selected' : ''}`}
          variant="secondary" outlined accessibilityState={{ selected: session.selectedLevel === level }} onPress={() => changeDemo(current => ({ ...current, selectedLevel: level }))} />)}
        <PillButton label={`Fast time · ${session.fast ? 'On' : 'Off'}`} variant="secondary" outlined onPress={() => changeDemo(current => ({ ...current, fast: !current.fast }))} />
        <AppText tone="secondary">Sensed scores this morning from its own snoozes and getting-up time. Easy, Medium and Hard override that. Fast time shortens dawn, snooze and the first-hour window.</AppText>
        <PillButton label={!morning ? 'Ring now' : morning.phase === 'snoozed' ? 'Ring now · Resume this morning' : 'Ring now · Next demo day'} onPress={ring} />
        {morning && <AppText tone="secondary">Each new demo morning advances one simulated day. Your real dates and history stay unchanged.</AppText>}
      </Card>
      <Card><AppText variant="label">A morning, shared · Demo</AppText>
        <PillButton label={session.paired ? 'Anonymous match ready · Demo' : 'Match anonymously · Demo'} variant="secondary" outlined
          onPress={() => changeDemo(current => ({ ...current, paired: true }))} />
        <PillButton label="Partner gets up now" variant="secondary" outlined disabled={!session.paired} onPress={() => changeDemo(current => ({ ...current, partnerUp: true }))} />
        {session.partnerUp && <AppText>You’re not alone this morning.</AppText>}
      </Card>
      <Card><AppText variant="label">A quiet check-in · Demo</AppText>
        <PillButton label="Ask for a quiet check-in call · Demo" variant="secondary" outlined onPress={() => changeDemo(current => ({ ...current, callbackRequested: true }))} />
        {session.callbackRequested && <AppText tone="secondary">Demo request recorded. No call was sent.</AppText>}
      </Card>
      {demoEnabled && <PillButton label="Preview scenes" variant="secondary" outlined onPress={() => router.replace('/preview')} />}
      <AppText tone="secondary">{session.history.length} demo mornings</AppText>
      <TextAction label="Reset Demo" onPress={() => { pressing.current = null; resetDemo(); setHold(0); }} />
    </> : <>
      <View style={{ gap: 12 }}>
        {summary && !guided ? <AppText variant="caption" tone="secondary">{summary}</AppText> : null}
        {morning?.phase === 'dawn' && <AppText variant="clock" align="center">{ringClock.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</AppText>}
        {guided && session.partnerUp && (morning?.phase === 'dawn' || morning?.phase === 'snoozed')
          && <AppText tone="secondary" align="center">Your partner is already up.</AppText>}
        {sensedPause && <AppText variant="title" weight="light" align="center">You’re up.</AppText>}
        {sensedPause && session.partnerUp && <AppText tone="secondary" align="center">You’re both up.</AppText>}
        {(morning?.phase === 'message' || morning?.phase === 'home') && <AppText variant="title">{selected ? (selected.photoUri ? 'A moment you saved.' : 'No need to reply.') : 'You’re up.'}</AppText>}
      </View>
      <View style={{ gap: 16 }}>
      {morning?.phase === 'dawn' && <>
        <PillButton label="Hold: I’m up" progress={hold} accessibilityHint="Hold for two seconds. This is a demo morning."
          onPressIn={() => { pressing.current = Date.now(); }} onPressOut={() => { pressing.current = null; setHold(0); }} />
        {!late && <PillButton label="Snooze" variant="secondary" outlined onPress={() => { pressing.current = null; changeDemo(current => snoozeDemo(current, Date.now())); }} />}
      </>}
      {morning?.phase === 'snoozed' && <Card><AppText variant="title">A little more time</AppText>
        <AppText tone="secondary">Rings again in {Math.max(0, Math.ceil(((morning.snoozeUntil ?? clock) - clock) / 1000))} seconds</AppText>
        {!session.fast && <PillButton label="Ring now" variant="secondary" outlined onPress={ring} />}
      </Card>}
      {morning?.phase === 'voice' && !sensedPause && <Card><AppText variant="title">A quiet moment</AppText>
        <AppText tone="secondary">Demo sensing preview · Using the selected morning difficulty.</AppText>
        <AppText>{Math.max(0, Math.ceil(((morning.voiceEndsAt ?? clock) - clock) / 1000))} seconds</AppText>
        <TextAction label="Skip" onPress={() => changeDemo(current => finishDemoVoice(current, real, true))} />
      </Card>}
      {(morning?.phase === 'message' || morning?.phase === 'home') && <>
        {selected && <Card style={{ gap: 14 }}>
          <MomentPhoto key={`photo:${morning.localDate}:${selected.id}`} uri={selected.photoUri} arrive={morning.phase === 'message'} />
          {selected.uri
            ? <DemoMessagePlayer key={`${morning.localDate}:${selected.id}`} uri={selected.uri} moment={Boolean(selected.photoUri)} autoPlay={morning.phase === 'message'} notBefore={(morning.upAt ?? 0) + demoTiming.fadeMs} now={clock}
              onStart={() => changeDemo(current => offerDemoStep(current, real))} onRest={() => changeDemo(current => restDemoMessage(current, real))} />
            : <DemoSilentMoment key={`${morning.localDate}:${selected.id}`} autoPlay={morning.phase === 'message'} notBefore={(morning.upAt ?? 0) + demoTiming.fadeMs}
              onStart={() => changeDemo(current => offerDemoStep(current, real))} onRest={() => changeDemo(current => restDemoMessage(current, real))} />}
        </Card>}
        {morning.stepOffered && morning.stepSize && <Rise><Card style={{ gap: 14 }}>
          {sensedLevel && morning.selectedLevel === 'sensed' && morning.minutesToUp !== null
            && <TodaySize size={morning.stepSize} level={sensedLevel} snoozes={morning.snoozeCount} minutes={morning.minutesToUp} choice={choice} />}
          <AppText variant="caption" tone="secondary">{sizeLabels[morning.stepSize]} · Up to {sizeMinutes[morning.stepSize]} min</AppText>
          <AppText variant="step">{morning.stepText}</AppText>
          {morning.stepDone ? <View style={{ gap: 6 }}>
            <AppText accessibilityLiveRegion="polite">{doneLine(morning.stepSize)}</AppText>
            <TextAction label={homeCopy.undo} onPress={() => changeDemo(current => completeDemoStep(current, null))} />
          </View>
            : <><PillButton label="Done" onPress={() => changeDemo(current => completeDemoStep(current, true))} />
              <TextAction label="Too much today" onPress={() => changeDemo(current => shrinkDemoStep(current, Date.now()))} /></>}
        </Card></Rise>}
        {demoRemovalNoticeVisible(morning, clock) && <Card><AppText tone="secondary">{homeCopy.removed}</AppText>
          <TextAction label={homeCopy.undo} onPress={() => changeDemo(current => undoDemoRemoval(current, Date.now()))} />
        </Card>}
        {!real.goals.some(goal => goal.approved) && <AppText tone="secondary">Add a goal in Aamu to include a step in Demo.</AppText>}
        {guided ? (morning.stepOffered || morning.stepRemoved) && <PillButton variant="secondary" outlined
          label={tour?.stage === 'easy' ? 'Next morning' : 'Next'} onPress={() => {
            if (tour?.stage === 'easy') { advanceTour('hard'); router.replace('/home'); }
            else { advanceTour('clinic'); router.replace('/help'); }
          }} /> : <>
          {morning.phase === 'message' && <PillButton label="Home" variant="secondary" outlined onPress={() => changeDemo(showDemoHome)} />}
          <TextAction label="Partner gets up now" disabled={!session.paired} onPress={() => changeDemo(current => ({ ...current, partnerUp: true }))} />
        </>}
      </>}
      </View>
    </>}
    </>)}
  </>;
}
