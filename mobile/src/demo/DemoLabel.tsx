import React from 'react';
import { AppText } from '../ui';
import { demoEnabled, demoLabelsVisible } from './config';

export function DemoLabel() {
  return demoEnabled && demoLabelsVisible ? <AppText variant="caption" tone="secondary">Demo</AppText> : null;
}
