import React, { useId, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, geometry } from '../../src/theme';
import { Landscape } from './Landscape';
import { sceneScrimStops } from '../../src/scene/visuals';

export type SceneScreenProps = {
  progress: number;
  /** Can only disable motion; OS Reduce Motion always wins. */
  simulateReducedMotion?: boolean;
  up: boolean;
  paired?: boolean;
  partnerUp?: boolean;
  sunLabels?: boolean;
  sunriseProgress?: number;
  /** Decorative layer above the landscape and below the text scrim. */
  overlay?: React.ReactNode;
  header?: React.ReactNode;
  children?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  scroll?: boolean;
  /** Home only: direct text stays in the top band; lower text uses opaque cards. */
  clearHorizon?: boolean;
};

export { sceneScrimMinimumOpacity } from '../../src/scene/visuals';

/** Full-screen illustration, safe-area controls and scrollable bottom content. */
export function SceneScreen({ progress, up, paired, partnerUp, sunLabels, sunriseProgress, overlay,
  header, children, contentStyle, footer, scroll = true, clearHorizon = false, simulateReducedMotion = false }: SceneScreenProps) {
  const scrimId = `scene-scrim-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const window = useWindowDimensions();
  const [height, setHeight] = useState<number | null>(null);
  const scrim = sceneScrimStops(clearHorizon, height ?? window.height);
  return <View style={styles.root} onLayout={event => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0) setHeight(previous => previous === measured ? previous : measured);
  }}>
    <Landscape fullBleed simulateReducedMotion={simulateReducedMotion} progress={progress} up={up} paired={paired} partnerUp={partnerUp} sunLabels={sunLabels} sunriseProgress={sunriseProgress} />
    {overlay ? <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{overlay}</View> : null}
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs><LinearGradient id={scrimId} x1="0" y1="0" x2="0" y2="1">
          {scrim.map(stop => <Stop key={stop.offset} offset={stop.offset} stopColor={colors.canvas} stopOpacity={stop.opacity} />)}
        </LinearGradient></Defs>
        <Rect width="100" height="100" fill={`url(#${scrimId})`} />
      </Svg>
    </View>
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {scroll ? <ScrollView style={styles.flex} contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView> : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: geometry.screenGutter, paddingTop: 12, paddingBottom: 20 },
  content: { flexGrow: 1, justifyContent: 'space-between', gap: 24,
    paddingHorizontal: geometry.screenGutter, paddingTop: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: geometry.screenGutter, paddingTop: 12, paddingBottom: 12, gap: 12 },
});
