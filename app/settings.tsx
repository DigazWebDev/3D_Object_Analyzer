import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';

export default function SettingsScreen() {
  return (
    <Screen>
      <EmptyState
        description="The app currently follows your device theme. Additional preferences arrive during polish."
        icon="settings-outline"
        title="Settings"
      />
    </Screen>
  );
}
