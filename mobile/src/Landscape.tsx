import React, { useId, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, geometry, typography } from '../../src/theme';
import { ambientColors, clampProgress, mixSceneColor, sceneColors, skyGradientStops } from '../../src/scene/visuals';
import { useAmbientMotion } from './useAmbientMotion';

export type LandscapeProps = {
  progress: number;
  /** Review-only switch; it can never turn off OS Reduce Motion. */
  simulateReducedMotion?: boolean;
  up: boolean;
  /** Confirmed normal hold: 0..1 raises/fills the sun; omitted stays static. */
  sunriseProgress?: number;
  paired?: boolean;
  partnerUp?: boolean;
  /** Paired Home only: name the two halves on opaque tags above the sun. */
  sunLabels?: boolean;
  height?: number;
  /** Adapt the sky canvas to its measured viewport; never crop to a card ratio. */
  fullBleed?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Omit for decorative use; the owning screen can describe wake state. */
  accessibilityLabel?: string;
};

// RN-web Animated.View flattens and drops registered CSS keyframes.
// Plain web View preserves them; native still uses the compositor driver.
const MotionView = Platform.OS === 'web' ? View as typeof Animated.View : Animated.View;

function pine(x: number, base: number, height: number, width: number): string {
  let path = `M${x - 1} ${base}h2v-${height * 0.18}h-2z`;
  for (let index = 0; index < 3; index += 1) {
    const top = base - height + index * height * 0.26;
    const bottom = top + height * 0.42;
    const halfWidth = width * (0.32 + 0.22 * index);
    path += `M${x} ${top}L${x + halfWidth} ${bottom}H${x - halfWidth}z`;
  }
  return path;
}

const nearTrees = [[18, 315, 68, 27], [45, 322, 49, 21], [72, 315, 34, 15], [326, 315, 55, 23], [352, 322, 73, 29], [377, 319, 40, 18]];
const farTrees = [[94, 257, 17, 8], [108, 257, 12, 6], [290, 256, 15, 7], [305, 256, 11, 5]];
const nearPines = nearTrees.map(([x, base, height, width]) => pine(x, base, height, width)).join('');
const farPines = farTrees.map(([x, base, height, width]) => pine(x, base, height, width)).join('');

/** Dawn changes the sky only. The unlit sun stays outlined; warm fill requires confirmed up. */
export function Landscape({
  progress, up, sunriseProgress = 1, paired = false, partnerUp = false, sunLabels = false, height = 410,
  fullBleed = false, style, accessibilityLabel, simulateReducedMotion = false,
}: LandscapeProps) {
  const window = useWindowDimensions();
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const canvasHeight = fullBleed ? 390 * (viewport?.height ?? window.height) / Math.max(1, viewport?.width ?? window.width) : 410;
  const viewportWidth = viewport?.width ?? window.width;
  const scale = fullBleed ? viewportWidth / 390 : Math.max(viewportWidth / 390, (viewport?.height ?? height) / 410);
  const cropX = fullBleed ? 0 : (390 * scale - viewportWidth) / 2;
  const cropY = fullBleed ? 0 : (410 * scale - (viewport?.height ?? height)) / 2;
  // Keep the decorative sun/glow below top text on shorter screens too.
  const sceneOffset = fullBleed ? Math.max(canvasHeight * 0.52 - 219, 300 / scale - 99) : 0;
  const groundEnd = canvasHeight - sceneOffset;
  const scene = useMemo(() => sceneColors(progress), [progress]);
  const skyStops = useMemo(() => skyGradientStops(progress), [progress]);
  const prefix = `landscape-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const id = (name: string) => `${prefix}-${name}`;
  const fill = (name: string) => `url(#${id(name)})`;
  const visibleSun = up || (paired && partnerUp);
  const nightAmount = Math.max(0, 1 - clampProgress(progress) / 0.35);
  const motion = useAmbientMotion({ night: nightAmount > 0, lit: visibleSun, simulateReducedMotion });
  const ownSunrise = up ? clampProgress(sunriseProgress) : 1;
  // An already-confirmed partner keeps the shared sun raised while the person's
  // own half fills. Their state must not dim/replay during the person's hold.
  const sunrise = paired && partnerUp ? 1 : visibleSun ? ownSunrise : 1;
  return (
    <View
      pointerEvents="none"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      onLayout={event => {
        const { width, height: measuredHeight } = event.nativeEvent.layout;
        if (width > 0 && measuredHeight > 0) setViewport(previous => previous?.width === width && previous.height === measuredHeight
          ? previous : { width, height: measuredHeight });
      }}
      style={[styles.landscape, fullBleed ? styles.fullBleed : { height }, style]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 390 ${canvasHeight}`} preserveAspectRatio={fullBleed ? 'none' : 'xMidYMid slice'} style={StyleSheet.absoluteFill}>
        <Defs><LinearGradient id={id('sky-field')} x1="0" y1="0" x2="0" y2="1">
          {skyStops.map(stop => <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />)}
        </LinearGradient></Defs>
        <Rect width="390" height={canvasHeight} fill={fill('sky-field')} />
      </Svg>
      {nightAmount > 0 && <MotionView style={[StyleSheet.absoluteFill, motion.stars]}>
        <Svg width="100%" height="100%" viewBox={`0 0 390 ${canvasHeight}`} preserveAspectRatio={fullBleed ? 'none' : 'xMidYMid slice'}>
          <G fill={ambientColors.star} opacity={nightAmount * 0.4}>
            {[[38, 0.11], [84, 0.25], [138, 0.08], [194, 0.29], [244, 0.14], [312, 0.23], [355, 0.09], [21, 0.34], [328, 0.34]].map(([x, y], index) =>
              <Circle key={index} cx={x} cy={canvasHeight * y} r={index % 3 === 0 ? 1.2 : 0.8} />)}
          </G>
        </Svg>
      </MotionView>}
      <MotionView style={[StyleSheet.absoluteFill, motion.clouds]}>
        <Svg width="100%" height="100%" viewBox={`0 0 390 ${canvasHeight}`} preserveAspectRatio={fullBleed ? 'none' : 'xMidYMid slice'}>
          <G fill={ambientColors.cloud} opacity={0.035} transform={`translate(0 ${canvasHeight * 0.28})`}>
            <Path d="M-28 0C12-11 28-8 49-6C64-20 96-19 118-9C144-13 167-6 181 0C119 6 40 8-28 0Z" />
            <Path d="M208 55C232 43 256 47 269 46C283 34 312 37 330 47C358 41 386 46 421 55C353 61 267 62 208 55Z" />
          </G>
        </Svg>
      </MotionView>
      {visibleSun && <MotionView style={[styles.glow, {
        left: (269 - 84) * scale - cropX, top: (sceneOffset + 183 + 56 * (1 - sunrise) - 84) * scale - cropY,
        width: 168 * scale, height: 168 * scale, opacity: sunrise,
      }, motion.glow]}>
        <Svg width="100%" height="100%" viewBox="0 0 168 168">
          <Defs><RadialGradient id={id('ambient-glow')}>
            <Stop offset="0" stopColor={ambientColors.glow} stopOpacity={0.3} />
            <Stop offset="0.42" stopColor={ambientColors.glow} stopOpacity={0.15} />
            <Stop offset="1" stopColor={ambientColors.glow} stopOpacity={0} />
          </RadialGradient></Defs>
          <Circle cx="84" cy="84" r="84" fill={fill('ambient-glow')} opacity={sunrise} />
        </Svg>
      </MotionView>}
      <Svg width="100%" height="100%" viewBox={`0 0 390 ${canvasHeight}`} preserveAspectRatio={fullBleed ? 'none' : 'xMidYMid slice'} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('lake')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mixSceneColor(scene.horizon, scene.sky, 0.35)} />
            <Stop offset="0.35" stopColor={mixSceneColor(scene.sky, scene.horizon, 0.4)} />
            <Stop offset="0.72" stopColor={mixSceneColor(scene.sky, scene.hillNear, 0.3)} />
            <Stop offset="1" stopColor={mixSceneColor(scene.sky, scene.hillNear, 0.55)} />
          </LinearGradient>
          <RadialGradient id={id('sun-glow')}>
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.24} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={id('ground-fade')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={0} />
            <Stop offset="0.85" stopColor={colors.canvas} />
          </LinearGradient>
        </Defs>
        <G transform={`translate(0 ${sceneOffset})`}>
        <G transform={`translate(0 ${56 * (1 - sunrise)})`}>
          {visibleSun && <Circle cx="269" cy="183" r="84" fill={fill('sun-glow')} opacity={sunrise} />}
          {paired ? (
            <G>
              {/* A thin gap keeps the two halves readable as two people. */}
              {up && <Path d="M268 158.02A25 25 0 0 0 268 207.98Z" fill={colors.accentLight} opacity={ownSunrise} />}
              {partnerUp && <Path d="M270 158.02A25 25 0 0 1 270 207.98Z" fill={colors.accentLight} />}
              {!up && !partnerUp && <Path d="M269 158V208" stroke={colors.lineVisible} strokeWidth={1.5} />}
            </G>
          ) : up && <Circle cx="269" cy="183" r="25" fill={colors.accentLight} opacity={sunrise} />}
          <Circle
            cx="269" cy="183" r="25" fill="none"
            stroke={visibleSun ? colors.accentLight : colors.lineVisible}
            strokeOpacity={visibleSun ? 0.28 : 1} strokeWidth={1.5}
          />
          {paired && sunLabels && <G>
            <Rect x="212" y="122" width="54" height="28" rx="14" fill={colors.surfaceProtected} />
            <SvgText x="239" y="142" textAnchor="middle" fontFamily={typography.family} fontSize="17" fill={colors.textSecondary}>You</SvgText>
            <Rect x="272" y="122" width="88" height="28" rx="14" fill={colors.surfaceProtected} />
            <SvgText x="316" y="142" textAnchor="middle" fontFamily={typography.family} fontSize="17" fill={colors.textSecondary}>Partner</SvgText>
          </G>}
        </G>
        <Path d={`M0 219C45 200 85 210 128 215S225 196 278 205S355 208 390 205V${groundEnd}H0Z`} fill={scene.hillFar} />
        <Path d={`M0 238C65 217 117 235 174 234S281 215 390 235V${groundEnd}H0Z`} fill={scene.hillMiddle} />
        <Path d={`M0 254C68 239 142 255 220 248S337 240 390 251V${groundEnd}H0Z`} fill={scene.hillNear} />
        <Path d={farPines} fill={scene.pine} />
        <Path d="M0 257C98 253 163 260 229 257S341 253 390 258V309H0Z" fill={fill('lake')} />
        {visibleSun && (
          <G stroke={colors.accentLight} strokeLinecap="round" opacity={sunrise}>
            <Path d="M238 267h61" strokeWidth={2} opacity={0.65} />
            <Path d="M248 274h42" strokeWidth={2} opacity={0.45} />
            <Path d="M256 281h27" strokeWidth={1.5} opacity={0.3} />
          </G>
        )}
        <Path d={`M0 307C66 291 144 313 231 307S345 297 390 306V${groundEnd}H0Z`} fill={scene.hillMiddle} />
        <Path d={`M0 325C89 312 194 333 292 323S365 317 390 323V${groundEnd}H0Z`} fill={scene.hillNear} />
        <Path d={nearPines} fill={scene.pine} />
        <Rect y="315" width="390" height={Math.max(0, groundEnd - 315)} fill={fill('ground-fade')} />
        </G>
      </Svg>
      <MotionView style={[StyleSheet.absoluteFill, motion.water]}>
        <Svg width="100%" height="100%" viewBox={`0 0 390 ${canvasHeight}`} preserveAspectRatio={fullBleed ? 'none' : 'xMidYMid slice'}>
          <G transform={`translate(0 ${sceneOffset})`} stroke={scene.horizon} strokeLinecap="round" fill="none" opacity={0.25}>
            <Path d="M55 265c23-2 42-2 61 0M152 271c23-1 46-1 70 0M278 263c15-1 29-1 43 0" strokeWidth={1.2} />
            <Path d="M23 285c35-2 69-1 91 1M185 292c34-2 77-2 117 0M321 281h44" strokeWidth={0.8} />
          </G>
        </Svg>
      </MotionView>
      {/* The full-height field needs no second top fade or horizontal clear band. */}
      {!fullBleed && <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id('top-fade')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.canvas} />
            <Stop offset="1" stopColor={colors.canvas} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={id('bottom-fade')} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.canvas} />
          </LinearGradient>
        </Defs>
        <Rect y="76" width="100" height="24" fill={fill('bottom-fade')} />
      </Svg>}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
  landscape: { width: '100%', overflow: 'hidden', borderRadius: geometry.cardRadius, backgroundColor: colors.canvas },
  fullBleed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    width: '100%', height: '100%', borderRadius: 0 },
});
