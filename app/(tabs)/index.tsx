import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function PhotosScreen() {
  const { theme } = useAppTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>3D OBJECT ANALYZER</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            Photos
          </Text>
        </View>
        <Link asChild href="/settings">
          <Pressable accessibilityLabel="Open settings" hitSlop={12}>
            <Ionicons color={theme.text} name="settings-outline" size={25} />
          </Pressable>
        </Link>
      </View>
      <EmptyState
        description="Take or import a photo in Phase 2 to begin understanding an object."
        icon="image-outline"
        title="No photos yet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
  },
  eyebrow: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: typography.display, fontWeight: '800', letterSpacing: -1 },
});
