import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(directory, '../src/theme.ts'), 'utf8');
const { theme, textContrastPairs } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

await mkdir(path.join(directory, 'generated'), { recursive: true });
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const declarations = Object.entries(theme.colors)
  .map(([name, value]) => `  --${kebab(name)}: ${value};`)
  .join('\n');
await writeFile(
  path.join(directory, 'generated/theme.css'),
  `/* Generated from src/theme.ts. Do not edit. */\n:root {\n${declarations}\n}\n`,
);
await writeFile(
  path.join(directory, 'generated/theme.js'),
  `// Generated from src/theme.ts. Do not edit.\nexport const theme = ${JSON.stringify(theme, null, 2)};\n`,
);

function luminance(hex) {
  const values = hex.slice(1).match(/../g).map((pair) => parseInt(pair, 16) / 255);
  const [red, green, blue] = values.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

const results = textContrastPairs.map(([label, foreground, background]) => {
  const first = luminance(theme.colors[foreground]);
  const second = luminance(theme.colors[background]);
  const ratio = (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  return { label, foreground, background, ratio: Number(ratio.toFixed(2)), pass: ratio >= 4.5 };
});
const minimum = Math.min(...results.map(({ ratio }) => ratio));
const report = {
  method: 'WCAG relative sRGB luminance contrast ratio',
  threshold: 4.5,
  minimum,
  dawnCoverage: 'All continuous dawn values 0–1: text is on opaque fixed canvas/protected surfaces, never on interpolated landscape colors.',
  pairs: results,
};
await writeFile(path.join(directory, 'generated/contrast.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (results.some(({ pass }) => !pass)) process.exitCode = 1;
