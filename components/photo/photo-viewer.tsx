import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

interface PhotoViewerProps {
  uri: string;
  accessibilityLabel: string;
}

export function PhotoViewer({ uri, accessibilityLabel }: PhotoViewerProps) {
  const { theme } = useAppTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const scale = useSharedValue(1);
  const scaleAtStart = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const xAtStart = useSharedValue(0);
  const yAtStart = useSharedValue(0);

  const gesture = useMemo(() => {
    const reset = () => {
      'worklet';
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    };

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        scaleAtStart.value = scale.value;
      })
      .onUpdate((event) => {
        scale.value = Math.max(1, Math.min(scaleAtStart.value * event.scale, 4));
      })
      .onEnd(() => {
        if (scale.value <= 1) {
          reset();
        }
      });

    const pan = Gesture.Pan()
      .onBegin(() => {
        xAtStart.value = translateX.value;
        yAtStart.value = translateY.value;
      })
      .onUpdate((event) => {
        if (scale.value > 1) {
          translateX.value = xAtStart.value + event.translationX;
          translateY.value = yAtStart.value + event.translationY;
        }
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd((_event, success) => {
        if (success) {
          if (scale.value > 1) {
            reset();
          } else {
            scale.value = withTiming(2);
          }
        }
      });

    return Gesture.Simultaneous(pinch, pan, doubleTap);
  }, [scale, scaleAtStart, translateX, translateY, xAtStart, yAtStart]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!hasError ? (
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.imageContainer, animatedStyle]}>
            <Image
              accessibilityLabel={accessibilityLabel}
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
              onLoad={() => setIsLoading(false)}
              onLoadStart={() => setIsLoading(true)}
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              transition={180}
            />
          </Animated.View>
        </GestureDetector>
      ) : (
        <View style={styles.message}>
          <Ionicons color={theme.textSecondary} name="alert-circle-outline" size={34} />
          <Text style={[styles.messageText, { color: theme.textSecondary }]}>
            Unable to display this photo.
          </Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  imageContainer: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  messageText: { fontSize: typography.body },
});
