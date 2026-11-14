import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { colors } from '../../src/theme';
import { AppText } from './ui';
import { sizeLabels, sizeMinutes } from './store';

export type LadderSize = 'tiny' | 'small' | 'full';
export const ladderSizes: LadderSize[] = ['tiny', 'small', 'full'];
/** Which morning each size is for. A morning's level sets the largest size offered. */
export const ladderMornings: Record<LadderSize, string> = {
  tiny: 'For a hard morning', small: 'For an in-between morning', full: 'For an easier morning',
};
export const ladderIntro = 'Aamu turns your goal into one step in three sizes. Each morning you get just one of them: the size that fits how that morning went.';
const dot: Record<LadderSize, number> = { tiny: 10, small: 14, full: 18 };

/** One rung: a dot that grows with the size, joined by a rail to the next rung. */
export function LadderRung({ size, last = false, children }: { size: LadderSize; last?: boolean; children?: React.ReactNode }) {
  return <View style={styles.rung}>
    <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.dot, { width: dot[size], height: dot[size], borderRadius: dot[size] / 2 }]} />
      {!last && <View style={styles.line} />}
    </View>
    <View style={[styles.body, !last && styles.bodyGap]}>
      <AppText variant="label">{sizeLabels[size]}</AppText>
      <AppText variant="caption" tone="secondary">
        {`Up to ${sizeMinutes[size]} minutes${size === 'tiny' ? ' · At home' : ''} · ${ladderMornings[size]}`}
      </AppText>
      {children}
    </View>
  </View>;
}

/** Shown while steps are being written, so the wait already looks like its result. */
export function LadderPlaceholder() {
  const [pulse] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    let alive = true; let running: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduced => {
      if (!alive || reduced) return;
      running = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      running.start();
    });
    return () => { alive = false; running?.stop(); };
  }, [pulse]);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {ladderSizes.map((size, index) => <LadderRung key={size} size={size} last={index === ladderSizes.length - 1}>
      <Animated.View style={[styles.placeholder, { opacity: pulse, width: `${55 + index * 15}%` }]} />
    </LadderRung>)}
  </View>;
}

const styles = StyleSheet.create({
  rung: { flexDirection: 'row', gap: 14 },
  rail: { width: 20, alignItems: 'center', paddingTop: 6 },
  dot: { backgroundColor: colors.textSecondary },
  line: { flex: 1, width: 2, marginTop: 6, backgroundColor: colors.lineQuiet },
  body: { flex: 1, gap: 6 },
  bodyGap: { paddingBottom: 22 },
  placeholder: { height: 18, borderRadius: 9, marginTop: 6, backgroundColor: colors.surfaceRaised },
});
