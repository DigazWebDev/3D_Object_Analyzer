import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Photos',
          tabBarAccessibilityLabel: 'Photos gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="images-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
          tabBarAccessibilityLabel: 'Albums',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="albums-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarAccessibilityLabel: 'Add photos, available in Phase 2',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={color} name="add-circle-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
