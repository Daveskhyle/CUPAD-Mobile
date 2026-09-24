import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RADIUS, SPACING } from '../constants/config';

type StatItem = {
  title: string;
  value: string;
  icon: string;
  colors: [string, string];
};

type Props = { items: StatItem[] };

const CARD_GAP = 10;

export default function StatsCarousel({ items }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.max(0, screenWidth - SPACING.md * 3);
  const snapInterval = cardWidth + CARD_GAP;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={snapInterval}
        disableIntervalMomentum
      >
        {items.map((item, index) => (
          <LinearGradient
            key={`${item.title}-${index}`}
            colors={item.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { width: cardWidth, marginRight: index === items.length - 1 ? 0 : CARD_GAP }]}
          >
            <View style={styles.topRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon as any} size={19} color="#fff" />
              </View>
              <Text style={styles.index}>{index + 1}/{items.length}</Text>
            </View>
            <View style={styles.statBody}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{item.value}</Text>
            </View>
            <View style={styles.bottomRow}>
              <View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.max(12, ((index + 1) / items.length) * 100)}%` }]} /></View>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, index) => <View key={`${item.title}-dot-${index}`} style={[styles.dot, index === 0 && styles.activeDot]} />)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  content: { paddingHorizontal: SPACING.md },
  card: {
    minHeight: 124,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 13,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBody: { flex: 1, justifyContent: 'center', minWidth: 0 },
  index: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '800' },
  title: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '700', marginTop: 7 },
  value: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progress: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 7 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  activeDot: { width: 14, backgroundColor: '#64748B' },
});
