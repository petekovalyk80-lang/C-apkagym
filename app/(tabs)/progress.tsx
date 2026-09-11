import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LineChart from '@/components/LineChart';
import { palette, radius, spacing } from '@/constants/theme';
import { fetchExerciseHistory } from '@/lib/db';
import type { Exercise, ProgressPoint } from '@/lib/types';
import { useStore } from '@/store/useStore';

const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MO[d.getMonth()]}`;
};

/** Metryka wykresu zależna od typu ćwiczenia. */
function metricOf(ex: Exercise | undefined, p: ProgressPoint): number {
  if (ex?.timed || ex?.bodyweight) return p.bestReps;
  return p.e1rm;
}
function metricMeta(ex: Exercise | undefined): { label: string; unit: string } {
  if (ex?.timed) return { label: 'Best hold', unit: 's' };
  if (ex?.bodyweight) return { label: 'Best reps', unit: 'reps' };
  return { label: 'Est. 1RM', unit: 'kg' };
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const uid = useStore((s) => s.uid);
  const exerciseById = useStore((s) => s.exerciseById);

  const [history, setHistory] = useState<Record<string, ProgressPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!uid) return;
        setLoading(true);
        const h = await fetchExerciseHistory(uid);
        if (!active) return;
        setHistory(h);
        setLoading(false);
      })();
      return () => { active = false; };
    }, [uid]),
  );

  // Ćwiczenia z historią, posortowane wg ostatniej aktywności (najświeższe pierwsze).
  const withData = useMemo(() => {
    return Object.keys(history)
      .map((id) => ({ id, pts: history[id] }))
      .filter((x) => x.pts.length > 0)
      .sort((a, b) => b.pts[b.pts.length - 1].date.toMillis() - a.pts[a.pts.length - 1].date.toMillis());
  }, [history]);

  const selected = selectedId ?? withData[0]?.id ?? null;
  const points = selected ? history[selected] ?? [] : [];
  const ex = selected ? exerciseById(selected) : undefined;
  const meta = metricMeta(ex);

  const values = points.map((p) => metricOf(ex, p));
  const labels = points.map((p) => shortDate(p.date.toMillis()));
  const current = values.length ? values[values.length - 1] : 0;
  const best = values.length ? Math.max(...values) : 0;
  const first = values.length ? values[0] : 0;
  const delta = Math.round((current - first) * 10) / 10;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Progress</Text>

      {loading ? (
        <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.xxl }} />
      ) : withData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data yet. Log a few workouts and your strength curves will show up here.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Wybór ćwiczenia */}
          <FlatList
            horizontal
            data={withData}
            keyExtractor={(x) => x.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => {
              const name = exerciseById(item.id)?.name ?? item.id;
              const active = item.id === selected;
              return (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{name}</Text>
                </Pressable>
              );
            }}
          />

          {selected && (
            <View style={styles.card}>
              <Text style={styles.exName}>{exerciseById(selected)?.name ?? selected}</Text>
              <Text style={styles.metricLabel}>{meta.label}</Text>

              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{fmt(current)}<Text style={styles.statUnit}> {meta.unit}</Text></Text>
                  <Text style={styles.statCaption}>Current</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{fmt(best)}<Text style={styles.statUnit}> {meta.unit}</Text></Text>
                  <Text style={styles.statCaption}>Best</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, delta > 0 && styles.up, delta < 0 && styles.down]}>
                    {delta > 0 ? '+' : ''}{fmt(delta)}
                  </Text>
                  <Text style={styles.statCaption}>Since start</Text>
                </View>
              </View>

              {values.length >= 2 ? (
                <LineChart values={values} labels={labels} unit={meta.unit} height={210} />
              ) : (
                <Text style={styles.single}>
                  One session logged so far — the trend line appears after your next {exerciseById(selected)?.name ?? 'session'}.
                </Text>
              )}

              <Text style={styles.footNote}>
                {points.length} session{points.length === 1 ? '' : 's'}
                {!ex?.timed && !ex?.bodyweight ? ' · est. 1RM via Epley (best set each day)' : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  empty: { paddingHorizontal: spacing.lg, marginTop: spacing.xxl },
  emptyText: { color: palette.textMuted, fontSize: 15, lineHeight: 22 },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: 200 },
  chipActive: { backgroundColor: palette.accentDim, borderColor: palette.accent },
  chipText: { color: palette.textMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: palette.accent },
  pressed: { opacity: 0.8 },
  card: { backgroundColor: palette.card, marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, marginTop: spacing.sm },
  exName: { color: palette.text, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: palette.textFaint, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
  statRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg },
  stat: { flex: 1 },
  statValue: { color: palette.text, fontSize: 22, fontWeight: '900' },
  statUnit: { color: palette.textMuted, fontSize: 13, fontWeight: '700' },
  statCaption: { color: palette.textFaint, fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  up: { color: palette.accent },
  down: { color: palette.danger },
  single: { color: palette.textMuted, fontSize: 14, lineHeight: 20, paddingVertical: spacing.lg },
  footNote: { color: palette.textFaint, fontSize: 12, marginTop: spacing.md, lineHeight: 16 },
});
