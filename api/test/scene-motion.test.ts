import assert from 'node:assert/strict';
import test from 'node:test';
import { ambientMotionAllowed, ambientMotionConfig, sceneScrimStops, skyGradientStops } from '../../src/scene/visuals.ts';

const visible = { reducedMotion: false, active: true, focused: true, visible: true };
test('ambient motion requires an active, visible, focused screen', () => {
  assert.equal(ambientMotionAllowed(visible), true);
  for (const key of ['active', 'focused', 'visible'] as const) assert.equal(ambientMotionAllowed({ ...visible, [key]: false }), false);
});
test('OS Reduce Motion cannot be overridden by the review switch', () => {
  assert.equal(ambientMotionAllowed({ ...visible, reducedMotion: true }), false);
  assert.equal(ambientMotionAllowed({ ...visible, reducedMotion: true, simulatedReducedMotion: false }), false);
  assert.equal(ambientMotionAllowed({ ...visible, simulatedReducedMotion: true }), false);
});
test('ambient cycles stay bounded and visible during the requested review recording', () => {
  assert.deepEqual(Object.values(ambientMotionConfig), [8_000, 12_000, 28_000, 10_000]);
  assert.ok(Object.values(ambientMotionConfig).every(duration => duration >= 8_000 && duration <= 28_000));
});
test('full-height sky and scrim stops remain ordered with no discontinuous duplicate offsets', () => {
  for (const progress of [0, 0.25, 0.5, 0.875, 1]) for (const height of [568, 667, 740, 844, 932]) {
    for (const stops of [skyGradientStops(progress), sceneScrimStops(true, height), sceneScrimStops(false, height)]) {
      assert.equal(stops[0].offset, 0); assert.equal(stops.at(-1)?.offset, 1);
      assert.ok(stops.every((stop, index) => index === 0 || stop.offset > stops[index - 1].offset));
    }
  }
});
test('compact lower plain actions retain protection when they overlap decorative sun and terrain', () => {
  for (const height of [568, 667]) {
    assert.ok(sceneScrimStops(true, height).filter(stop => stop.offset >= 0.6).every(stop => stop.opacity >= 0.72));
  }
});
