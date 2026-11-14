import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Recorder } from '../Recorder';
import { AppText, Card, PillButton, Screen } from '../ui';
import { TextAction } from '../TextAction';
import { LocalClipPlayer } from '../LocalClipPlayer';
import { useStore } from '../store';

export default function Answer() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>(); const { state, update } = useStore();
  const [answering, setAnswering] = useState(false);
  const note = state.replyNotes?.find(item => item.id === noteId && !item.answered);
  if (!note) return <Screen><AppText>No note is waiting.</AppText><PillButton label="Home" onPress={() => router.replace('/home')} /></Screen>;
  if (!answering) return <Screen header={<TextAction label="‹ Back" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />}>
    <AppText variant="title">A note from your past self</AppText>
    <Card><LocalClipPlayer uri={note.uri} /><PillButton label="Answer it" onPress={() => setAnswering(true)} /></Card>
  </Screen>;
  return <Screen scroll><Recorder title="Answer your past self" maxSeconds={20} onCancel={() => setAnswering(false)} onSave={clip => {
    update(old => ({ ...old, replyNotes: old.replyNotes?.map(item => item.id === note.id ? { ...item, answered: true } : item),
      messages: [...old.messages, { ...clip, level: note.level, blocked: false, createdAt: Date.now(), timesPlayed: 0, timesFollowedByDoneStep: 0, lastPlayedAt: null }] }));
    router.replace('/home');
  }} /></Screen>;
}
