import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { useStore } from '../store';
import { LadderRung, ladderSizes } from '../StepLadder';
import { currentTour } from '../demo/tour';

const points = [
  ['Your alarm notices how getting up went.', 'How many times you snoozed, and how long it took you to get up. You don’t answer any questions.'],
  ['That picks one step from your goal.', 'A step is one small action for today. Tiny on a hard morning, Small on an in-between one, Full on an easier one.'],
  ['Finishing it lets the next one grow.', 'Tap Done and the next step from this goal can be one size bigger. If you don’t get to it, the next one stays small. Nothing is lost.'],
];

/** Shown once the guided demo's goal is approved: what a step is and what happens each morning. */
export default function How() {
  const { state } = useStore();
  const tour = currentTour();
  const goal = state.goals.find(item => item.id === tour?.goalId) ?? state.goals.filter(item => item.approved).at(-1);
  return <Screen scroll footer={<View style={{ gap: 12 }}>
    <PillButton label="Ring alarm" onPress={() => router.replace('/demo?tour=1')} />
    <PillButton label="Back to Home" variant="quiet" onPress={() => router.replace('/home')} />
  </View>}>
    <AppText variant="title">How your mornings work</AppText>
    {points.map(([title, detail], index) => <View key={title} style={{ flexDirection: 'row', gap: 14 }}>
      <AppText variant="label" tone="secondary" style={{ width: 22 }}>{String(index + 1)}</AppText>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label">{title}</AppText>
        <AppText tone="secondary">{detail}</AppText>
      </View>
    </View>)}
    {goal && <Card padding={20} style={{ gap: 6 }}>
      <AppText variant="caption" tone="secondary">Your goal</AppText>
      <AppText variant="label">{goal.goalText}</AppText>
      <View style={{ marginTop: 12 }}>{ladderSizes.map((size, index) => <LadderRung key={size} size={size} last={index === ladderSizes.length - 1}>
        <AppText>{goal.steps[size]}</AppText>
      </LadderRung>)}</View>
    </Card>}
    <AppText variant="caption" tone="secondary">Goals don’t run out. When the Full step starts to feel easy, you can make the goal bigger or add another one in Settings.</AppText>
  </Screen>;
}
