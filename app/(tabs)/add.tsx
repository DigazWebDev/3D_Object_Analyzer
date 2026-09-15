import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function AddPhotoScreen() {
  return (
    <Screen>
      <EmptyState
        description="Camera capture and photo import are implemented in Phase 2."
        icon="camera-outline"
        title="Add photos soon"
      />
    </Screen>
  );
}
