import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function AlbumsScreen() {
  return (
    <Screen>
      <EmptyState
        description="Create and organize albums when gallery management arrives in a later phase."
        icon="albums-outline"
        title="Albums arrive later"
      />
    </Screen>
  );
}
