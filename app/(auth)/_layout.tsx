import { Stack } from 'expo-router';
import { useThemeStore } from '../../src/store/theme';

export default function AuthLayout() {
  const colors = useThemeStore((s) => s.colors);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
