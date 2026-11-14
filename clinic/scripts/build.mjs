import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { clinicDemoMode } from './mode.mjs';

const clinic = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(clinic, '..');
const destination = process.env.CLINIC_OUT_DIR ? path.resolve(process.env.CLINIC_OUT_DIR) : path.join(clinic, 'dist');
if (destination === root || destination === clinic || root.startsWith(`${destination}${path.sep}`)
  || (destination.startsWith(`${root}${path.sep}`) && destination !== path.join(clinic, 'dist'))) {
  throw new Error('Unsafe output directory');
}
const demo = clinicDemoMode();
const require = createRequire(path.join(root, 'api/package.json'));
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');
await rm(destination, { recursive: true, force: true });
await mkdir(path.join(destination, 'assets'), { recursive: true });
for (const filename of ['index.html', 'styles.css']) await copyFile(path.join(clinic, filename), path.join(destination, filename));
await copyFile(path.join(clinic, 'app.mjs'), path.join(destination, 'app.js'));
for (const name of ['provider', 'polling']) await copyFile(path.join(clinic, `${name}.mjs`), path.join(destination, `${name}.js`));
// TypeScript 7 exposes the CLI; avoid depending on its unstable compiler API.
const compiled = spawnSync(process.execPath, [compiler, '--target', 'ES2022', '--module', 'ES2022',
  '--strict', '--skipLibCheck', '--outDir', destination, path.join(root, 'shared/clinic/engine.ts')],
{ cwd: clinic, encoding: 'utf8' });
if (compiled.status !== 0) throw new Error(`Clinic engine compilation failed:\n${compiled.stdout}${compiled.stderr}`);
await writeFile(path.join(destination, 'config.js'), `export const demoEnabled = ${demo};\n`);
const themeSource = await readFile(path.join(root, 'src/theme.ts'), 'utf8');
const { colors } = await import(`data:text/javascript;base64,${Buffer.from(themeSource).toString('base64')}`);
const cssName = name => name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
await writeFile(path.join(destination, 'theme.css'), `:root {\n${Object.entries(colors).map(([name, value]) => `  --${cssName(name)}: ${value};`).join('\n')}\n}\n`);
await copyFile(path.join(root, 'review/assets/plus-jakarta-sans.ttf'), path.join(destination, 'assets/plus-jakarta-sans.ttf'));
await copyFile(path.join(root, 'review/assets/OFL.txt'), path.join(destination, 'assets/OFL.txt'));
console.log(`Clinic built locally (${demo ? 'protected demo feed enabled' : 'demo disabled; empty workspace'}): ${destination}`);
