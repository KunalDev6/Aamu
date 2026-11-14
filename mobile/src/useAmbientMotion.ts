import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useIsFocused } from 'expo-router';
import { ambientMotionAllowed, ambientMotionConfig } from '../../src/scene/visuals';

// RN-web 0.21 supports these CSS-keyframe styles. Native uses Animated below.
// This avoids its JS-driven Animated fallback in the browser review build.
type WebMotionStyle = ViewStyle & { animationKeyframes?: Record<string, Record<string, string | number>>;
  animationDuration?: string; animationIterationCount?: 'infinite'; animationTimingFunction?: string };
const webStyles = StyleSheet.create({
  stars: { animationKeyframes: { '0%, 100%': { opacity: 0.25 }, '50%': { opacity: 0.85 } },
    animationDuration: `${ambientMotionConfig.starsMs}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as WebMotionStyle,
  water: { animationKeyframes: { '0%, 100%': { opacity: 0.3, transform: 'translateX(-7px)' }, '50%': { opacity: 0.8, transform: 'translateX(7px)' } },
    animationDuration: `${ambientMotionConfig.waterMs}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as WebMotionStyle,
  clouds: { animationKeyframes: { '0%, 100%': { transform: 'translateX(-10px)' }, '50%': { transform: 'translateX(10px)' } },
    animationDuration: `${ambientMotionConfig.cloudsMs}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as WebMotionStyle,
  glow: { animationKeyframes: { '0%, 100%': { opacity: 0.45, transform: 'scale(0.98)' }, '50%': { opacity: 0.9, transform: 'scale(1.04)' } },
    animationDuration: `${ambientMotionConfig.glowMs}ms`, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' } as WebMotionStyle,
});

/** OS Reduce Motion is authoritative. A demo flag can only disable motion. */
export function useAmbientMotion({ night, lit, simulateReducedMotion = false }: {
  night: boolean; lit: boolean; simulateReducedMotion?: boolean;
}) {
  const focused = useIsFocused();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [active, setActive] = useState(() => AppState.currentState === 'active');
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [values] = useState(() => ({ stars: new Animated.Value(0), water: new Animated.Value(0),
    clouds: new Animated.Value(0), glow: new Animated.Value(0) }));
  useEffect(() => {
    let mounted = true; let receivedChange = false;
    const reduced = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      receivedChange = true; setReducedMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !receivedChange) setReducedMotion(value);
    }).catch(() => { /* Unknown accessibility preference keeps motion disabled. */ });
    const appState = AppState.addEventListener('change', state => setActive(state === 'active'));
    const visibility = () => setVisible(!document.hidden);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted = false; reduced?.remove(); appState.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const enabled = ambientMotionAllowed({ reducedMotion, simulatedReducedMotion: simulateReducedMotion,
    active, focused, visible });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const definitions = [
      { value: values.stars, duration: ambientMotionConfig.starsMs, wanted: night },
      { value: values.water, duration: ambientMotionConfig.waterMs, wanted: true },
      { value: values.clouds, duration: ambientMotionConfig.cloudsMs, wanted: true },
      { value: values.glow, duration: ambientMotionConfig.glowMs, wanted: lit },
    ];
    const loops = definitions.filter(item => enabled && item.wanted).map(({ value, duration }) => {
      // One native timing loop; interpolation makes the return trip. No frame
      // listeners, setInterval, or JS callbacks at each half-cycle.
      const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration,
        easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
      loop.start(); return loop;
    });
    return () => { loops.forEach(loop => loop.stop()); Object.values(values).forEach(value => { value.stopAnimation(); value.setValue(0); }); };
  }, [enabled, night, lit, values]);
  const wave = (value: Animated.Value, low: number, high: number) => value.interpolate({
    inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    outputRange: [0, 0.1464, 0.5, 0.8536, 1, 0.8536, 0.5, 0.1464, 0].map(t => low + (high - low) * t),
  });
  if (Platform.OS === 'web') return {
    enabled, stars: enabled && night ? webStyles.stars : { opacity: 0.25 },
    water: enabled ? webStyles.water : { opacity: 0.3 },
    clouds: enabled ? webStyles.clouds : {}, glow: enabled && lit ? webStyles.glow : { opacity: 0.45 },
  };
  return { enabled,
    stars: { opacity: wave(values.stars, 0.25, 0.85) },
    water: { opacity: wave(values.water, 0.3, 0.8), transform: [{ translateX: wave(values.water, -7, 7) }] },
    clouds: { transform: [{ translateX: wave(values.clouds, -10, 10) }] },
    glow: { opacity: wave(values.glow, 0.45, 0.9), transform: [{ scale: wave(values.glow, 0.98, 1.04) }] },
  };
}
