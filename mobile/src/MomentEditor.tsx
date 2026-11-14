import React, { useState } from 'react';
import { View } from 'react-native';
import { uuid } from 'expo';
import { AppText, PillButton, SectionHeading } from './ui';
import { TextAction } from './TextAction';
import { Recorder, type PersonalClip } from './Recorder';
import { MomentPhoto } from './MomentPhoto';
import { chooseMomentPhoto, deleteMomentFiles } from './moments';

export type NewMoment = { id: string; uri: string; durationMs: number; photoUri: string };

/** One photo, then an optional recording of the sound around it. Nothing is saved until Save moment. */
export function MomentEditor({ title, onSave, onCancel }: { title: string; onSave(moment: NewMoment): void; onCancel(): void }) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sound, setSound] = useState<PersonalClip | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  async function choose() {
    setBusy(true); setNotice('');
    try {
      const chosen = await chooseMomentPhoto();
      if (chosen) { if (photoUri) deleteMomentFiles({ uri: '', photoUri }); setPhotoUri(chosen); }
    } catch { setNotice('We couldn’t use that photo. Please try another.'); }
    finally { setBusy(false); }
  }
  function cancel() {
    deleteMomentFiles({ uri: sound?.uri ?? '', photoUri: photoUri ?? undefined });
    onCancel();
  }
  if (recording) return <Recorder title="The sound of this place" maxSeconds={20} onCancel={() => setRecording(false)}
    onSave={clip => { if (sound) deleteMomentFiles({ uri: sound.uri }); setSound(clip); setRecording(false); }} />;
  return <View style={{ gap: 18 }}>
    <SectionHeading title={title} description="Pick a photo from a day you liked. It doesn’t need to be a good photo." />
    {photoUri ? <>
      <MomentPhoto uri={photoUri} />
      {sound ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tone="secondary">{`Sound added · ${Math.max(1, Math.round(sound.durationMs / 1000))} seconds`}</AppText>
        <TextAction label="Remove sound" onPress={() => { deleteMomentFiles({ uri: sound.uri }); setSound(null); }} />
      </View> : <PillButton label="Add the sound of this place" variant="secondary" outlined onPress={() => setRecording(true)} />}
      <PillButton label="Save moment" onPress={() => onSave({ id: sound?.id ?? uuid.v4(), uri: sound?.uri ?? '', durationMs: sound?.durationMs ?? 0, photoUri })} />
      <TextAction label="Choose a different photo" disabled={busy} onPress={() => void choose()} />
    </> : <PillButton label="Choose a photo" loading={busy} onPress={() => void choose()} />}
    {notice ? <AppText tone="secondary" accessibilityLiveRegion="polite">{notice}</AppText> : null}
    <AppText variant="caption" tone="secondary">The photo and sound stay on this phone.</AppText>
    <TextAction label="Cancel" onPress={cancel} />
  </View>;
}
