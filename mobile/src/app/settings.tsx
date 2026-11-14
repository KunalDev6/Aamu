import React from 'react';
import { router } from 'expo-router';
import { SettingsView } from '../SettingsView';
import { useStore } from '../store';
import { usePartner } from '../partner';
import { demoEnabled } from '../demo/config';

export default function Settings() {
  const { state } = useStore();
  const partner = usePartner();
  const alarmDate = new Date();
  if (state.alarm) alarmDate.setHours(state.alarm.hour, state.alarm.minute, 0, 0);
  const alarmTime = state.alarm ? alarmDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
  return (
    <SettingsView
      alarmTime={alarmTime}
      alarmEnabled={Boolean(state.alarm?.enabled)}
      goalCount={state.goals.length}
      momentCount={state.messages.length}
      place={state.place === 'personal' ? 'Mine' : state.place === 'forest' ? 'Forest' : 'Sea'}
      paired={partner.paired}
      clinicEnabled={Boolean(demoEnabled && state.clinicSharing?.enabled)}
      demoEnabled={demoEnabled}
      onBack={() => router.back()}
      onAlarm={() => router.push('/setup?step=3')}
      onGoals={() => router.push('/goals')}
      onMoments={() => router.push('/setup?step=1')}
      onPlace={() => router.push('/setup?step=2')}
      onPartner={() => router.push('/setup?step=4')}
      onPeople={() => router.push('/setup?step=5')}
      onHelp={() => router.push('/help')}
      onDemo={() => router.push('/demo')}
    />
  );
}
