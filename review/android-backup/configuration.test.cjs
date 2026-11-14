const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const { test } = require('node:test');

const mobile = path.resolve(__dirname, '../../mobile');
const mobileRequire = createRequire(path.join(mobile, 'package.json'));
const { XML } = mobileRequire('expo/config-plugins');
const config = JSON.parse(execFileSync(process.execPath,
  [path.join(mobile, 'node_modules/expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
  { cwd: mobile, env: { ...process.env, EXPO_NO_TELEMETRY: '1' }, encoding: 'utf8', timeout: 30_000 }));
const application = config._internal.modResults.android.manifest.manifest.application[0].$;
const resources = path.join(mobile, 'node_modules/expo-secure-store/android/src/main/res/xml');

// A regression in this dependency-provided allowlist would expose saved clips
// on OEMs that permit device transfer despite allowBackup=false. Inspect actual
// config-plugin output and installed resources, rather than a copied fixture.
function assertOnlyNonSecurePreferences(section) {
  assert.deepEqual(section.include.map(({ $ }) => $), [{ domain: 'sharedpref', path: '.' }]);
  assert.ok(section.exclude.some(({ $ }) => $.domain === 'sharedpref' && $.path === 'SecureStore'));
}

test('generated manifest disables backup and selects both checked XML resources', () => {
  assert.equal(application['android:allowBackup'], 'false');
  assert.equal(application['android:fullBackupContent'], '@xml/secure_store_backup_rules');
  assert.equal(application['android:dataExtractionRules'], '@xml/secure_store_data_extraction_rules');
  assert.equal(application['android:backupAgent'], undefined);
});

test('Android 11 backup allowlist excludes files/aamu-audio and databases', async () => {
  const xml = await XML.readXMLAsync({ path: path.join(resources, 'secure_store_backup_rules.xml') });
  assertOnlyNonSecurePreferences(xml['full-backup-content']);
});

for (const mode of ['cloud-backup', 'device-transfer']) {
  test(`Android 12+ ${mode} allowlist excludes files/aamu-audio and databases`, async () => {
    const xml = await XML.readXMLAsync({ path: path.join(resources, 'secure_store_data_extraction_rules.xml') });
    const section = xml['data-extraction-rules'][mode];
    assert.equal(section.length, 1, 'Missing transfer rules must not fall back to including all files');
    assertOnlyNonSecurePreferences(section[0]);
  });
}
