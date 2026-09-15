import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { PhotoSourceActions } from '@/components/gallery/photo-source-actions';
import { PhotoThumbnail } from '@/components/gallery/photo-thumbnail';
import { ActionButton } from '@/components/ui/action-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePhotos } from '@/hooks/use-photos';
import type { Photo } from '@/types';
import { groupPhotosByDate } from '@/utils/photos';

export default function PhotosScreen() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { photos, isLoading, isMutating, error, clearError, refresh } = usePhotos();
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const sections = useMemo(() => groupPhotosByDate(photos), [photos]);
  const thumbnailSize = Math.floor((width - spacing.lg * 2 - spacing.sm * 2) / 3);

  const openPhoto = (photo: Photo) => {
    router.push({ pathname: '/photo/[id]', params: { id: photo.id } });
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>3D OBJECT ANALYZER</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            Photos
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Add photos"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setSourceSheetVisible(true)}
            style={[styles.headerButton, { backgroundColor: theme.primaryMuted }]}
          >
            <Ionicons color={theme.primary} name="add" size={25} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push('/settings')}
            style={styles.headerButton}
          >
            <Ionicons color={theme.text} name="settings-outline" size={24} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View accessibilityLabel="Loading photo library" style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading photos…</Text>
        </View>
      ) : error && photos.length === 0 ? (
        <EmptyState description={error} icon="alert-circle-outline" title="Unable to load photos">
          <ActionButton
            icon="refresh-outline"
            label="Try Again"
            onPress={() => {
              clearError();
              void refresh();
            }}
          />
        </EmptyState>
      ) : photos.length === 0 ? (
        <EmptyState
          description="Take a photo or import one from your library to get started."
          icon="image-outline"
          title="No Photos Yet"
        >
          <PhotoSourceActions />
        </EmptyState>
      ) : (
        <SectionList
          contentContainerStyle={styles.listContent}
          initialNumToRender={12}
          keyExtractor={(row) => row.map((photo) => photo.id).join(':')}
          refreshControl={
            <RefreshControl
              colors={[theme.primary]}
              onRefresh={() => void refresh()}
              refreshing={isLoading}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item: row }) => (
            <View style={styles.row}>
              {row.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  onPress={openPhoto}
                  photo={photo}
                  size={thumbnailSize}
                />
              ))}
              {Array.from({ length: 3 - row.length }).map((_, index) => (
                <View key={`empty-${index}`} style={{ width: thumbnailSize }} />
              ))}
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionTitle,
                { backgroundColor: theme.background, color: theme.text },
              ]}
            >
              {section.title}
            </Text>
          )}
          sections={sections}
          stickySectionHeadersEnabled
          windowSize={7}
        />
      )}

      {isMutating ? (
        <View
          accessibilityLabel="Updating photo library"
          style={[styles.mutating, { backgroundColor: theme.surfaceElevated }]}
        >
          <ActivityIndicator color={theme.primary} size="small" />
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setSourceSheetVisible(false)}
        transparent
        visible={sourceSheetVisible}
      >
        <Pressable style={styles.backdrop} onPress={() => setSourceSheetVisible(false)}>
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add to Photos</Text>
            <Text style={[styles.sheetDescription, { color: theme.textSecondary }]}>
              Capture a new object or choose existing photos.
            </Text>
            <PhotoSourceActions onActionStarted={() => setSourceSheetVisible(false)} />
            <ActionButton
              label="Cancel"
              onPress={() => setSourceSheetVisible(false)}
              variant="secondary"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  headerButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  eyebrow: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: typography.display, fontWeight: '800', letterSpacing: -1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  loadingText: { fontSize: typography.body },
  listContent: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  mutating: {
    borderRadius: radii.pill,
    bottom: spacing.lg,
    padding: spacing.md,
    position: 'absolute',
    right: spacing.lg,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: { borderRadius: radii.lg, gap: spacing.sm, padding: spacing.lg },
  sheetTitle: { fontSize: typography.title, fontWeight: '800' },
  sheetDescription: {
    fontSize: typography.body,
    lineHeight: 23,
    marginBottom: spacing.md,
  },
});
