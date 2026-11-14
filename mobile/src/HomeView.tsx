import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Card, PillButton } from './ui';
import { SceneScreen } from './SceneScreen';
import { TextAction } from './TextAction';
import { DemoLabel } from './demo/DemoLabel';
import { demoText } from './demo/config';
import { sizeLabels } from './store';
import { skyProgressForClock } from '../../src/theme';
import { homeCopy, homePresentation } from '../../src/home/presentation';

export type HomeViewProps = {
  now: number; presentation: ReturnType<typeof homePresentation>; paired: boolean;
  alarmEnabled: boolean; alarmBusy?: boolean; notice?: string;
  step?: { size: 'tiny' | 'small' | 'full'; text: string; done: boolean | null };
  removalVisible?: boolean; hasMessage?: boolean; note?: React.ReactNode; alarmSetupNotice?: React.ReactNode;
  /** Demo mode only: one visible way to see a whole morning from Home. */
  onTryMorning?(): void;
  /** Isolated review can only add a motion restriction, never override the OS. */
  simulateReducedMotion?: boolean;
  onSettings(): void; onHelp(): void; onEnableAlarm(): void; onEarlyHold(): void;
  onDone(): void; onNotToday(): void; onUndoDone(): void; onShrink(): void; onUndoRemoval(): void; onPlayMessage(): void;
};

/** Actual Home and isolated review fixtures share the same state renderer. */
export function HomeView(props: HomeViewProps) {
  const { presentation: model, step } = props; const now = new Date(props.now);
  const resting = model.state === 'night'; const early = model.state === 'early';
  const evening = model.state === 'evening'; const off = model.state === 'off';
  const waiting = resting || early;
  // Before the person's own hold, say in words what the sun is waiting for.
  const sunLine = !waiting ? null : model.partnerSunUp ? 'Your partner is up.' : 'The sun fills when you get up.';
  const tryMorning = props.onTryMorning
    ? <PillButton label={demoText('Try a morning · Demo', 'Try a morning')} variant="secondary" outlined onPress={props.onTryMorning} /> : null;
  const header = <View style={styles.header}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <AppText variant="caption" weight="medium">aamu</AppText><DemoLabel />
    </View>
    <View style={styles.headerActions}>
      <TextAction label="Help" tone="primary" onPress={props.onHelp} />
      <TextAction label="Settings" tone="primary" onPress={props.onSettings} />
    </View>
  </View>;
  let card: React.ReactNode;
  if (off) card = <>
    <AppText variant="step">{homeCopy.alarmOff}</AppText>
    {props.alarmEnabled ? <AppText tone="secondary">{model.nextAlarmText}</AppText>
      : <PillButton label="Turn alarm on" loading={props.alarmBusy} onPress={props.onEnableAlarm} />}
  </>;
  else if (early) card = <>
    <AppText align="center" tone="secondary">{`Alarm at ${model.formattedAlarmTime}`}</AppText>
    <PillButton label="I’m already up" onPress={props.onEarlyHold} />
  </>;
  else if (resting) card = null;
  else if (props.removalVisible) card = <>
    <AppText accessibilityLiveRegion="polite">{homeCopy.removed}</AppText>
    <TextAction label="Undo" onPress={props.onUndoRemoval} />
  </>;
  else if (step) card = <>
    <AppText variant={evening ? 'step' : 'caption'} tone={evening ? 'primary' : 'secondary'}>
      {evening ? 'Did you get to it?' : `Today’s step · ${sizeLabels[step.size]}`}
    </AppText>
    <AppText variant={evening ? 'body' : 'step'}>{step.text}</AppText>
    {step.done === null ? <>
      <PillButton label={evening ? 'Yes' : 'Done'} onPress={props.onDone} />
      <TextAction label={evening ? 'Not today' : 'Too much today'} onPress={evening ? props.onNotToday : props.onShrink} />
    </> : <View style={styles.answered}>
      <AppText tone="secondary">{step.done ? 'Done' : 'Not today'}</AppText>
      <TextAction label="Undo" onPress={props.onUndoDone} />
    </View>}
  </>;
  else card = <AppText tone="secondary">{model.nextAlarmText}</AppText>;
  return <SceneScreen clearHorizon simulateReducedMotion={props.simulateReducedMotion} progress={skyProgressForClock(now.getHours(), now.getMinutes())}
    up={model.ownSunUp} paired={props.paired} partnerUp={model.partnerSunUp} sunLabels header={header}
    contentStyle={styles.content}>
    <View style={styles.hero}>
      {resting && <>
        <AppText variant="caption" tone="secondary" align="center">{model.alarmDayLabel ? `Alarm ${model.alarmDayLabel}` : ''}</AppText>
        <AppText variant="clock" weight="light" align="center" style={styles.clock}>{model.formattedAlarmTime}</AppText>
        {model.showSleepWell && !props.alarmSetupNotice && <AppText align="center" tone="secondary">Sleep well</AppText>}
      </>}
      {sunLine && <AppText variant="caption" tone="secondary" align="center">{sunLine}</AppText>}
      {!off && !resting && !early && <>
        <AppText variant="title" weight="light" align="center">{model.heroTitle}</AppText>
        {model.partnerLine && <AppText variant="caption" tone="secondary" align="center">{model.partnerLine}</AppText>}
      </>}
    </View>
    {(off || early) ? <View style={styles.plainActions}>
      {card}
      {props.notice && <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{props.notice}</AppText>}
      {props.alarmSetupNotice}
      {early && tryMorning}
    </View> : !resting ? <Card tone="protected" style={styles.stateCard}>
      {card}
      {props.notice && <AppText variant="caption" tone="secondary" accessibilityLiveRegion="polite">{props.notice}</AppText>}
      {props.alarmSetupNotice}
      {!off && !resting && !early && <>
        {props.hasMessage && <TextAction label="See your moment" onPress={props.onPlayMessage} />}
        {props.note}
      </>}
    </Card> : props.alarmSetupNotice || tryMorning ? <View style={styles.plainActions}>{props.alarmSetupNotice}{tryMorning}</View> : null}
  </SceneScreen>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  content: { justifyContent: 'space-between', gap: 40, paddingTop: 28, paddingBottom: 20 },
  hero: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 8 },
  clock: { fontSize: 56, lineHeight: 68, letterSpacing: -2 },
  stateCard: { gap: 16 },
  plainActions: { gap: 18, paddingBottom: 4 },
  answered: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
