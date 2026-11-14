import test from 'node:test';
import assert from 'node:assert/strict';
import { ringHarderPresentationMorning } from '../../mobile/src/demo/presentationScenario.ts';
import { currentDemoMorning, emptyDemoSession, finishDemoVoice, holdDemo } from '../../shared/demo/session.ts';
import type { DemoResources } from '../../shared/demo/session.ts';

const now = Date.parse('2026-11-15T05:00:00Z');
const resources: DemoResources = { goals: [{ id: 'example', goalText: 'Read', approved: true,
  localOnly: false, latestVerdict: 'ok', revision: 1,
  steps: { tiny: 'Read one sentence.', small: 'Read one page.', full: 'Read for twenty minutes.' } }], messages: [] };

test('the explicit harder-morning cut scores Hard/Tiny without a level override or invented voice', () => {
  for (const delay of [2_000, 10_000, 25_000]) {
    const before = JSON.stringify(resources);
    let scene = ringHarderPresentationMorning({ ...emptyDemoSession(), initialCarry: 'full' }, now, '2026-11-15', 120);
    scene = finishDemoVoice(holdDemo(scene, resources, now + delay), resources);
    const morning = currentDemoMorning(scene)!;
    assert.equal(morning.selectedLevel, 'sensed');
    assert.equal(morning.snoozeCount, 2);
    assert.equal(morning.level, 'hard');
    assert.equal(morning.stepSize, 'tiny');
    assert.equal(morning.voiceState, null);
    assert.equal('upSyncPending' in morning, false);
    assert.equal(JSON.stringify(resources), before);
  }
});

test('presentation still respects the first-ring late boundary rather than forcing hard forever', () => {
  const scene = ringHarderPresentationMorning(emptyDemoSession(), now, '2026-11-15', 120);
  assert.equal(currentDemoMorning(holdDemo(scene, resources, now + 35_000))?.level, 'stopped');
});
