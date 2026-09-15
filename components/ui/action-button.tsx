import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

interface ActionButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  onPress(): void;
}

export function ActionButton({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
}: ActionButtonProps) {
  const { theme } = useAppTheme();
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? '#FFFFFF' : variant === 'danger' ? theme.danger : theme.text;
  const background = isPrimary ? theme.primary : theme.surfaceElevated;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'danger' ? theme.danger : theme.border,
        },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Ionicons color={foreground} name={icon} size={20} /> : null}
          <Text style={[styles.label, { color: foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: typography.body, fontWeight: '700' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
