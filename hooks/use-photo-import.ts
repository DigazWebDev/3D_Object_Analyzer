import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { PhotoLibraryPermissionError, pickPhotos } from '@/services/photos/photo-import-service';

import { usePhotos } from './use-photos';

export function usePhotoImport() {
  const { addPhotos } = usePhotos();
  const [isImporting, setIsImporting] = useState(false);

  const importPhotos = useCallback(async (): Promise<number> => {
    setIsImporting(true);
    try {
      const inputs = await pickPhotos();
      if (inputs.length === 0) {
        return 0;
      }

      const created = await addPhotos(inputs);
      return created.length;
    } catch (error) {
      if (error instanceof PhotoLibraryPermissionError) {
        Alert.alert('Photo access is required', 'Allow photo library access to import images.', [
          { text: 'Cancel', style: 'cancel' },
          ...(error.canAskAgain
            ? [{ text: 'Try Again', onPress: () => void importPhotos() }]
            : [{ text: 'Open Settings', onPress: () => void Linking.openSettings() }]),
        ]);
      } else {
        Alert.alert('Unable to import photos', 'Please try again.');
      }
      return 0;
    } finally {
      setIsImporting(false);
    }
  }, [addPhotos]);

  return { importPhotos, isImporting } as const;
}
