import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { useStore } from '../store';
import { currentTour } from '../demo/tour';

/** A short bridge between approving a goal and seeing it adapt. */
export default function How() {
  const { state } = useStore();
  const tour = currentTour();
  const goal = state.goals.find(item => item.id === tour?.goalId) ?? state.goals.filter(item => item.approved).at(-1);
  return <Screen scroll header={<AppText variant="label">aamu</AppText>} footer={<View style={{ gap: 12 }}>
    <PillButton label="Select a partner" onPress={() => router.push('/setup?step=4&tour=1')} />
  </View>}>
    <AppText variant="title">One step each morning.</AppText>
    <AppText tone="secondary">Your snoozes and time to get up help Aamu choose a size. You don’t need to rate your mood.</AppText>
    {goal && <Card><AppText variant="caption" tone="secondary">Your goal</AppText><AppText variant="step">{goal.goalText}</AppText></Card>}
    <View style={{ gap: 18 }}>
      <View style={{ gap: 4 }}><AppText variant="label">A harder start. A smaller step.</AppText>
        <AppText tone="secondary">Your first morning starts with Small, or Tiny if it’s a hard morning. You can always make today’s step smaller.</AppText></View>
      <View style={{ gap: 4 }}><AppText variant="label">Small wins build from here.</AppText>
        <AppText tone="secondary">Done lets the next step grow by one size, if that morning allows it.</AppText></View>
    </View>
  </Screen>;
}
