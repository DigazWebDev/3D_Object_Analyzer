import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Photo } from '@/types';
import { formatFileSize } from '@/utils/photos';

import { ActionButton } from '../ui/action-button';

interface PhotoInformationModalProps {
  photo: Photo;
  visible: boolean;
  onClose(): void;
}

function analysisLabel(photo: Photo): string {
  const labels = {
    not_analyzed: 'Not analyzed',
    queued: 'Queued',
    analyzing: 'Analyzing',
    completed: 'Analysis available',
    failed: 'Analysis failed',
  } as const;
  return labels[photo.analysisStatus];
}

function InformationRow({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text selectable style={[styles.value, { color: theme.text }]}>
        {value}
      </Text>
    </View>
  );
}

export function PhotoInformationModal({ photo, visible, onClose }: PhotoInformationModalProps) {
  const { theme } = useAppTheme();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>PHOTO DETAILS</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
              Information
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close photo information"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
          >
            <Text style={[styles.done, { color: theme.primary }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <InformationRow label="Filename" value={photo.filename} />
          <InformationRow label="Dimensions" value={`${photo.width} × ${photo.height}`} />
          <InformationRow label="File type" value={photo.mimeType} />
          <InformationRow label="File size" value={formatFileSize(photo.fileSize)} />
          <InformationRow label="Created" value={new Date(photo.createdAt).toLocaleString()} />
          <InformationRow label="Modified" value={new Date(photo.updatedAt).toLocaleString()} />
          <InformationRow label="3D Analysis" value={analysisLabel(photo)} />
        </ScrollView>
        <ActionButton label="Close" onPress={onClose} variant="secondary" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: { fontSize: typography.caption, fontWeight: '700', letterSpacing: 1.3 },
  title: { fontSize: typography.title, fontWeight: '800' },
  done: { fontSize: typography.body, fontWeight: '700' },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    flexGrow: 0,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  label: { fontSize: typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  value: { fontSize: typography.body },
});
