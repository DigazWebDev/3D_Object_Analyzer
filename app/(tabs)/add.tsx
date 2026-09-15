import { useRouter } from 'expo-router';

import { PhotoSourceActions } from '@/components/gallery/photo-source-actions';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function AddPhotoScreen() {
  const router = useRouter();

  return (
    <Screen>
      <EmptyState
        description="Capture a new object or choose one or more images from your library."
        icon="camera-outline"
        title="Add Photos"
      >
        <PhotoSourceActions
          onImportComplete={(count) => {
            if (count > 0) {
              router.replace('/');
            }
          }}
        />
      </EmptyState>
    </Screen>
  );
}
