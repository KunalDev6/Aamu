import React, { useEffect, useRef } from 'react';
import { AppText, Card, PillButton } from '../ui';
import { Landscape } from '../Landscape';
import { TextAction } from '../TextAction';
import { changeDemo, useDemoSession } from './store';

/** This preview touches only the existing scratch session, never real pairing. */
export function AnonymousPartnerPreview({ onEnd, primaryAvailable = true }: { onEnd(): void; primaryAvailable?: boolean }) {
  const demo = useDemoSession(true);
  const previous = useRef<{ paired: boolean; partnerUp: boolean } | null>(null);
  useEffect(() => {
    if (!demo.ready || demo.error) return;
    changeDemo(session => {
      previous.current = { paired: session.paired, partnerUp: session.partnerUp };
      return { ...session, paired: true, partnerUp: false };
    });
    return () => {
      const restore = previous.current; previous.current = null;
      if (restore) changeDemo(session => ({ ...session, ...restore }));
    };
  }, [demo.ready, demo.error]);
  return <Card>
    <AppText variant="label">Anonymous preview · Demo</AppText>
    <AppText tone="secondary">This simulated connection does not create or change your real pair.</AppText>
    {!demo.ready ? <AppText tone="secondary">Opening preview…</AppText>
      : demo.error ? <AppText tone="secondary">This preview couldn’t be opened. Your real connection is unchanged.</AppText>
        : <>
          <Landscape progress={0.7} up paired partnerUp={demo.session.partnerUp} sunLabels height={230}
            accessibilityLabel={demo.session.partnerUp ? 'Demo: both sun halves are lit.' : 'Demo: your sun half is lit; the partner half is unlit.'} />
          <AppText>{demo.session.partnerUp ? 'You’re both up.' : 'Your partner isn’t up yet.'}</AppText>
          <AppText variant="caption" tone="secondary">A confirmed hold sends the up signal and lights the other person’s sun half.</AppText>
          {!demo.session.partnerUp && <PillButton label="Partner gets up · Demo" variant={primaryAvailable ? 'primary' : 'secondary'}
            onPress={() => changeDemo(session => ({ ...session, paired: true, partnerUp: true }))} />}
        </>}
    <PillButton label="End preview" variant={primaryAvailable && demo.session.partnerUp ? 'primary' : 'secondary'} onPress={onEnd} />
    <TextAction label="Back to partner choices" onPress={onEnd} />
  </Card>;
}
