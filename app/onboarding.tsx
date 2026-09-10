import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

interface Option {
  days: number;
  title: string;
  subtitle: string;
  desc: string;
  icon: string;
}

const OPTIONS: Option[] = [
  { days: 3, title: 'Full Body', subtitle: '3 days a week', desc: 'Full body every session (A / B / C).', icon: 'weight-lifter' },
  { days: 4, title: 'Upper / Lower', subtitle: '4 days a week', desc: 'Upper and lower body split.', icon: 'arm-flex' },
  { days: 6, title: 'Push / Pull / Legs', subtitle: '6 days a week', desc: 'Push / pull / legs — for advanced lifters.', icon: 'dumbbell' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [busy, setBusy] = useState<number | null>(null);

  async function choose(days: number) {
    if (busy != null) return;
    setBusy(days);
    try {
      await completeOnboarding(days);
      router.replace('/(tabs)');
    } catch (e) {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xxl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={styles.logoRow}>
        <MaterialCommunityIcons name="anvil" size={30} color={palette.accent} />
        <Text style={styles.brand}>ANVIL</Text>
      </View>
      <Text style={styles.title}>How many days a week do you train?</Text>
      <Text style={styles.subtitle}>
        We'll pick your plan. No fixed weekdays — you decide when you hit the gym.
      </Text>

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.days}
            onPress={() => choose(o.days)}
            disabled={busy != null}
            style={({ pressed }) => [styles.card, pressed && styles.pressed, busy === o.days && styles.cardActive]}
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={o.icon as any} size={26} color={palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <View style={styles.daysPill}>
                  <Text style={styles.daysText}>{o.days}×</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>{o.subtitle}</Text>
              <Text style={styles.cardDesc}>{o.desc}</Text>
            </View>
            {busy === o.days && <ActivityIndicator color={palette.accent} />}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  brand: { color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  title: { color: palette.text, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.8 },
  cardActive: { borderColor: palette.accent },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: palette.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: palette.text, fontSize: 18, fontWeight: '800' },
  daysPill: {
    backgroundColor: palette.accentDim,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  daysText: { color: palette.accent, fontWeight: '900', fontSize: 12 },
  cardSub: { color: palette.textMuted, fontSize: 13, marginTop: 2 },
  cardDesc: { color: palette.textFaint, fontSize: 13, marginTop: 6, lineHeight: 18 },
});
