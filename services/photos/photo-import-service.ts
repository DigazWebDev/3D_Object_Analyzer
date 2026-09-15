import * as ImagePicker from 'expo-image-picker';

import type { NewPhotoInput } from './photo-repository';

export class PhotoLibraryPermissionError extends Error {
  constructor(readonly canAskAgain: boolean) {
    super('Photo library access is required to import photos.');
    this.name = 'PhotoLibraryPermissionError';
  }
}

export async function pickPhotos(): Promise<NewPhotoInput[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new PhotoLibraryPermissionError(permission.canAskAgain);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 0,
    quality: 1,
  });

  if (result.canceled) {
    return [];
  }

  return result.assets.map((asset) => ({
    sourceUri: asset.uri,
    filename: asset.fileName,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
  }));
}
