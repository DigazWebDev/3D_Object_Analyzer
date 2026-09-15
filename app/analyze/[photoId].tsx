import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function AnalysisScreen() {
  return (
    <Screen>
      <EmptyState
        description="Gemini object analysis arrives in Phase 4, followed by the exploded view in Phase 5."
        icon="cube-outline"
        title="3D Analyze"
      />
    </Screen>
  );
}
