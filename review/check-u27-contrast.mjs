import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { colors, textContrastPairs, controlContrastPairs, skyProgressForClock } from '../src/theme.ts';
import { sceneColors, sceneScrimStops, skyGradientStops } from '../src/scene/visuals.ts';
const rgb = value => value.slice(1).match(/../g).map(channel => parseInt(channel, 16));
const mix = (a, b, t) => a.map((value, i) => value * (1 - t) + b[i] * t);
const luminance = color => color.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
function sample(stops, offset, key) {
  const index = stops.findIndex(stop => stop.offset >= offset);
  if (index <= 0) return key === 'color' ? rgb(stops[0][key]) : stops[0][key];
  const a = stops[index - 1]; const b = stops[index]; const fraction = (offset - a.offset) / (b.offset - a.offset);
  return key === 'color' ? mix(rgb(a.color), rgb(b.color), fraction) : a[key] + (b[key] - a[key]) * fraction;
}
const top = []; const lower = [];
const allSceneTokens = Object.keys(colors).filter(key => /^(night|twilight|dawn)/.test(key)).concat(['accentLight']);
for (const height of [568, 667, 740, 844, 932]) {
  let worstTop = { ratio: Infinity }; let worstLower = { ratio: Infinity };
  for (let step = 0; step <= 100; step += 1) {
    const progress = step / 100; const sky = skyGradientStops(progress); const scrim = sceneScrimStops(true, height);
    for (let y = 0; y <= 280; y += 1) {
      let background = sample(sky, y / height, 'color');
      // Conservatively overlay the brightest star and cloud together. Stars
      // fade to zero by progress .35. Sun and its glow start below 294pt.
      background = mix(background, rgb(colors.textSecondary), 0.85 * 0.4 * Math.max(0, 1 - progress / 0.35));
      background = mix(background, rgb(colors.textPrimary), 0.035);
      background = mix(background, rgb(colors.canvas), sample(scrim, y / height, 'opacity'));
      for (const foreground of ['textPrimary', 'textSecondary']) {
        const ratio = contrast(rgb(colors[foreground]), background);
        if (ratio < worstTop.ratio) worstTop = { ratio, height, progress, y, foreground };
      }
    }
    for (let y = height - 180; y <= height; y += 1) {
      // At heights >=740pt the lower 180pt is below all water/sun artwork and
      // covered by near hill/pines/canvas. Compact screens use >=.72 protection.
      const backgrounds = height < 740 ? allSceneTokens.map(token => colors[token]) : [sceneColors(progress).hillNear, sceneColors(progress).pine, colors.canvas];
      for (const background of backgrounds) for (const foreground of ['textPrimary', 'textSecondary']) {
        const ratio = contrast(rgb(colors[foreground]), mix(rgb(background), rgb(colors.canvas), sample(scrim, y / height, 'opacity')));
        if (ratio < worstLower.ratio) worstLower = { ratio, height, progress, y, foreground, background };
      }
    }
  }
  top.push(worstTop); lower.push(worstLower);
}
const morning = allSceneTokens.flatMap(background => ['textPrimary', 'textSecondary'].map(foreground => ({ foreground, background,
  ratio: contrast(rgb(colors[foreground]), mix(rgb(colors[background]), rgb(colors.canvas), 0.72)) }))).sort((a, b) => a.ratio - b.ratio)[0];
const opaque = textContrastPairs.map(([label, foreground, background]) => ({ label, foreground, background, ratio: contrast(rgb(colors[foreground]), rgb(colors[background])) }));
const boundaries = controlContrastPairs.map(([label, foreground, background]) => ({ label, foreground, background, ratio: contrast(rgb(colors[foreground]), rgb(colors[background])) }));
const topTimes = [6, 7.5, 10, 21].map(hour => { const progress = skyProgressForClock(Math.floor(hour), hour % 1 * 60);
  return { hour, progress, luminance: luminance(mix(rgb(sceneColors(progress).sky), rgb(colors.canvas), 0.48)) }; });
const report = { date: '2026-11-14', method: 'WCAG sRGB luminance; actual scene/sky gradients and maximum motion opacity composited under the canvas field; 101 dawn progress values and 1pt vertical samples. No palette/font change.',
  topTextArea: 'Top 280pt; decorative sun/glow kept below 294pt. Cloud and maximum star are conservatively combined.', top,
  lowerPlainTextArea: 'Lower180pt. On >=740pt-high mobile portraits, actual near hill/pine/canvas tokens; smaller screens protect against every scene/sun token.', lower,
  defaultMorning: morning, opaqueText: opaque, controlBoundaries: boundaries, topTimes,
  limitations: ['Mathematical token/layout model, not screenshot pixel measurement.', 'Portrait widths320–430pt and heights568–932pt; dynamic type and unusual/landscape viewport visual acceptance remains separate.', 'Native/web motion lifecycle checks and physical battery measurements are separate; this report does not claim battery testing.'],
  allMeasuredPairsPass: [...top, ...lower, morning, ...opaque].every(item => item.ratio >= 4.5) && boundaries.every(item => item.ratio >= 3),
};
assert.equal(report.allMeasuredPairsPass, true);
assert.ok(topTimes[0].luminance > topTimes[3].luminance * 1.5);
assert.ok(topTimes[1].luminance > topTimes[3].luminance * 3);
await writeFile(new URL('./home-u27-contrast.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ pass: true, minimumTop: Math.min(...top.map(item => item.ratio)), minimumLower: Math.min(...lower.map(item => item.ratio)), defaultMorning: morning.ratio, topTimes }));
