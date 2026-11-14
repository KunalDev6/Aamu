import React, { forwardRef, useId, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import type {
  PressableProps, StyleProp, TextInputProps, TextProps, TextStyle, ViewProps, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, geometry, typography } from '../../src/theme';

type TextVariant = 'body' | 'caption' | 'label' | 'title' | 'step' | 'clock';
type TextTone = 'primary' | 'secondary' | 'accent' | 'onAccent';
type TextWeight = 'light' | 'regular' | 'medium';

const textVariants: Record<TextVariant, TextStyle> = {
  body: { fontSize: typography.body, lineHeight: 28, fontWeight: '400' },
  caption: { fontSize: typography.minimum, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: typography.body, lineHeight: 26, fontWeight: '500' },
  title: { fontSize: 32, lineHeight: 42, letterSpacing: -1.1, fontWeight: '400' },
  step: { fontSize: typography.step, lineHeight: 38, letterSpacing: -0.8, fontWeight: '500' },
  clock: {
    fontSize: typography.clock, lineHeight: 84, letterSpacing: -3.6,
    fontWeight: '300', fontVariant: ['tabular-nums'],
  },
};
const textColors: Record<TextTone, string> = {
  primary: colors.textPrimary, secondary: colors.textSecondary,
  accent: colors.accent, onAccent: colors.textOnAccent,
};
const textWeights: Record<TextWeight, TextStyle['fontWeight']> = {
  light: '300', regular: '400', medium: '500',
};

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextStyle['textAlign'];
};

/** Load the bundled font as "Plus Jakarta Sans" before rendering the app. */
export function AppText({
  variant = 'body', tone = 'primary', weight, align, style, ...props
}: AppTextProps) {
  const flattened = StyleSheet.flatten(style);
  const fontSize = Math.max(typography.minimum, flattened?.fontSize ?? textVariants[variant].fontSize!);
  const lineHeight = Math.max(fontSize * (variant === 'clock' ? 1.15 : 1.3), flattened?.lineHeight ?? textVariants[variant].lineHeight!);
  return (
    <Text
      allowFontScaling
      {...props}
      style={[
        textVariants[variant], { color: textColors[tone], textAlign: align },
        weight ? { fontWeight: textWeights[weight] } : undefined,
        style, { fontFamily: typography.family, fontSize, lineHeight },
      ]}
    />
  );
}

export type PillButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'quiet';
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  /** Visible neutral edge for quiet controls such as Help. */
  outlined?: boolean;
  /** Presentation only: the owning flow supplies hold progress and behavior. */
  progress?: number;
};

export function PillButton({
  label, variant = 'primary', style, loading = false, outlined = false, progress, disabled,
  accessibilityState, onFocus, onBlur, ...props
}: PillButtonProps) {
  const [focused, setFocused] = useState(false);
  const inactive = Boolean(disabled || loading);
  const amount = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress!)) : 0;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: inactive, busy: loading }}
      disabled={inactive}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      style={({ pressed }) => {
        const backgroundColor = inactive ? colors.surfaceRaised
          : variant === 'primary' ? (pressed ? colors.accentPressed : colors.accent)
            : variant === 'secondary' ? (pressed ? colors.lineQuiet : colors.surfaceRaised)
              : (pressed ? colors.surfaceRaised : colors.surfaceProtected);
        const outlineColor = variant === 'primary' && !inactive ? colors.textOnAccent : colors.lineVisible;
        return [
          styles.pill, variant === 'quiet' && styles.quietPill,
          { backgroundColor, borderColor: focused ? colors.accentLight : outlined || variant === 'secondary' ? outlineColor : backgroundColor }, style,
        ];
      }}
    >
      {progress !== undefined && !inactive && (
        <View
          pointerEvents="none"
          style={[styles.holdFill, {
            width: `${amount * 100}%`,
            backgroundColor: variant === 'primary' ? colors.accentLight : colors.lineQuiet,
          }]}
        />
      )}
      <AppText
        variant={variant === 'quiet' ? 'caption' : 'label'}
        tone={inactive || variant === 'quiet' ? 'secondary' : variant === 'primary' ? 'onAccent' : 'primary'}
        align="center"
        style={styles.buttonLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export type CardProps = ViewProps & { tone?: 'surface' | 'raised' | 'protected'; padding?: number };
export function Card({ tone = 'surface', padding = 24, style, ...props }: CardProps) {
  const backgroundColor = tone === 'raised' ? colors.surfaceRaised
    : tone === 'protected' ? colors.surfaceProtected : colors.surface;
  return <View {...props} style={[styles.card, { backgroundColor, padding }, style]} />;
}

export type ScreenProps = ViewProps & {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  background?: React.ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

/** Safe-area chrome and protected footer; caller owns all text/navigation. */
export function Screen({
  header, footer, background, scroll = true, keyboardAvoiding = true,
  contentStyle, edges = ['top', 'right', 'bottom', 'left'], style, children, ...props
}: ScreenProps) {
  const glowId = `screen-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <SafeAreaView {...props} edges={edges} style={[styles.screen, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        enabled={keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={glowId} cx="75%" cy="18%" rx="85%" ry="55%">
                <Stop offset="0" stopColor={colors.nightSky} stopOpacity={0.6} />
                <Stop offset="1" stopColor={colors.canvas} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${glowId})`} />
          </Svg>
          {background}
        </View>
        {header ? <View style={styles.header}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const Field = forwardRef<React.ComponentRef<typeof TextInput>, FieldProps>(function Field({
  label, hint, error, containerStyle, style, multiline, onFocus, onBlur,
  accessibilityLabel, accessibilityHint, ...props
}, ref) {
  const [focused, setFocused] = useState(false);
  const flattened = StyleSheet.flatten(style);
  const fontSize = Math.max(typography.minimum, flattened?.fontSize ?? typography.body);
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      {label ? <AppText variant="caption" tone="secondary">{label}</AppText> : null}
      <TextInput
        ref={ref}
        {...props}
        multiline={multiline}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? error ?? hint}
        allowFontScaling
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        underlineColorAndroid={colors.surfaceProtected}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[
          styles.input, multiline && styles.multilineInput,
          { borderColor: focused || error ? colors.accent : colors.lineQuiet },
          style, { fontFamily: typography.family, fontSize, lineHeight: Math.max(fontSize * 1.45, flattened?.lineHeight ?? 26) },
        ]}
      />
      {error || hint ? (
        <AppText variant="caption" tone="secondary" accessibilityLiveRegion={error ? 'polite' : undefined}>
          {error ?? hint}
        </AppText>
      ) : null}
    </View>
  );
});

export type SectionHeadingProps = ViewProps & { title: string; description?: string };
export function SectionHeading({ title, description, style, ...props }: SectionHeadingProps) {
  return (
    <View {...props} style={[styles.sectionHeading, style]}>
      <AppText variant="title" accessibilityRole="header">{title}</AppText>
      {description ? <AppText tone="secondary">{description}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: geometry.screenGutter, paddingTop: 12, paddingBottom: 20 },
  content: { flexGrow: 1, paddingHorizontal: geometry.screenGutter, paddingTop: 12, paddingBottom: 28, gap: 20 },
  footer: { paddingHorizontal: geometry.screenGutter, paddingTop: 16, paddingBottom: 12, gap: 12, backgroundColor: colors.canvas },
  pill: {
    alignSelf: 'stretch', width: '100%', minHeight: geometry.primaryHeight,
    paddingVertical: 16, paddingHorizontal: 24,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: geometry.controlRadius, borderWidth: 1.5, overflow: 'hidden',
  },
  quietPill: { minHeight: 52, paddingVertical: 12, paddingHorizontal: 20 },
  buttonLabel: { flexShrink: 1 },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  card: { borderRadius: geometry.cardRadius, gap: 12 },
  fieldGroup: { gap: 10 },
  input: {
    minHeight: 62, paddingHorizontal: 20, paddingVertical: 16,
    color: colors.textPrimary, backgroundColor: colors.surfaceProtected,
    borderWidth: 1, borderRadius: 22, fontWeight: '400',
  },
  multilineInput: { minHeight: 120, textAlignVertical: 'top' },
  sectionHeading: { gap: 12, paddingBottom: 4 },
});
