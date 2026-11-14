/**
 * Aamu — Nightwater palette.
 * Fresh visual-review tokens selected under the user's U11 authorization.
 * Colors are defined only here; review assets are generated from this module.
 * Plain JavaScript syntax is intentional: this remains valid TypeScript while
 * the dependency-free review generator can import it without a TS toolchain.
 */
export const colors = {
  canvas: '#101523',
  canvasDeep: '#0A101C',
  surface: '#1B2235',
  surfaceRaised: '#252D43',
  surfaceProtected: '#151C2D',
  lineQuiet: '#3D455C',
  lineVisible: '#8E97AE',
  textPrimary: '#F2EDE6',
  textSecondary: '#C1BDCF',
  textOnAccent: '#192030',
  accent: '#E7BD84',
  accentPressed: '#D5AA70',
  accentLight: '#F0D2A6',
  nightSky: '#151E34',
  nightHorizon: '#343A55',
  nightHillFar: '#313C57',
  nightHillMiddle: '#26324D',
  nightHillNear: '#1D2941',
  nightLake: '#35425A',
  nightLakeLow: '#233149',
  nightPine: '#142236',
  twilightSky: '#343C58',
  twilightHorizon: '#8B7080',
  twilightHillFar: '#766780',
  twilightHillMiddle: '#565570',
  twilightHillNear: '#35435F',
  twilightLake: '#827788',
  twilightLakeLow: '#4B5B74',
  twilightPine: '#1C2D43',
  dawnSky: '#766F89',
  dawnHorizon: '#D3AA8C',
  dawnHillFar: '#9A8898',
  dawnHillMiddle: '#73758F',
  dawnHillNear: '#4A5F7C',
  dawnLake: '#B6A5A6',
  dawnLakeLow: '#74859D',
  dawnPine: '#263B51',
};

export const dawnFrames = [
  {
    at: 0,
    sky: colors.nightSky,
    horizon: colors.nightHorizon,
    hillFar: colors.nightHillFar,
    hillMiddle: colors.nightHillMiddle,
    hillNear: colors.nightHillNear,
    lake: colors.nightLake,
    lakeLow: colors.nightLakeLow,
    pine: colors.nightPine,
  },
  {
    at: 0.5,
    sky: colors.twilightSky,
    horizon: colors.twilightHorizon,
    hillFar: colors.twilightHillFar,
    hillMiddle: colors.twilightHillMiddle,
    hillNear: colors.twilightHillNear,
    lake: colors.twilightLake,
    lakeLow: colors.twilightLakeLow,
    pine: colors.twilightPine,
  },
  {
    at: 1,
    sky: colors.dawnSky,
    horizon: colors.dawnHorizon,
    hillFar: colors.dawnHillFar,
    hillMiddle: colors.dawnHillMiddle,
    hillNear: colors.dawnHillNear,
    lake: colors.dawnLake,
    lakeLow: colors.dawnLakeLow,
    pine: colors.dawnPine,
  },
];

export const typography = {
  family: 'Plus Jakarta Sans',
  minimum: 16,
  body: 18,
  step: 28,
  clock: 72,
  clockWeight: 300,
  bodyWeight: 400,
  controlWeight: 500,
};

export const geometry = {
  previewWidth: 390,
  previewHeight: 844,
  screenGutter: 28,
  cardRadius: 28,
  controlRadius: 999,
  primaryHeight: 68,
};

// Static, clock-based scene lighting outside the timed dawn. These are visual
// interpolation points only; neither waking confirmation nor sensing uses them.
export const sceneClockFrames = [
  { hour: 0, progress: 0 }, { hour: 4, progress: 0 },
  { hour: 8, progress: 1 }, { hour: 15, progress: 1 },
  { hour: 18, progress: 0 }, { hour: 24, progress: 0 },
];
export function skyProgressForClock(hour = 0, minute = 0) {
  const clock = Math.max(0, Math.min(24, hour + minute / 60));
  const nextIndex = sceneClockFrames.findIndex(frame => frame.hour >= clock);
  if (nextIndex <= 0) return sceneClockFrames[0].progress;
  const previous = sceneClockFrames[nextIndex - 1]; const next = sceneClockFrames[nextIndex];
  const fraction = (clock - previous.hour) / (next.hour - previous.hour);
  return previous.progress + (next.progress - previous.progress) * fraction;
}

// Opaque protected surfaces make these bounds independent of dawn progress.
export const textContrastPairs = [
  ['Primary on canvas', 'textPrimary', 'canvas'],
  ['Secondary on canvas', 'textSecondary', 'canvas'],
  ['Primary on protected surface', 'textPrimary', 'surfaceProtected'],
  ['Secondary on protected surface', 'textSecondary', 'surfaceProtected'],
  ['Primary on surface', 'textPrimary', 'surface'],
  ['Secondary on surface', 'textSecondary', 'surface'],
  ['Primary on raised surface', 'textPrimary', 'surfaceRaised'],
  ['Secondary on raised surface', 'textSecondary', 'surfaceRaised'],
  ['Pressed secondary action', 'textPrimary', 'lineQuiet'],
  ['Quiet action over hold fill', 'textSecondary', 'lineQuiet'],
  ['Disabled and loading actions', 'textSecondary', 'surfaceRaised'],
  ['Outlined quiet action', 'textSecondary', 'surfaceProtected'],
  ['Pressed outlined quiet action', 'textSecondary', 'surfaceRaised'],
  ['Primary action', 'textOnAccent', 'accent'],
  ['Pressed primary action', 'textOnAccent', 'accentPressed'],
  ['Hold fill', 'textOnAccent', 'accentLight'],
  ['Quiet accent text', 'accent', 'surfaceProtected'],
];

// Visible controls need at least 3:1 against their adjacent protected surface.
export const controlContrastPairs = [
  ['Quiet outline', 'lineVisible', 'surfaceProtected'],
  ['Pressed or disabled quiet outline', 'lineVisible', 'surfaceRaised'],
  ['Secondary pressed outline', 'lineVisible', 'lineQuiet'],
  ['Outline against canvas', 'lineVisible', 'canvas'],
];

export const theme = { colors, dawnFrames, typography, geometry };
