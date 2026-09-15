import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { usePhotoImport } from '@/hooks/use-photo-import';

import { ActionButton } from '../ui/action-button';

interface PhotoSourceActionsProps {
  onActionStarted?(): void;
  onImportComplete?(count: number): void;
}

export function PhotoSourceActions({ onActionStarted, onImportComplete }: PhotoSourceActionsProps) {
  const router = useRouter();
  const { importPhotos, isImporting } = usePhotoImport();

  const handleImport = async () => {
    onActionStarted?.();
    const count = await importPhotos();
    onImportComplete?.(count);
  };

  return (
    <View style={styles.container}>
      <ActionButton
        icon="camera-outline"
        label="Take Photo"
        onPress={() => {
          onActionStarted?.();
          router.push('/camera');
        }}
      />
      <ActionButton
        icon="images-outline"
        label="Import Photos"
        loading={isImporting}
        onPress={() => void handleImport()}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, width: '100%' },
});
