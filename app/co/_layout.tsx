import { Image, Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { API_BASE_URL } from '../../src/constants/config';
import BottomNav from '../../src/components/BottomNav';

const CUPAD_LOGO = 'https://cupad.name.ng/uploads/CUPAD%20LOGO.png';

export default function CoLayout() {
  const colors = useThemeStore((s) => s.colors);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const displayName = user?.full_name || user?.name || user?.username || 'User';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  const profileUri = (() => {
    const value = String(user?.profile_pic || '').trim();
    if (!value || value.toLowerCase().includes('default_avatar')) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const clean = value.replace(/^\.\//, '').replace(/^\//, '');
    const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${origin}/${clean}`;
  })();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          headerTitle: () => null,
          contentStyle: { backgroundColor: colors.background, paddingBottom: 70 },
          headerLeft: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 14, gap: 8 }}>
              <Image source={{ uri: CUPAD_LOGO }} style={{ width: 32, height: 32 }} resizeMode="contain" />
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '800', letterSpacing: 0.2 }}>CUPAD</Text>
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
              <Pressable
                onPress={() => toggleTheme()}
                accessibilityRole="button"
                accessibilityLabel={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoBg, marginRight: -2 }}
              >
                <Ionicons name={themeMode === 'dark' ? 'sunny' : 'moon'} size={19} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
                style={{ marginLeft: -2 }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {profileUri ? <Image source={{ uri: profileUri }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>{initials}</Text>}
                </View>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }}
              >
                <Ionicons name="log-out-outline" size={19} color="#DC2626" />
              </Pressable>
            </View>
          ),
        }}
      >
        <Stack.Screen name="savings" options={{ title: 'Savings Collection' }} />
        <Stack.Screen name="withdrawal" options={{ title: 'Savings Withdrawal' }} />
        <Stack.Screen name="loan-collection" options={{ title: 'Loan Repayment' }} />
        <Stack.Screen name="disbursement" options={{ title: 'Loan Disbursement' }} />
        <Stack.Screen name="combined" options={{ title: 'Combined Collection' }} />
        <Stack.Screen name="register" options={{ title: 'Register Client' }} />
        <Stack.Screen name="union-groups" options={{ title: 'Unions & Groups' }} />
        <Stack.Screen name="history" options={{ title: 'My History' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="client-summary" options={{ title: 'Client Financial Summary' }} />
        <Stack.Screen name="close-account" options={{ title: 'Close Client Account' }} />
        <Stack.Screen name="passkey" options={{ title: 'Passkey Setup' }} />
      </Stack>
      <BottomNav />
    </View>
  );
}


