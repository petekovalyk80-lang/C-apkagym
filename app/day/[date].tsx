import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { fetchSessions, fetchSessionSets } from '@/lib/db';
import type { SetEntry } from '@/lib/types';
import { useStore } from '@/store/useStore';

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DaySession {
  id: string;
  workoutName: string;
  offGym: boolean;
  groups: { exerciseId: string; sets: SetEntry[] }[];
}

export default function DayDetail() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const uid = useStore((s) => s.uid);
  const plan = useStore((s) => s.plan);
  const exerciseById = useStore((s) => s.exerciseById);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DaySession[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!uid || !date) return;
      const all = await fetchSessions(uid);
      const dayS = all.filter((s) => {
        if (!s.date?.toDate) return false;
        const d = s.date.toDate();
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === date;
      });
      const built: DaySession[] = [];
      for (const s of dayS) {
        const sets = await fetchSessionSets(uid, s.id);
        const order: string[] = [];
        const byEx = new Map<string, SetEntry[]>();
        for (const set of sets) {
          if (!byEx.has(set.exerciseId)) { byEx.set(set.exerciseId, []); order.push(set.exerciseId); }
          byEx.get(set.exerciseId)!.push(set);
        }
        const wName = s.workoutName ?? plan?.workouts.find((w) => w.workoutId === s.workoutId)?.name ?? s.workoutId;
        built.push({ id: s.id, workoutName: wName, offGym: !!s.offGym, groups: order.map((id) => ({ exerciseId: id, sets: byEx.get(id)! })) });
      }
      if (active) { setItems(built); setLoading(false); }
    })();
    return () => { active = false; };
  }, [uid, date, plan]);

  // Nagłówek daty
  let heading = date ?? '';
  if (date) {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    heading = `${WD[dt.getDay()]}, ${d} ${MO[m - 1]}`;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Day details' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.heading}>{heading}</Text>

        {loading ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.xl }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No sets logged this day.</Text>
        ) : (
          items.map((s) => (
            <View key={s.id} style={styles.session}>
              <View style={styles.sessionHead}>
                <Text style={[styles.workoutName, s.offGym && styles.workoutNameOffgym]}>{s.workoutName}</Text>
                {s.offGym && (
                  <View style={styles.offgymTag}>
                    <Text style={styles.offgymTagText}>OFF GYM</Text>
                  </View>
                )}
              </View>
              {s.groups.map((g) => {
                const ex = exerciseById(g.exerciseId);
                const timed = !!ex?.timed;
                const bw = !!ex?.bodyweight;
                return (
                  <View key={g.exerciseId} style={styles.exercise}>
                    <Text style={styles.exName}>{ex?.name ?? g.exerciseId}</Text>
                    {g.sets.map((set, i) => (
                      <View key={i} style={styles.setRow}>
                        <View style={styles.setNum}><Text style={styles.setNumText}>{i + 1}</Text></View>
                        <Text style={styles.setVal}>
                          {timed ? `${set.reps} s` : bw ? `${set.reps} reps` : `${set.weight} kg × ${set.reps} reps`}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  heading: { color: palette.text, fontSize: 20, fontWeight: '900', textTransform: 'capitalize', marginBottom: spacing.lg },
  empty: { color: palette.textMuted, marginTop: spacing.lg },
  session: { marginBottom: spacing.xl },
  sessionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  workoutName: { color: palette.accent, fontSize: 17, fontWeight: '900' },
  workoutNameOffgym: { color: palette.offgym },
  offgymTag: { backgroundColor: palette.offgymDim, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  offgymTagText: { color: palette.offgym, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  exercise: { backgroundColor: palette.card, borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, padding: spacing.md, marginBottom: spacing.sm },
  exName: { color: palette.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  setNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.accentDim, alignItems: 'center', justifyContent: 'center' },
  setNumText: { color: palette.accent, fontWeight: '900', fontSize: 11 },
  setVal: { color: palette.text, fontSize: 14, fontWeight: '600' },
});
