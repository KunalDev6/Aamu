# Android recording backup audit — 14 November 2026

No current recording-backup gap was confirmed, so this audit does not move or
delete files, add a native bridge, or change the generated native project.
`src/privateAudio.ts` continues to return `Paths.document/aamu-audio`, compatible
with the existing Recorder Save and verified-local-URI playback paths.

The protection is the complete generated configuration, **not** `allowBackup:
false` alone. Android documents that some Android 12+ manufacturers permit
device-to-device transfer despite that flag. The generated Aamu manifest also
selects Expo SecureStore's `secure_store_backup_rules.xml` (Android 11 and lower)
and `secure_store_data_extraction_rules.xml` (Android 12+). The installed resources
include only the `sharedpref` domain in both cloud-backup and device-transfer,
then exclude SecureStore. With an include rule, Android includes only the
selected domains. The `file` domain containing saved recordings and the database
domain containing app state are therefore excluded.

The installed Expo SDK 58 code maps `Paths.document` through
`FileSystemModule.filesDirectory` → `AppContext.persistentFilesDirectory` →
`AppDirectoriesService` → `Context.filesDir`. Unsaved and sensing clips use cache,
which Android excludes independently. The native alarm journal uses
`noBackupFilesDir`. No cross-platform transfer is configured, no custom
BackupAgent exists, and this audit adds no upload, analytics or external service.

The focused tests evaluate the real Expo config plugins without writing a native
project and parse the installed XML resources. They guard the dependency-backed
allowlist, both transfer modes, the manifest references and the disabled-backup
flag. Run using the project's Node 24 runtime:

```sh
node --test review/android-backup/configuration.test.cjs
```

Four configuration checks passed. This is source/configuration evidence, not an
actual OS backup, restore, OEM device-transfer or recording/playback test. The
Android build owner subsequently verified the actual merged manifest and compiled
APK XML: allowBackup=false, both expected resource references, and the same
sharedpref-only allowlists in cloud-backup and device-transfer. This strengthens
packaging evidence, not actual device-transfer acceptance. No claim is made about
removing earlier backups. If the SecureStore plugin or its resource policy changes,
preserve these exclusions explicitly before shipping.

Primary references:

- [Android backup controls, OEM caveat and include/exclude semantics](https://developer.android.com/identity/data/autobackup)
- [Expo SDK 58 FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)
- [Expo SDK 58 SecureStore backup configuration](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
