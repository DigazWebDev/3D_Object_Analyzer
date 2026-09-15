import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  type CameraCapturedPicture,
  type CameraType,
  useCameraPermissions,
} from 'expo-camera';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { radii, spacing, typography } from '@/constants/theme';
import { usePhotoImport } from '@/hooks/use-photo-import';
import { usePhotos } from '@/hooks/use-photos';

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const { addPhotos } = usePhotos();
  const { importPhotos, isImporting } = usePhotoImport();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [captured, setCaptured] = useState<CameraCapturedPicture | null>(null);

  const chooseFromLibrary = async () => {
    const count = await importPhotos();
    if (count > 0) {
      router.replace('/');
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !isReady || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92 });
      if (photo) {
        setCaptured(photo);
      }
    } catch {
      Alert.alert('Unable to take photo', 'Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const saveCapturedPhoto = async () => {
    if (!captured || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await addPhotos([
        {
          sourceUri: captured.uri,
          filename: `IMG_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          width: captured.width,
          height: captured.height,
        },
      ]);
      router.replace('/');
    } catch {
      Alert.alert('Unable to save photo', 'The photo could not be added to your library.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <ActivityIndicator color="#FFFFFF" size="large" />
        <Text style={styles.permissionDescription}>Checking camera access…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar style="light" />
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <Ionicons color="#FFFFFF" name="camera-outline" size={36} />
          </View>
          <Text accessibilityRole="header" style={styles.permissionTitle}>
            Camera access is required
          </Text>
          <Text style={styles.permissionDescription}>
            Allow camera access to take object photos. You can still choose an existing image.
          </Text>
          {permission.canAskAgain ? (
            <ActionButton
              icon="camera-outline"
              label="Allow Camera"
              onPress={() => void requestPermission()}
            />
          ) : (
            <ActionButton
              icon="settings-outline"
              label="Open Settings"
              onPress={() => void Linking.openSettings()}
            />
          )}
          <ActionButton
            icon="images-outline"
            label="Choose From Library"
            loading={isImporting}
            onPress={() => void chooseFromLibrary()}
            variant="secondary"
          />
          <ActionButton label="Cancel" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  if (captured) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Image contentFit="contain" source={{ uri: captured.uri }} style={styles.preview} />
        <View style={styles.previewHeader}>
          <Pressable
            accessibilityLabel="Discard photo"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setCaptured(null)}
            style={styles.iconButton}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.previewActions}>
          <ActionButton
            icon="refresh-outline"
            label="Retake"
            onPress={() => setCaptured(null)}
            variant="secondary"
          />
          <ActionButton
            icon="checkmark"
            label="Use Photo"
            loading={isSaving}
            onPress={() => void saveCapturedPhoto()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView
        facing={facing}
        onCameraReady={() => setIsReady(true)}
        onMountError={() =>
          Alert.alert('Unable to open camera', 'Please check camera access and try again.')
        }
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.cameraOverlay}>
        <View style={styles.cameraHeader}>
          <Pressable
            accessibilityLabel="Close camera"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <Text style={styles.cameraTitle}>Camera</Text>
          <Pressable
            accessibilityLabel="Switch camera"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
            style={styles.iconButton}
          >
            <Ionicons color="#FFFFFF" name="camera-reverse-outline" size={26} />
          </Pressable>
        </View>
        <View style={styles.captureArea}>
          <Pressable
            accessibilityLabel="Take photo"
            accessibilityRole="button"
            disabled={!isReady || isCapturing}
            onPress={() => void takePhoto()}
            style={[styles.captureOuter, (!isReady || isCapturing) && styles.disabled]}
          >
            {isCapturing ? (
              <ActivityIndicator color="#111318" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000000', flex: 1 },
  permissionContainer: {
    backgroundColor: '#0A0B0E',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionContent: { gap: spacing.md },
  permissionIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#20232A',
    borderRadius: radii.lg,
    height: 72,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 72,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionDescription: {
    color: '#AEB4BF',
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  cameraTitle: { color: '#FFFFFF', fontSize: typography.body, fontWeight: '700' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  captureArea: { alignItems: 'center', paddingBottom: spacing.xl },
  captureOuter: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  captureInner: {
    borderColor: '#111318',
    borderRadius: 35,
    borderWidth: 2,
    height: 70,
    width: 70,
  },
  disabled: { opacity: 0.55 },
  preview: { flex: 1 },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
    top: spacing.xl,
  },
  previewTitle: { color: '#FFFFFF', fontSize: typography.body, fontWeight: '700' },
  previewActions: {
    backgroundColor: '#0A0B0E',
    gap: spacing.sm,
    padding: spacing.md,
  },
});
