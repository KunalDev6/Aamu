import React, { useState } from 'react';
import { AppText, Card, Field, PillButton, SectionHeading } from './ui';
import { TextAction } from './TextAction';
import { demoEnabled } from './demo/config';
import { AnonymousPartnerPreview } from './demo/AnonymousPartnerPreview';

type Choice = 'friend' | 'family' | 'anonymous';
type Props = { paired: boolean; partnerUp: boolean; createdCode: string; pairCode: string; busy: boolean;
  primaryAvailable: boolean; onChangeCode(code: string): void; onCreateCode(): void; onConnect(): void };

export function PartnerSetup(props: Props) {
  // Relationship is a presentation choice only. It never enters a request,
  // contact record, pairing code or the persisted real partner state.
  const [choice, setChoice] = useState<Choice | null>(null);
  return <>
    <SectionHeading title="A morning, shared" description="Choose who you’d like to share a small sign of getting up with." />
    <AppText tone="secondary">Only your confirmed-up signal is shared with your partner. They don’t receive your goals, moments or recordings.</AppText>
    {choice === null ? <>
      <PillButton label="Close friend" variant="secondary" onPress={() => setChoice('friend')} />
      <PillButton label="Family" variant="secondary" onPress={() => setChoice('family')} />
      <PillButton label={demoEnabled ? 'Anonymous · Demo preview' : 'Anonymous · Unavailable'} variant="secondary"
        disabled={!demoEnabled} onPress={() => setChoice('anonymous')} />
      {!demoEnabled && <AppText variant="caption" tone="secondary">Anonymous matching is not available in this build.</AppText>}
      {props.paired && <AppText tone="secondary">You already have a real partner connection.</AppText>}
    </> : choice === 'anonymous' && demoEnabled
      ? <AnonymousPartnerPreview primaryAvailable={props.primaryAvailable} onEnd={() => setChoice(null)} />
      : <>
        <AppText variant="label">{choice === 'family' ? 'Family' : 'Close friend'}</AppText>
        {props.paired ? <Card>
          <AppText>You’re connected.</AppText>
          <AppText tone="secondary">{props.partnerUp ? 'Your partner is up.' : 'Your partner isn’t up yet.'}</AppText>
          <AppText tone="secondary">No need to reply.</AppText>
        </Card> : <>
          <AppText tone="secondary">Create a code for the other phone, or enter the code they share with you.</AppText>
          {props.createdCode && <Card><AppText tone="secondary">Your pairing code</AppText><AppText variant="step">{props.createdCode}</AppText></Card>}
          <PillButton label="Create a code" variant="secondary" loading={props.busy} onPress={props.onCreateCode} />
          <Field label="Enter a code" value={props.pairCode} onChangeText={props.onChangeCode} autoCapitalize="characters" autoCorrect={false} />
          <PillButton label="Connect" variant={props.primaryAvailable ? 'primary' : 'secondary'} disabled={!props.pairCode.trim()}
            loading={props.busy} onPress={props.onConnect} />
        </>}
        <TextAction label="Back to partner choices" disabled={props.busy} onPress={() => setChoice(null)} />
      </>}
  </>;
}
