import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText, Card, PillButton, Screen } from '../ui';
import { GoalEditor } from '../GoalEditor';
import { useStore } from '../store';
import { deleteGoal, reorderGoals } from '../../../src/goals/settings';
import { LadderRung, ladderSizes } from '../StepLadder';
import { advanceTour } from '../demo/tour';

export default function Goals() {
  const { state, update, read } = useStore();
  const touring = useLocalSearchParams<{ tour?: string }>().tour === '1';
  const [approvedBefore] = useState(() => new Set(state.goals.filter(goal => goal.approved).map(goal => goal.id)));
  const roomForGoal = state.goals.length < 3 || state.goals.some(goal => !goal.approved);
  const [editing, setEditing] = useState<string | null>(touring && roomForGoal ? 'new' : null);
  // Guided demo: the goal just approved becomes the one goal of both demo mornings.
  const continueTour = useCallback(() => {
    const goals = read().goals.filter(goal => goal.approved);
    const created = goals.find(goal => !approvedBefore.has(goal.id)) ?? goals.at(-1);
    if (created) update(old => ({ ...old, demoTourGoalIds: [...(old.demoTourGoalIds ?? []), created.id] }));
    // Back to Home for the night: the alarm is rung with its own button.
    advanceTour('easy', created?.id ?? null); router.replace('/how');
  }, [read, update, approvedBefore]);
  useEffect(() => { if (touring && !roomForGoal && editing === null) continueTour(); }, [touring, roomForGoal, editing, continueTour]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  function move(id: string, direction: -1 | 1) {
    update(current => {
      const ids = current.goals.map(goal => goal.id); const from = ids.indexOf(id); const to = from + direction;
      if (from < 0 || to < 0 || to >= ids.length) return current;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      return reorderGoals(current, ids);
    });
    setNotice('Goal order saved.');
  }
  const selected = state.goals.find(goal => goal.id === deleting);
  function removeSelected() {
    if (!selected) return;
    update(current => deleteGoal(current, selected.id));
    setDeleting(null); setNotice('Goal deleted.');
  }
  if (editing !== null) return <Screen scroll header={<PillButton label="Back to goals" variant="quiet" onPress={() => setEditing(null)} />}>
    <GoalEditor key={editing} goalId={editing === 'new' ? undefined : editing} onApproved={() => { if (touring) continueTour(); else setNotice('Goal saved.'); }} />
  </Screen>;
  return <Screen scroll header={<PillButton label="Back" variant="quiet" onPress={() => router.back()} />}>
    <AppText variant="title">Your goals</AppText>
    <AppText tone="secondary">One goal each morning, in this order. You get one step from it, in the size that fits that morning.</AppText>
    {notice ? <AppText tone="secondary" accessibilityLiveRegion="polite">{notice}</AppText> : null}
    {state.goals.map((goal, index) => <Card key={goal.id}>
      <AppText variant="label">{goal.goalText.trim() || 'A new goal'}</AppText>
      {!goal.approved && <AppText tone="secondary">Finish your steps when you’re ready.</AppText>}
      {goal.approved && <View>{ladderSizes.map((size, index) => <LadderRung key={size} size={size} last={index === ladderSizes.length - 1}>
        <AppText>{goal.steps[size]}</AppText>
      </LadderRung>)}</View>}
      <PillButton label="Edit goal" variant="secondary" onPress={() => { setEditing(goal.id); setDeleting(null); setNotice(''); }} />
      {state.goals.length > 1 && <View style={{ gap: 8 }}>
        <PillButton label="Move earlier" variant="quiet" disabled={index === 0} onPress={() => move(goal.id, -1)} />
        <PillButton label="Move later" variant="quiet" disabled={index === state.goals.length - 1} onPress={() => move(goal.id, 1)} />
      </View>}
      <PillButton label="Delete goal" variant="quiet" onPress={() => { setDeleting(goal.id); setNotice(''); }} />
      {deleting === goal.id && <View style={{ gap: 12 }}>
        <AppText>Delete this goal?</AppText>
        <PillButton label="Delete" onPress={removeSelected} />
        <PillButton label="Keep goal" variant="quiet" onPress={() => setDeleting(null)} />
      </View>}
    </Card>)}
    {state.goals.length < 3 && <PillButton label="Add a goal" onPress={() => { setEditing('new'); setDeleting(null); setNotice(''); }} />}
  </Screen>;
}
