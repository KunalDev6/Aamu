import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { colors, typography } from '../../../src/theme';
import { StoreProvider, useStore } from '../store';
import { Screen, AppText, PillButton } from '../ui';
import { PartnerProvider } from '../partner';
import { MorningCoordinator } from '../MorningCoordinator';
import { DawnAudio } from '../DawnAudio';
import { GoalSyncCoordinator } from '../GoalSyncCoordinator';
import { EveningReminderCoordinator } from '../EveningReminderCoordinator';
import { ClinicSyncCoordinator } from '../ClinicSyncCoordinator';

function Routes() {
  const store = useStore();
  const pathname = usePathname(); const isolated = pathname === '/preview' || pathname === '/demo' || pathname.startsWith('/demo/');
  if (store.loadError) return <Screen><AppText variant="title">Your saved mornings couldn’t be opened.</AppText><PillButton label="Try again" onPress={store.retryLoad} /></Screen>;
  if (!store.ready) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  return <PartnerProvider enabled={!isolated}>{store.saveError && <View style={{ padding: 24, backgroundColor: colors.surfaceProtected }}><AppText>Your changes couldn’t be saved on this phone.</AppText><PillButton label="Try saving again" variant="secondary" onPress={store.retrySave} /></View>}
    {!isolated && !store.state.demoSeed?.nativeAlarmSetupPending && <MorningCoordinator />}
    {!isolated && <GoalSyncCoordinator />}
    {!isolated && <ClinicSyncCoordinator />}
    {!isolated && <EveningReminderCoordinator />}
    <DawnAudio enabled={!isolated} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas }, animation: 'fade', gestureEnabled: false }} /></PartnerProvider>;
}
export default function Layout() {
  const [loaded, error] = useFonts([{
    fontFamily: typography.family,
    // Declare the bundled variable font's complete axis so web selects real
    // light/regular/medium instances. Native platforms read the font metadata.
    fontDefinitions: [{ path: require('../../../review/assets/plus-jakarta-sans.ttf'), weight: '200 800' }],
  }]);
  React.useEffect(() => { if (__DEV__ && error) console.warn('Bundled font failed:', error.message); }, [error]);
  if (!loaded && !error) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  return <SafeAreaProvider><StatusBar style="light" /><StoreProvider><Routes /></StoreProvider></SafeAreaProvider>;
}
