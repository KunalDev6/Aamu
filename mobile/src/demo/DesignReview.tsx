import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { SceneScreen } from '../SceneScreen';
import { demoEnabled } from './config';
import { HomeReview } from './HomeReview';
import { SettingsView } from '../SettingsView';

// Isolated design review only: never writes mornings, sends up, or seeds audio.
export function DesignReview() {
  const params = useLocalSearchParams<{ scene?: string; time?: string; scenario?: string; mode?: string; reduceMotion?: string }>();
  const [scene, setScene] = useState<'alarm' | 'message'>('alarm');
  if (!demoEnabled) return <Screen><PillButton label="Back" onPress={() => router.back()} /></Screen>;
  if (params.scene === 'home') return <HomeReview key={`${params.time}:${params.scenario}:${params.mode}:${params.reduceMotion}`} time={params.time ?? '07:30'} scenario={params.scenario ?? 'off'} natural={params.mode === 'natural'} reduceMotion={params.reduceMotion === 'true'} />;
  if (params.scene === 'settings') {
    const back = () => router.replace(`/preview?scene=home&time=${params.time ?? '07:30'}&scenario=night`);
    const noop = () => {};
    return <SettingsView alarmTime="07:00" alarmEnabled goalCount={1} momentCount={0} place="Sea" paired={false} clinicEnabled
      onBack={back} onAlarm={noop} onGoals={noop} onMoments={noop} onPlace={noop} onPartner={noop}
      onPeople={noop} onHelp={noop} />;
  }
  return <SceneScreen progress={scene === 'alarm' ? 0.2 : 1} up={scene !== 'alarm'} scroll header={<View style={{ gap: 12 }}>
    <AppText variant="caption" tone="secondary">Design preview · sample step</AppText>
    <View style={{ flexDirection: 'row', gap: 8 }}>{(['alarm', 'message', 'home'] as const).map(value =>
      <PillButton key={value} label={value[0].toUpperCase() + value.slice(1)} variant="quiet" outlined style={{ flex: 1 }} onPress={() => value === 'home' ? router.replace('/preview?scene=home&time=07:30&scenario=up') : setScene(value)} />)}</View>
    <PillButton label="Home at 21:00" variant="quiet" outlined onPress={() => router.replace('/preview?scene=home&time=21:00&scenario=night')} />
  </View>} footer={<View style={{ gap: 12 }}>
    {scene === 'alarm' ? <><PillButton label="Hold: I’m up" /><PillButton label="Snooze" variant="secondary" /></> : <PillButton label="Home" onPress={() => router.replace('/preview?scene=home&time=07:30&scenario=up')} />}
    <PillButton label="Back to Demo" variant="quiet" outlined onPress={() => router.replace('/demo')} />
  </View>}>
    {scene === 'alarm' ? <View><AppText variant="clock" align="center">07:00</AppText><AppText align="center" tone="secondary">A new morning</AppText></View>
      : <AppText variant="title">No need to reply.</AppText>}
    {scene !== 'alarm' && <Card>
      <AppText variant="caption" tone="secondary">Tiny · Up to 2 min</AppText>
      <AppText variant="step">Put a book beside your chair.</AppText>
      <PillButton label="Too much today" variant="quiet" outlined />
    </Card>}
  </SceneScreen>;
}
