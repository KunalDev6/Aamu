import { Platform } from 'react-native';
import { Directory, File } from 'expo-file-system';
import { uuid } from 'expo';
import { preparePrivateStorage } from './privateAudio';

// The browser preview keeps a photo in app state, so it has to stay small.
const webPhotoLimit = 1_400_000;
const extensions = ['jpg', 'jpeg', 'png', 'heic', 'webp'];

/**
 * Opens the system photo picker for one image and keeps a private copy.
 * The system picker hands over only the chosen image; the library is never read.
 * Returns null when the person cancels. The copy lives beside the private
 * recordings, in a folder excluded from backup, and is never uploaded.
 */
export async function chooseMomentPhoto(): Promise<string | null> {
  // Loaded on use: an app build made before the picker was added still opens
  // every screen, and only this action reports that it is unavailable.
  const ImagePicker = await import('expo-image-picker');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images', quality: 0.7, exif: false, base64: Platform.OS === 'web',
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  if (Platform.OS === 'web') {
    const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    if (!uri.startsWith('data:image/') || uri.length > webPhotoLimit) throw new Error('Photo unavailable in the preview');
    return uri;
  }
  const source = new File(asset.uri);
  if (!source.exists || source.size <= 0) throw new Error('Photo unavailable');
  const { audioDirectoryUri } = await preparePrivateStorage();
  const directory = new Directory(audioDirectoryUri);
  directory.create({ idempotent: true, intermediates: true });
  const found = asset.uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const destination = new File(directory, `moment-${uuid.v4()}.${extensions.includes(found) ? found : 'jpg'}`);
  await source.copy(destination);
  if (!destination.exists || destination.size <= 0) throw new Error('Photo not copied');
  return destination.uri;
}

/** Only the app's own private copies (or the preview's in-memory image) are ever displayed. */
export function isMomentPhoto(uri: string | undefined): uri is string {
  if (!uri) return false;
  if (Platform.OS === 'web') return uri.startsWith('data:image/');
  return uri.startsWith('file://') && /\/moment-[a-zA-Z0-9-]+\.[a-z]+$/.test(uri);
}

/** Best effort: removing a moment also removes its private files. Paths are never logged. */
export function deleteMomentFiles(moment: { uri: string; photoUri?: string }) {
  if (Platform.OS === 'web') return;
  for (const uri of [moment.uri, moment.photoUri]) {
    try { if (uri?.startsWith('file://')) { const file = new File(uri); if (file.exists) file.delete(); } } catch { /* Nothing to report. */ }
  }
}
