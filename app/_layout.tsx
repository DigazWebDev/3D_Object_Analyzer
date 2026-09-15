import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { PhotosProvider } from '@/hooks/use-photos';

export default function RootLayout() {
  const { mode } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={mode === 'dark' ? DarkTheme : DefaultTheme}>
        <PhotosProvider>
          <Stack screenOptions={{ headerBackTitle: 'Back' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="camera"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="photo/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="analyze/[photoId]" options={{ title: '3D Analysis' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
          <StatusBar style="auto" />
        </PhotosProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
