import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/auth';
import { useThemeStore } from '../src/store/theme';
import { getDb } from '../src/db';

export default function RootLayout() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    loadTheme();
    loadUser();
    getDb().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="co" options={{ headerShown: false }} />
        <Stack.Screen
          name="client/[id]"
          options={{ title: 'Client Portfolio', headerBackTitle: 'Back' }}
        />
      </Stack>
    </>
  );
}
