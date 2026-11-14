import { colors, dawnFrames } from '../theme.ts';

type SceneKey = Exclude<keyof typeof dawnFrames[number], 'at'>;
const sceneKeys: SceneKey[] = ['sky', 'horizon', 'hillFar', 'hillMiddle', 'hillNear', 'lake', 'lakeLow', 'pine'];
export const clampProgress = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export function mixSceneColor(first: string, second: string, amount: number): string {
  const channel = (value: string, index: number) => parseInt(value.slice(1 + index * 2, 3 + index * 2), 16);
  return `#${[0, 1, 2].map(index => Math.round(channel(first, index) +
    (channel(second, index) - channel(first, index)) * clampProgress(amount)).toString(16).padStart(2, '0')).join('')}`;
}
export function sceneColors(progress: number): Record<SceneKey, string> {
  const at = clampProgress(progress); const index = at <= 0.5 ? 0 : 1;
  const from = dawnFrames[index]; const to = dawnFrames[index + 1];
  const amount = (at - from.at) / (to.at - from.at);
  return Object.fromEntries(sceneKeys.map(key => [key, mixSceneColor(from[key], to[key], amount)])) as Record<SceneKey, string>;
}
/** Continuous full-height sky. The top follows time; it is never forced to canvas. */
export function skyGradientStops(progress: number) {
  const scene = sceneColors(progress);
  return [[0, 0], [0.16, 0.025], [0.32, 0.07], [0.44, 0.2],
    [0.56, 0.48], [0.72, 0.78], [0.88, 0.94], [1, 1]]
    .map(([offset, blend]) => ({ offset, color: mixSceneColor(scene.sky, scene.horizon, blend) }));
}
export const sceneScrimMinimumOpacity = 0.72;
/** One continuous field, without a protected plateau followed by a clear strip. */
export function sceneScrimStops(clearHorizon: boolean, height: number) {
  if (!clearHorizon) return [
    { offset: 0, opacity: 0.72 }, { offset: 0.25, opacity: 0.72 },
    { offset: 0.5, opacity: 0.72 }, { offset: 0.75, opacity: 0.78 }, { offset: 1, opacity: 0.88 },
  ];
  // Top text occupies ~280pt. On short screens preserve that protection longer.
  const topEnd = Math.min(0.53, Math.max(0.32, 280 / Math.max(1, height)));
  const stops = [
    { offset: 0, opacity: 0.48 }, { offset: topEnd * 0.5, opacity: 0.49 },
    { offset: topEnd, opacity: 0.52 },
    { offset: topEnd + (0.64 - topEnd) * 0.5, opacity: 0.35 },
    { offset: 0.64, opacity: 0.23 }, { offset: 0.76, opacity: 0.38 },
    { offset: 0.88, opacity: 0.62 }, { offset: 1, opacity: 0.78 },
  ];
  if (height >= 740) return stops;
  // On compact screens plain lower actions can overlap the sun/terrain. Build
  // gradual protection over 30% of the viewport, rather than a horizontal slab.
  return Array.from({ length: 21 }, (_, index) => {
    const offset = index / 20;
    const next = stops.findIndex(stop => stop.offset >= offset);
    const a = stops[Math.max(0, next - 1)]; const b = stops[Math.max(0, next)];
    const fraction = b.offset === a.offset ? 0 : (offset - a.offset) / (b.offset - a.offset);
    const original = a.opacity + (b.opacity - a.opacity) * fraction;
    const ramp = clampProgress((offset - 0.3) / 0.3);
    const protection = 0.72 * ramp * ramp * (3 - 2 * ramp);
    return { offset, opacity: Math.max(original, protection) };
  });
}
export const ambientMotionConfig = { starsMs: 8_000, waterMs: 12_000, cloudsMs: 28_000, glowMs: 10_000 };
export function ambientMotionAllowed(input: { reducedMotion: boolean; simulatedReducedMotion?: boolean;
  active: boolean; focused: boolean; visible: boolean }) {
  return !input.reducedMotion && !input.simulatedReducedMotion && input.active && input.focused && input.visible;
}
export const ambientColors = { star: colors.textSecondary, cloud: colors.textPrimary, glow: colors.accent };
