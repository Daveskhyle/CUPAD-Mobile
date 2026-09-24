import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useThemeStore } from '../store/theme';

const items = [
  { label: 'Home', icon: 'home-outline' as const, activeIcon: 'home' as const, route: '/(tabs)' },
  { label: 'Savings', icon: 'wallet-outline' as const, activeIcon: 'wallet' as const, route: '/co/savings' },
  { label: 'Combine', icon: 'cash-outline' as const, activeIcon: 'cash' as const, route: '/co/combined' },
  { label: 'Disburse', icon: 'arrow-up-circle-outline' as const, activeIcon: 'arrow-up-circle' as const, route: '/co/disbursement' },
  { label: 'History', icon: 'time-outline' as const, activeIcon: 'time' as const, route: '/co/history' },
];

export default function BottomNav() {
  const colors = useThemeStore((s) => s.colors);
  const pathname = usePathname();

  const isActive = (route: string) => {
    if (route === '/(tabs)') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  return (
    <View style={[styles.navbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {items.map((item) => {
        const active = isActive(item.route);
        return (
          <Pressable
            key={item.route}
            onPress={() => router.replace(item.route as any)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.iconWrap, active && { backgroundColor: colors.infoBg }]}>
              <Ionicons name={active ? item.activeIcon : item.icon} size={21} color={active ? colors.primary : colors.textSecondary} />
            </View>
            <Text style={[styles.navLabel, { color: active ? colors.primary : colors.textSecondary }, active && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 70,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 4,
    elevation: 12,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 62,
  },
  iconWrap: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  navLabelActive: {
    fontWeight: '800',
  },
});
