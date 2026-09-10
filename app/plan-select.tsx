import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const OPTIONS = [
  { days: 3, title: 'Full Body', subtitle: '3 days a week', desc: 'Full body every session (A / B / C). For beginners and busy people.', icon: 'weight-lifter' },
  { days: 4, title: 'Upper / Lower', subtitle: '4 days a week', desc: 'Upper and lower split. The hypertrophy gold standard.', icon: 'arm-flex' },
  { days: 6, title: 'Push / Pull / Legs', subtitle: '6 days a week', desc: 'Push / pull / legs. For advanced lifters.', icon: 'dumbbell' },
];

export default function PlanSelect() {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const switchPlan = useStore((s) => s.switchPlan);
  const [busy, setBusy] = useState<number | null>(null);
  const current = user?.trainingDaysPerWeek;

  async function choose(days: number) {
    if (busy != null) return;
    setBusy(days);
    try {
      await switchPlan(days);
      router.back();
    } catch {
      setBusy(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Change plan' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.info}>
          Changing your plan also refreshes exercises to the latest version. Your workout history stays.
        </Text>
        {OPTIONS.map((o) => {
          const active = current === o.days;
          return (
            <Pressable
              key={o.days}
              onPress={() => choose(o.days)}
              disabled={busy != null}
              style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
            >
              <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                <MaterialCommunityIcons name={o.icon as any} size={26} color={palette.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.top}>
                  <Text style={styles.title}>{o.title}</Text>
                  {active && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sub}>{o.subtitle}</Text>
                <Text style={styles.desc}>{o.desc}</Text>
              </View>
              {busy === o.days && <ActivityIndicator color={palette.accent} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  info: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.card, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  cardActive: { borderColor: palette.accent },
  pressed: { opacity: 0.8 },
  iconBox: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: palette.accentDim, alignItems: 'center', justifyContent: 'center' },
  iconBoxActive: { backgroundColor: palette.accentDim },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: palette.text, fontSize: 18, fontWeight: '800' },
  badge: { backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: palette.accent, fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  sub: { color: palette.textMuted, fontSize: 13, marginTop: 2 },
  desc: { color: palette.textFaint, fontSize: 13, marginTop: 6, lineHeight: 18 },
});
