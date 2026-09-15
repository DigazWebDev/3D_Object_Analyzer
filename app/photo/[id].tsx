import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoEditorModal } from '@/components/photo/photo-editor-modal';
import { PhotoInformationModal } from '@/components/photo/photo-information-modal';
import { PhotoMenu, type PhotoMenuAction } from '@/components/photo/photo-menu';
import { PhotoViewer } from '@/components/photo/photo-viewer';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePhotos } from '@/hooks/use-photos';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { getPhoto, isLoading, isMutating, deletePhoto, replacePhotoImage } = usePhotos();
  const photo = id ? getPhoto(id) : undefined;
  const [menuVisible, setMenuVisible] = useState(false);
  const [informationVisible, setInformationVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleAnalyze = () => {
    Alert.alert(
      '3D Analyze',
      'Gemini object analysis is coming in Phase 4. No analysis has been created.',
    );
  };

  const handleShare = async () => {
    if (!photo) {
      return;
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share local files.');
        return;
      }
      await Sharing.shareAsync(photo.uri, {
        dialogTitle: `Share ${photo.filename}`,
        mimeType: photo.mimeType,
      });
    } catch {
      Alert.alert('Unable to share photo', 'Please try again.');
    }
  };

  const confirmDelete = () => {
    if (!photo) {
      return;
    }
    Alert.alert('Delete photo?', 'This photo will be removed from your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deletePhoto(photo.id);
              router.replace('/');
            } catch {
              Alert.alert('Unable to delete photo', 'Please try again.');
            }
          })();
        },
      },
    ]);
  };

  const handleMenuAction = (action: PhotoMenuAction) => {
    switch (action) {
      case 'analyze':
        handleAnalyze();
        break;
      case 'edit':
        setEditorVisible(true);
        break;
      case 'share':
        void handleShare();
        break;
      case 'delete':
        confirmDelete();
        break;
      case 'information':
        setInformationVisible(true);
        break;
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <View accessibilityLabel="Loading photo" style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={{ color: theme.textSecondary }}>Loading photo…</Text>
        </View>
      </Screen>
    );
  }

  if (!photo) {
    return (
      <Screen>
        <EmptyState
          description="This photo may have been deleted or is no longer available."
          icon="image-outline"
          title="Photo not found"
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="Back to photos"
          accessibilityRole="button"
          hitSlop={12}
          onPress={goBack}
          style={styles.headerButton}
        >
          <Ionicons color={theme.text} name="chevron-back" size={28} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.filename, { color: theme.text }]}>
          {photo.filename}
        </Text>
        <Pressable
          accessibilityLabel="Photo actions"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => setMenuVisible(true)}
          style={styles.headerButton}
        >
          <Ionicons color={theme.text} name="ellipsis-vertical" size={24} />
        </Pressable>
      </View>

      <PhotoViewer accessibilityLabel={photo.filename} uri={photo.uri} />

      <View
        style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
      >
        <View>
          <Text style={[styles.date, { color: theme.text }]}>
            {new Date(photo.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text style={[styles.dimensions, { color: theme.textSecondary }]}>
            {photo.width} × {photo.height}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Start 3D Analyze"
          accessibilityRole="button"
          onPress={handleAnalyze}
          style={[styles.analyzeButton, { backgroundColor: theme.primaryMuted }]}
        >
          <Ionicons color={theme.primary} name="cube-outline" size={20} />
          <Text style={[styles.analyzeLabel, { color: theme.primary }]}>3D Analyze</Text>
        </Pressable>
      </View>

      <PhotoMenu
        onClose={() => setMenuVisible(false)}
        onSelect={handleMenuAction}
        visible={menuVisible}
      />
      <PhotoInformationModal
        onClose={() => setInformationVisible(false)}
        photo={photo}
        visible={informationVisible}
      />
      <PhotoEditorModal
        onClose={() => setEditorVisible(false)}
        onReplace={async (input) => {
          await replacePhotoImage(photo.id, input);
        }}
        photo={photo}
        visible={editorVisible}
      />
      {isMutating ? (
        <View style={styles.operationOverlay}>
          <ActivityIndicator color="#FFFFFF" size="large" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  headerButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  filename: { flex: 1, fontSize: typography.label, fontWeight: '700', textAlign: 'center' },
  footer: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  date: { fontSize: typography.label, fontWeight: '700' },
  dimensions: { fontSize: typography.caption, marginTop: 2 },
  analyzeButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  analyzeLabel: { fontSize: typography.label, fontWeight: '800' },
  operationOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
});
