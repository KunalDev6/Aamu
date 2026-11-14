import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, geometry } from '../../src/theme';
import { AppText, Screen } from './ui';
import { demoText } from './demo/config';
import { DemoLabel } from './demo/DemoLabel';

export type SettingsViewProps = {
  alarmTime: string | null;
  alarmEnabled: boolean;
  goalCount: number;
  momentCount: number;
  place: 'Sea' | 'Forest' | 'Mine';
  paired: boolean;
  clinicEnabled: boolean;
  demoEnabled?: boolean;
  onBack: () => void;
  onAlarm: () => void;
  onGoals: () => void;
  onMoments: () => void;
  onPlace: () => void;
  onPartner: () => void;
  onPeople: () => void;
  onHelp: () => void;
  onDemo?: () => void;
};

type RowProps = { label: string; value: string; onPress: () => void; last?: boolean };

function SettingsRow({ label, value, onPress, last = false }: RowProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => [styles.row, {
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          borderColor: focused ? colors.lineVisible : pressed ? colors.surfaceRaised : colors.surface,
        }]}
      >
        <AppText style={styles.rowLabel}>{label}</AppText>
        <View style={styles.rowTrailing}>
          <AppText variant="caption" tone="secondary" align="right" style={styles.rowValue}>{value}</AppText>
          <AppText
            variant="label" tone="secondary" accessible={false} accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants" aria-hidden style={styles.chevron}
          >›</AppText>
        </View>
      </Pressable>
      {!last && <View style={styles.divider} />}
    </View>
  );
}

function SettingsTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '‹ Back' ? 'Back' : label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.textButton, {
        backgroundColor: pressed ? colors.surfaceRaised : colors.canvas,
        borderColor: focused ? colors.lineVisible : pressed ? colors.surfaceRaised : colors.canvas,
      }]}
    >
      <AppText variant="caption" tone="secondary">{label}</AppText>
    </Pressable>
  );
}

/** Presentation only: real routes and clearly labelled review fixtures supply their own values/actions. */
export function SettingsView({
  alarmTime, alarmEnabled, goalCount, momentCount, place, paired, clinicEnabled,
  demoEnabled = false, onBack, onAlarm, onGoals, onMoments, onPlace,
  onPartner, onPeople, onHelp, onDemo,
}: SettingsViewProps) {
  const alarmValue = alarmTime ? `${alarmTime} · ${alarmEnabled ? 'On' : 'Off'}` : 'Not set';
  return (
    <Screen
      scroll
      header={<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><SettingsTextButton label="‹ Back" onPress={onBack} /><DemoLabel /></View>}
      contentStyle={styles.content}
    >
      <AppText variant="title" accessibilityRole="header" style={styles.title}>Settings</AppText>
      <View style={styles.group}>
        <SettingsRow label="Alarm" value={alarmValue} onPress={onAlarm} />
        <SettingsRow label="Goals" value={String(goalCount)} onPress={onGoals} />
        <SettingsRow label="Moments" value={String(momentCount)} onPress={onMoments} />
        <SettingsRow label="Place sound" value={place} onPress={onPlace} last />
      </View>
      <View style={styles.group}>
        <SettingsRow label="Partner" value={paired ? 'Paired' : 'Not paired'} onPress={onPartner} />
        <SettingsRow label="Your people" value={`Clinic ${clinicEnabled ? 'on' : 'off'}`} onPress={onPeople} last />
      </View>
      <View style={styles.links}>
        <SettingsTextButton label="Help" onPress={onHelp} />
        {demoEnabled && onDemo && <SettingsTextButton label={demoText('Demo', 'More')} onPress={onDemo} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingTop: 0 },
  title: { marginBottom: 8 },
  group: { borderRadius: geometry.cardRadius, overflow: 'hidden', backgroundColor: colors.surface },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
    minHeight: 70, paddingHorizontal: 20, paddingVertical: 18, borderWidth: 1.5,
  },
  rowLabel: { flexShrink: 1 },
  rowTrailing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexShrink: 1, maxWidth: '54%' },
  rowValue: { flexShrink: 1 },
  chevron: { width: 12, textAlign: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 22, backgroundColor: colors.lineQuiet },
  textButton: {
    alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8,
    paddingVertical: 8, marginLeft: -8, borderWidth: 1.5, borderRadius: 12,
  },
  links: { flexDirection: 'row', alignItems: 'center', gap: 24 },
});
