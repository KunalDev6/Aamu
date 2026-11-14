import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../src/theme';
import { AppText } from './ui';
import { sizeLabels } from './store';
import { sunHigh } from './Landscape';
import { TextAction } from './TextAction';

type Size = 'tiny' | 'small' | 'full';
type Level = 'easy' | 'medium' | 'hard';
const sizes: Size[] = ['tiny', 'small', 'full'];
const mornings: Record<Level, string> = { easy: 'An easier morning', medium: 'An in-between morning', hard: 'A hard morning' };

const dot: Record<Size, number> = { tiny: 10, small: 14, full: 18 };

/**
 * What the alarm noticed, and which of the three sizes today's step is. This is
 * information, not a control: three growing dots (the same ones as on the goal
 * screen) with today's one filled, and a sentence. Facts only, no judgement.
 */
export type SizeChoice = {
  snoozePoints: number; timingPoints: number; usualSnoozes: number; usualMinutes: number;
  usualFromHistory: boolean; carry: Size; limit: Size;
};
const levelPoints = 'Fewer points mean getting up was easier: 0–1 is an easier morning, 2 is in-between, 3 or more is hard.';

/** The exact rule that picked today's size, with this morning's numbers. Nothing here is a model output. */
function ChoiceDetails({ choice, snoozes, minutes, level, size }: { choice: SizeChoice; snoozes: number; minutes: number; level: Level; size: Size }) {
  const [open, setOpen] = useState(false);
  if (!open) return <TextAction label="How Aamu chose this" onPress={() => setOpen(true)} />;
  const rounded = Math.max(1, Math.round(minutes)); const total = choice.snoozePoints + choice.timingPoints;
  const rows: [string, string][] = [
    [`Snoozes: ${snoozes}`, `usual ${choice.usualSnoozes} · +${choice.snoozePoints}`],
    [`Time to get up: ${rounded} min`, `usual ${Math.round(choice.usualMinutes)} min · +${choice.timingPoints}`],
    [`${total} ${total === 1 ? 'point' : 'points'}`, mornings[level].replace('A', 'a').replace('An', 'an')],
  ];
  return <View style={styles.details}>
    <AppText variant="label">Morning difficulty points</AppText>
    {rows.map(([left, right]) => <View key={left} style={styles.detailRow}>
      <AppText variant="caption">{left}</AppText><AppText variant="caption" tone="secondary">{right}</AppText>
    </View>)}
    <AppText variant="caption" tone="secondary">{levelPoints}</AppText>
    <AppText variant="caption" tone="secondary">{`${mornings[level]} allows up to ${sizeLabels[choice.limit]}. Step progression currently allows up to ${sizeLabels[choice.carry]}. Today's step is the smaller of the two: ${sizeLabels[size]}.`}</AppText>
    <AppText variant="caption" tone="secondary">{choice.usualFromHistory
      ? 'Your usual comes from your own first mornings.'
      : 'Until there are five mornings to learn your usual, Aamu starts from 0 snoozes and 8 minutes.'} These are starting values, not clinically validated.</AppText>
    <TextAction label="Hide" onPress={() => setOpen(false)} />
  </View>;
}

/** What finishing a step does: it lets the next step from this goal grow a size. */
export function doneLine(size: Size): string {
  return size === 'full' ? 'Done. That was the full step. Next time this goal comes up, it can be Full again.'
    : `Done. Next time this goal comes up, the step can grow to ${sizeLabels[size === 'tiny' ? 'small' : 'full']}.`;
}

export function TodaySize({ size, level, snoozes, minutes, choice, compact = false }: { size: Size; level: Level; snoozes: number; minutes: number; choice?: SizeChoice; compact?: boolean }) {
  const rounded = Math.max(1, Math.round(minutes));
  const noticed = snoozes === 0 ? `up in ${rounded} min, no snoozes` : `${snoozes} ${snoozes === 1 ? 'snooze' : 'snoozes'}, ${rounded} min to get up`;
  const which = size === 'tiny' ? 'the smallest of three' : size === 'small' ? 'the middle of three' : 'the biggest of three';
  return <View style={styles.block} accessible accessibilityLabel={`${mornings[level]}: ${noticed}. Today's step is ${sizeLabels[size]}, ${which}.`}>
    <AppText variant="caption" tone="secondary">{`${mornings[level]}: ${noticed}.`}</AppText>
    {!compact && <View style={styles.row}>
      <View style={styles.dots}>
        {sizes.map(item => <View key={item} style={[{ width: dot[item], height: dot[item], borderRadius: dot[item] / 2 },
          item === size ? styles.chosen : styles.other]} />)}
      </View>
      <AppText variant="caption" style={styles.sentence}>{`So today's step is ${sizeLabels[size]}, ${which}.`}</AppText>
    </View>}
    {choice && <ChoiceDetails choice={choice} snoozes={snoozes} minutes={minutes} level={level} size={size} />}
  </View>;
}

async function motionAllowed() { return !(await AccessibilityInfo.isReduceMotionEnabled().catch(() => false)); }

/** Content that arrives by rising a little into place. Still under Reduce Motion. */
export function Rise({ children }: { children: React.ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let alive = true; let running: Animated.CompositeAnimation | null = null;
    void motionAllowed().then(allowed => {
      if (!alive) return;
      if (!allowed) { progress.setValue(1); return; }
      running = Animated.timing(progress, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      running.start();
    });
    return () => { alive = false; running?.stop(); };
  }, [progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] }}>
    {children}
  </Animated.View>;
}

/** One warm wave of light spreading from the sun when the hold completes. Sits under the text scrim. */
export function SunBloom() {
  const window = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let alive = true; let running: Animated.CompositeAnimation | null = null;
    void motionAllowed().then(allowed => {
      if (!alive) return;
      if (!allowed) { setVisible(false); return; }
      running = Animated.timing(progress, { toValue: 1, duration: 2_200, easing: Easing.out(Easing.quad), useNativeDriver: true });
      running.start(() => { if (alive) setVisible(false); });
    });
    return () => { alive = false; running?.stop(); };
  }, [progress]);
  if (!visible) return null;
  // Same geometry as the full-screen landscape: the sun sits at 269/390 of the
  // width, 36 canvas units above 52% of the height, plus its fully risen offset.
  const scale = window.width / 390; const size = 110;
  const left = 269 * scale - size / 2; const top = window.height * 0.52 + (sunHigh - 36) * scale - size / 2;
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size,
    opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.75, 0] }),
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 9] }) }] }}>
    {/* A soft-edged glow: bright at the sun, fading to nothing at the rim. */}
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs><RadialGradient id="aamu-sun-bloom" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={colors.accentLight} stopOpacity={0.9} />
        <Stop offset="0.55" stopColor={colors.accentLight} stopOpacity={0.35} />
        <Stop offset="1" stopColor={colors.accentLight} stopOpacity={0} />
      </RadialGradient></Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#aamu-sun-bloom)" />
    </Svg>
  </Animated.View>;
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentence: { flex: 1 },
  details: { gap: 8, paddingTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  chosen: { backgroundColor: colors.textPrimary },
  other: { borderWidth: 1.5, borderColor: colors.lineVisible },
});
