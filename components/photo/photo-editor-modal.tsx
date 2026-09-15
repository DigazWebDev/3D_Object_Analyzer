import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Photo } from '@/types';

import { ActionButton } from '../ui/action-button';

interface PhotoEditorModalProps {
  photo: Photo;
  visible: boolean;
  onClose(): void;
  onReplace(input: {
    sourceUri: string;
    mimeType: string;
    width: number;
    height: number;
  }): Promise<void>;
}

function saveFormatFor(mimeType: string): SaveFormat {
  if (mimeType === 'image/png') {
    return SaveFormat.PNG;
  }
  if (mimeType === 'image/webp') {
    return SaveFormat.WEBP;
  }
  return SaveFormat.JPEG;
}

export function PhotoEditorModal({ photo, visible, onClose, onReplace }: PhotoEditorModalProps) {
  const { theme } = useAppTheme();
  const [isEditing, setIsEditing] = useState(false);

  const rotate = async (degrees: number) => {
    setIsEditing(true);
    try {
      const context = ImageManipulator.manipulate(photo.uri);
      context.rotate(degrees);
      const rendered = await context.renderAsync();
      const format = saveFormatFor(photo.mimeType);
      const result = await rendered.saveAsync({ compress: 0.95, format });
      const mimeType =
        format === SaveFormat.PNG
          ? 'image/png'
          : format === SaveFormat.WEBP
            ? 'image/webp'
            : 'image/jpeg';
      await onReplace({
        sourceUri: result.uri,
        mimeType,
        width: result.width,
        height: result.height,
      });
    } catch {
      Alert.alert('Unable to edit photo', 'The change could not be saved. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            Edit Photo
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Rotate the image. Changes are saved locally.
          </Text>
        </View>
        <View style={[styles.preview, { backgroundColor: theme.surface }]}>
          <Image contentFit="contain" source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
        </View>
        <View style={styles.actions}>
          <ActionButton
            disabled={isEditing}
            icon="arrow-undo-outline"
            label="Rotate Left"
            onPress={() => void rotate(-90)}
            variant="secondary"
          />
          <ActionButton
            disabled={isEditing}
            icon="arrow-redo-outline"
            label="Rotate Right"
            onPress={() => void rotate(90)}
            variant="secondary"
          />
          <ActionButton label="Done" loading={isEditing} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl },
  header: { marginBottom: spacing.lg },
  title: { fontSize: typography.title, fontWeight: '800' },
  description: { fontSize: typography.body, marginTop: spacing.xs },
  preview: { borderRadius: radii.lg, flex: 1, overflow: 'hidden' },
  actions: { gap: spacing.sm, paddingTop: spacing.lg },
});
