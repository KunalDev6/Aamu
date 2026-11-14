import React from 'react';
import { AppText, PillButton } from '../ui';
import { demoEnabled } from './config';

/** A missing alarm permission is the one thing to do, so it gets the primary button. */
export function DemoAlarmNotice({ time, onSetup }: { time: string; onSetup(): void }) {
  if (!demoEnabled) return null;
  return <>
    <AppText tone="secondary">{`The ${time} alarm can’t ring on this phone yet.`}</AppText>
    <PillButton label="Allow alarms" onPress={onSetup} />
  </>;
}
