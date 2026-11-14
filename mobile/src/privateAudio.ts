import { Platform } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import { prepareNativePrivateStorage, protectNativePrivateAudioFile } from '../modules/aamu-alarm';

/** One storage boundary shared by explicit Save, playback and the state gate. */
export async function preparePrivateStorage(): Promise<{ audioDirectoryUri: string }> {
  if (Platform.OS === 'ios') return prepareNativePrivateStorage();
  if (Platform.OS === 'android') {
    // Paths.document is Android's filesDir. The generated SecureStore backup
    // rules include only shared preferences, excluding these files from both
    // cloud backup and device transfer. allowBackup:false alone is insufficient
    // on some devices. review/android-backup guards the complete configuration.
    // Actual device backup/transfer behavior remains unverified.
    const directory = new Directory(Paths.document, 'aamu-audio');
    directory.create({ idempotent: true, intermediates: true });
    return { audioDirectoryUri: directory.uri };
  }
  throw new Error('Private recording storage requires the phone app.');
}

export async function protectPrivateAudioFile(uri: string): Promise<string> {
  if (!uri.startsWith('file://')) throw new Error('The private recording is unavailable.');
  if (Platform.OS === 'ios') return protectNativePrivateAudioFile(uri);
  const { audioDirectoryUri } = await preparePrivateStorage();
  const parsed = new URL(uri);
  const directory = new URL(audioDirectoryUri.endsWith('/') ? audioDirectoryUri : `${audioDirectoryUri}/`);
  const filename = parsed.pathname.slice(directory.pathname.length);
  if (parsed.protocol !== 'file:' || parsed.hostname || parsed.search || parsed.hash
    || !parsed.pathname.startsWith(directory.pathname) || !/^[a-zA-Z0-9_-]+\.m4a$/i.test(filename)) {
    throw new Error('The private recording is unavailable.');
  }
  return parsed.href;
}
