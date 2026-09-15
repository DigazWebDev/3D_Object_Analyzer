import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

interface EmptyStateProps extends PropsWithChildren {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <View accessibilityRole="summary" style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.primaryMuted }]}>
        <Ionicons color={theme.primary} name={icon} size={30} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.lg,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 64,
  },
  title: { fontSize: typography.title, fontWeight: '700', marginBottom: spacing.sm },
  description: {
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 300,
    textAlign: 'center',
  },
  actions: { gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
});
