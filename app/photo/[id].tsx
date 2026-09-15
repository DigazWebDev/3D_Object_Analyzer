import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <EmptyState
        description={`Photo detail for ${id ?? 'this photo'} is implemented in Phase 2.`}
        icon="image-outline"
        title="Photo detail"
      />
    </Screen>
  );
}
