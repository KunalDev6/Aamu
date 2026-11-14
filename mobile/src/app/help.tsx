import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { useStore } from '../store';
import { colors } from '../../../src/theme';
import { demoEnabled, demoText } from '../demo/config';
import { safeContactAction } from '../demo/seed';
import { askClinicToCall } from '../ClinicSyncCoordinator';

export default function Help() {
  const store = useStore(); const { safePerson } = store;
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [breathing, setBreathing] = useState(false); const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState(''); const [asking, setAsking] = useState(false);
  useEffect(() => { if (!breathing) return; const timer = setInterval(() => setElapsed(value => value + 1), 1000); return () => clearInterval(timer); }, [breathing]);
  const inhale = elapsed % 10 < 4;
  function contact(action: 'call' | 'text') {
    if (!safePerson) return;
    const result = safeContactAction(safePerson, action, demoEnabled);
    if (!result) return;
    if (result.simulation) setNotice(demoText(result.notice, 'Calls and texts are switched off in this build.'));
    else void Linking.openURL(result.url).catch(() => setNotice('This action could not be opened.'));
  }
  const contactLabel = (action: 'call' | 'text') => {
    const result = safePerson && safeContactAction(safePerson, action, demoEnabled);
    return result?.simulation ? demoText(result.notice, action === 'call' ? 'Call' : 'Text') : action === 'call' ? 'Call' : 'Text';
  };
  return <Screen scroll header={<PillButton label="Back" variant="quiet" onPress={() => router.back()} />}>
    <AppText variant="title">You’re not alone this morning</AppText>
    <Card><AppText variant="label">Your people</AppText>
      {safePerson ? <><AppText>{demoText(safePerson.name, safePerson.name.replace(/\s*\(demo\)\s*$/i, '').trim())}</AppText>
        <PillButton label={contactLabel('call')} variant={demoEnabled ? 'secondary' : 'primary'} onPress={() => contact('call')} />
        <PillButton label={contactLabel('text')} variant="secondary" onPress={() => contact('text')} /></>
        : <PillButton label="Add a safe person" onPress={() => router.push('/setup?step=5')} />}
    </Card>
    {demoEnabled && store.state.clinicSharing?.enabled && <Card>
      <AppText variant="label">{demoText('Demo clinic', 'Your clinic')}</AppText>
      <AppText tone="secondary">{demoText('Ask for a quiet check-in call. This appears in the demo dashboard; no real clinician will call.', 'Ask for a quiet check-in call.')}</AppText>
      {store.state.clinicSharing.callbackRequestedAt
        ? <AppText accessibilityLiveRegion="polite">{demoText('Asked for a call · Demo', 'Asked for a call')}</AppText>
        : <PillButton label="Ask my clinic to call me" loading={asking} onPress={() => {
          setAsking(true); setNotice('');
          void askClinicToCall(store).then(() => setNotice(demoText('Asked for a call · Demo', 'Asked for a call')))
            .catch(() => setNotice(demoText('The demo clinic could not be reached. Please try again.', 'Your clinic could not be reached. Please try again.'))).finally(() => setAsking(false));
        }} />}
    </Card>}
    {notice ? <AppText accessibilityLiveRegion="polite">{notice}</AppText> : null}
    <Card><AppText variant="label">Breathe for a minute</AppText>
      <View style={{ alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceRaised,
        borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <AppText>{breathing ? inhale ? 4 - elapsed % 10 : 10 - elapsed % 10 : ''}</AppText>
      </View>
      <AppText align="center">{breathing ? inhale ? 'Breathe in' : 'Breathe out' : 'Ready when you are'}</AppText>
      <AppText align="center" tone="secondary">In for 4, out for 6</AppText>
      <PillButton label={breathing ? 'Pause' : 'Start'} variant="secondary" onPress={() => { setElapsed(0); setBreathing(value => !value); }} />
    </Card>
    {from === 'goal' && <PillButton label="Back to my goal" variant="secondary" onPress={() => router.back()} />}
  </Screen>;
}
