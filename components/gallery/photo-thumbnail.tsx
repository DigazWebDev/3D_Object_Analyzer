import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Photo } from '@/types';

interface PhotoThumbnailProps {
  photo: Photo;
  size: number;
  onPress(photo: Photo): void;
}

function AnalysisBadge({ photo }: { photo: Photo }) {
  const { theme } = useAppTheme();
  if (photo.analysisStatus === 'not_analyzed') {
    return null;
  }

  const label =
    photo.analysisStatus === 'completed'
      ? '3D'
      : photo.analysisStatus === 'analyzing'
        ? 'Analyzing'
        : photo.analysisStatus === 'failed'
          ? 'Failed'
          : 'Queued';

  return (
    <View style={[styles.badge, { backgroundColor: theme.surfaceElevated }]}>
      <Ionicons color={theme.primary} name="sparkles" size={11} />
      <Text style={[styles.badgeText, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

function SyncBadge({ photo }: { photo: Photo }) {
  const { theme } = useAppTheme();
  const details = {
    local: { icon: 'ellipse-outline', label: 'Local' },
    pending: { icon: 'time-outline', label: 'Pending' },
    syncing: { icon: 'sync-outline', label: 'Syncing' },
    synced: { icon: 'checkmark-circle-outline', label: 'Synced' },
    failed: { icon: 'alert-circle-outline', label: 'Sync failed' },
  }[photo.syncStatus] as {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  };
  const color = photo.syncStatus === 'failed' ? theme.danger : theme.textSecondary;

  return (
    <View
      accessibilityLabel={`Cloud status: ${details.label}`}
      accessible
      style={[styles.syncBadge, { backgroundColor: theme.surfaceElevated }]}
    >
      <Ionicons color={color} name={details.icon} size={11} />
      <Text style={[styles.badgeText, { color }]}>{details.label}</Text>
    </View>
  );
}

function PhotoThumbnailComponent({ photo, size, onPress }: PhotoThumbnailProps) {
  const { theme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <Pressable
      accessibilityLabel={`Open ${photo.filename}`}
      accessibilityRole="imagebutton"
      onPress={() => onPress(photo)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface, height: size, width: size },
        pressed && styles.pressed,
      ]}
    >
      {!hasError ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
          onLoadStart={() => setIsLoading(true)}
          recyclingKey={photo.id}
          source={{ uri: photo.thumbnailUri ?? photo.uri }}
          style={StyleSheet.absoluteFill}
          transition={150}
        />
      ) : (
        <Ionicons color={theme.textSecondary} name="image-outline" size={30} />
      )}
      {isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      <SyncBadge photo={photo} />
      <AnalysisBadge photo={photo} />
    </Pressable>
  );
}

export const PhotoThumbnail = memo(PhotoThumbnailComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { opacity: 0.82 },
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    bottom: spacing.xs,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    right: spacing.xs,
  },
  badgeText: { fontSize: typography.caption, fontWeight: '700' },
  syncBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    bottom: spacing.xs,
    flexDirection: 'row',
    gap: 3,
    left: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
  },
});
