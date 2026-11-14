import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppText } from './ui';
import { colors } from '../../src/theme';

/** Word-labelled action with a full touch target and no pill-shaped surface. */
export function TextAction({ label, onPress, style, disabled = false, tone = 'secondary', accessibilityLabel }: {
  label: string; onPress(): void; style?: StyleProp<ViewStyle>; disabled?: boolean;
  tone?: 'primary' | 'secondary'; accessibilityLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.action, focused && { borderColor: colors.lineVisible },
      pressed && { backgroundColor: colors.surfaceProtected }, style]}>
    <AppText variant="caption" tone={tone} align="center">{label}</AppText>
  </Pressable>;
}
const styles = StyleSheet.create({
  action: { minHeight: 44, minWidth: 44, paddingHorizontal: 8, paddingVertical: 8,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent', borderRadius: 12 },
});
