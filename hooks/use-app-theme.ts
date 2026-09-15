import { useColorScheme } from 'react-native';

import { themes } from '@/constants/theme';

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const mode = colorScheme === 'dark' ? 'dark' : 'light';

  return { mode, theme: themes[mode] } as const;
}
