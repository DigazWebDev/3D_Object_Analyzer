import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type PhotoMenuAction = 'analyze' | 'edit' | 'share' | 'delete' | 'information';

interface PhotoMenuProps {
  visible: boolean;
  onClose(): void;
  onSelect(action: PhotoMenuAction): void;
}

interface MenuItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emphasized?: boolean;
  destructive?: boolean;
  onPress(): void;
}

function MenuItem({ label, icon, emphasized, destructive, onPress }: MenuItemProps) {
  const { theme } = useAppTheme();
  const foreground = destructive ? theme.danger : emphasized ? theme.primary : theme.text;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        emphasized && { backgroundColor: theme.primaryMuted },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons color={foreground} name={icon} size={22} />
      <Text style={[styles.itemLabel, { color: foreground }]}>{label}</Text>
      {emphasized ? (
        <View style={[styles.featureTag, { backgroundColor: theme.primary }]}>
          <Text style={styles.featureText}>FEATURE</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function PhotoMenu({ visible, onClose, onSelect }: PhotoMenuProps) {
  const { theme } = useAppTheme();
  const select = (action: PhotoMenuAction) => {
    onClose();
    onSelect(action);
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close photo menu" style={styles.backdrop} onPress={onClose}>
        <Pressable
          accessibilityViewIsModal
          onPress={(event) => event.stopPropagation()}
          style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.menuTitle, { color: theme.textSecondary }]}>PHOTO ACTIONS</Text>
          <MenuItem
            emphasized
            icon="cube-outline"
            label="3D Analyze"
            onPress={() => select('analyze')}
          />
          <MenuItem icon="create-outline" label="Edit" onPress={() => select('edit')} />
          <MenuItem icon="share-outline" label="Share" onPress={() => select('share')} />
          <MenuItem
            icon="information-circle-outline"
            label="Information"
            onPress={() => select('information')}
          />
          <MenuItem
            destructive
            icon="trash-outline"
            label="Delete"
            onPress={() => select('delete')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.48)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  menu: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  menuTitle: {
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
    padding: spacing.md,
  },
  item: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  itemLabel: { flex: 1, fontSize: typography.body, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  featureTag: { borderRadius: radii.pill, paddingHorizontal: 7, paddingVertical: 3 },
  featureText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
});
