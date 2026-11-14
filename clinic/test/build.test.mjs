import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const clinic = fileURLToPath(new URL('..', import.meta.url));
async function build(demo, verify) {
  const folder = await mkdtemp(path.join(tmpdir(), 'aamu-clinic-build-'));
  try {
    const environment = { ...process.env, DEMO_MODE: demo ? 'true' : 'false', CLINIC_OUT_DIR: folder,
      DEMO_DASHBOARD_TOKEN: 'SYNTHETIC-NEVER-BUNDLE-THIS' };
    if (demo === undefined) delete environment.DEMO_MODE;
    const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
      cwd: clinic, encoding: 'utf8', env: environment,
    });
    assert.equal(result.status, 0, result.stderr);
    await verify(folder);
  } finally { await rm(folder, { recursive: true, force: true }); }
}

test('disabled build excludes all demo fixtures and bundles local styling/font/engine', async () => {
  await build(false, async folder => {
    assert.equal(await readFile(path.join(folder, 'config.js'), 'utf8'), 'export const demoEnabled = false;\n');
    await assert.rejects(access(path.join(folder, 'demo')));
    await access(path.join(folder, 'assets/plus-jakarta-sans.ttf'));
    await access(path.join(folder, 'assets/OFL.txt'));
    const engine = await import(pathToFileURL(path.join(folder, 'engine.js')));
    assert.equal(engine.classifyClinic({ id: 'test', startedOn: '2026-11-14', mornings: [], lastClassified: null }, '2026-11-14').status, 'insufficient');
    for (const file of ['app.js', 'provider.js', 'polling.js', 'config.js', 'styles.css', 'index.html']) {
      const content = await readFile(path.join(folder, file), 'utf8');
      assert.doesNotMatch(content, /https?:\/\//, `${file} must use only local runtime assets`);
      assert.doesNotMatch(content, /DEMO-0[1-7]/, `${file} must not contain fixtures`);
      assert.doesNotMatch(content, /SYNTHETIC-NEVER-BUNDLE-THIS|DEMO_DASHBOARD_TOKEN/, `${file} must not contain server credentials`);
    }
    const css = await readFile(path.join(folder, 'styles.css'), 'utf8');
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, 'component styling must use shared color tokens');
  });
});

test('default-enabled build uses one protected feed; historical fixtures stay out of the bundle', async () => {
  await build(undefined, async folder => {
    assert.equal(await readFile(path.join(folder, 'config.js'), 'utf8'), 'export const demoEnabled = true;\n');
    await assert.rejects(access(path.join(folder, 'demo')));
    const live = await import(pathToFileURL(path.join(folder, 'provider.js')));
    let fetches = 0;
    assert.deepEqual(await live.createClinicProvider({ demoEnabled: false, fetchImpl: () => { fetches += 1; } })(), { demo: false, patients: [] });
    assert.equal(fetches, 0);
    const provider = await import(pathToFileURL(path.join(clinic, 'demo/provider.mjs')));
    const engine = await import(pathToFileURL(path.join(folder, 'engine.js')));
    assert.equal(provider.loadRecords().length, 6);
    assert.equal(provider.loadRecords('empty').length, 0);
    assert.equal(provider.loadRecords('off').length, 1);
    assert.equal(provider.loadRecords('insufficient').length, 2);
    assert.equal(provider.scenarios.length, 5);
    assert.throws(() => provider.loadRecords('unknown'));
    const modified = provider.loadRecords(); modified[0].mornings[0].level = 'off';
    assert.equal(provider.loadRecords()[0].mornings[0].level, 'medium');
    const later = engine.classifyClinic(provider.loadRecords('later')[0], provider.asOf);
    assert.equal(later.status, 'might_need_call');
    assert.equal(later.recent.noResponse, 3);
    assert.equal(later.recent.stoppedConfirmed, 1);
    assert.equal(later.recent.stoppedUnconfirmed, 1);
    assert.match(later.reason, /no response in the first hour; getting up confirmed later/);
    assert.match(later.reason, /alarm stopped; getting up confirmed later/);
    assert.match(later.reason, /alarm stopped but getting up not confirmed/);
    assert.doesNotThrow(() => provider.saveClassifications([later]));
    assert.deepEqual(provider.resetDemo('later'), provider.loadRecords('later'));
  });
});

test('build rejects source folders as output before removing any files', () => {
  for (const folder of [clinic, path.join(clinic, 'demo'), path.resolve(clinic, '..')]) {
    const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
      cwd: clinic, encoding: 'utf8', env: { ...process.env, CLINIC_OUT_DIR: folder },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsafe output directory/);
  }
});
