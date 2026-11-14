import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, geometry } from '../../src/theme';
import { isMomentPhoto } from './moments';

/**
 * The person's own photo in a rounded frame. No text is ever drawn over it,
 * so its colours cannot affect text contrast. In the morning it fades in and
 * drifts very slowly; Reduce Motion shows it still.
 */
export function MomentPhoto({ uri, arrive = false, style }: { uri: string | undefined; arrive?: boolean; style?: StyleProp<ViewStyle> }) {
  const [opacity] = useState(() => new Animated.Value(arrive ? 0 : 1));
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!arrive) return;
    let alive = true; let running: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduced => {
      if (!alive) return;
      if (reduced) { opacity.setValue(1); return; }
      running = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 2_000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.06, duration: 14_000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]);
      running.start();
    });
    return () => { alive = false; running?.stop(); };
  }, [arrive, opacity, scale]);
  if (!isMomentPhoto(uri)) return null;
  return <View style={[styles.frame, style]} accessible accessibilityRole="image" accessibilityLabel="A photo you saved from a day you liked">
    <Animated.Image source={{ uri }} resizeMode="cover" style={[styles.photo, { opacity, transform: [{ scale }] }]} />
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: geometry.cardRadius, overflow: 'hidden', backgroundColor: colors.surfaceProtected },
  photo: { width: '100%', height: '100%' },
});
