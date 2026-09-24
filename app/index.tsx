import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/auth';
import { useThemeStore } from '../src/store/theme';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuthStore();
  const colors = useThemeStore((s) => s.colors);
  const themeReady = useThemeStore((s) => s.isReady);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (isLoading || !themeReady) return;

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 14,
        bounciness: 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        delay: 180,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start();
    const timer = setTimeout(() => setFinished(true), 1950);

    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [isLoading, themeReady]);

  if (isLoading || !themeReady || !finished) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.blobTop, { backgroundColor: colors.glowBlue }]} />
        <View style={[styles.blobBottom, { backgroundColor: colors.glowPurple }]} />

        <Animated.View
          style={[
            styles.content,
            { opacity, transform: [{ translateY }, { scale }] },
          ]}
        >
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary + '22',
                shadowColor: colors.primary,
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary + '12', colors.secondary + '08']}
              style={styles.logoInner}
            >
              <Image
                source={require('../assets/cupad-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="CUPAD logo"
              />
            </LinearGradient>
          </View>

          <Text style={[styles.brand, { color: colors.text }]}>CUPAD</Text>
          <Text style={[styles.portal, { color: colors.primary }]}>STAFF PORTAL</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Empowering people. Building stronger communities.</Text>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.primary,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={[styles.status, { color: colors.textMuted }]}>Preparing your workspace</Text>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.motto, { color: colors.primary }]}>SUCCESS IS OURS</Text>
          <Text style={[styles.version, { color: colors.textMuted }]}>CUPAD Mobile</Text>
        </View>
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    width: '88%',
    maxWidth: 420,
    alignItems: 'center',
  },
  blobTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -170,
    left: -110,
    opacity: 0.75,
  },
  blobBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    bottom: -190,
    right: -120,
    opacity: 0.6,
  },
  logoWrap: {
    width: 142,
    height: 142,
    borderRadius: 40,
    borderWidth: 1,
    padding: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 112,
    height: 112,
  },
  brand: {
    marginTop: 24,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: 3,
  },
  portal: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 3.2,
  },
  subtitle: {
    marginTop: 16,
    maxWidth: 310,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  progressTrack: {
    width: 190,
    height: 5,
    marginTop: 30,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
  },
  status: {
    marginTop: 11,
    fontSize: 10,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    alignItems: 'center',
  },
  motto: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  version: {
    marginTop: 7,
    fontSize: 9,
  },
});
