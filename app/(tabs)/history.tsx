import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing } from '@/constants/theme';
import { fetchSessions } from '@/lib/db';
import type { SessionDoc } from '@/lib/types';
import { useStore } from '@/store/useStore';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const uid = useStore((s) => s.uid);

  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!uid) return;
        const s = await fetchSessions(uid);
        if (active) setSessions(s);
      })();
      return () => { active = false; };
    }, [uid]),
  );

  // Dni z treningiem: dateStr → { gym, offgym }. Dzień z jakąkolwiek sesją siłową = zielony;
  // dzień wyłącznie Off Gym = turkusowy.
  const workoutDays = useMemo(() => {
    const map = new Map<string, { gym: boolean; offgym: boolean }>();
    for (const s of sessions) {
      if (!s.date?.toDate) continue;
      const key = dateStr(s.date.toDate());
      const cur = map.get(key) ?? { gym: false, offgym: false };
      if (s.offGym) cur.offgym = true;
      else cur.gym = true;
      map.set(key, cur);
    }
    return map;
  }, [sessions]);

  // Siatka dni miesiąca (poniedziałek pierwszy)
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // Pn=0
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (number | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [cursor]);

  function shift(delta: number) {
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  const todayStr = dateStr(today);
  const totalThisMonth = [...workoutDays.keys()].filter((k) => k.startsWith(`${cursor.y}-${pad(cursor.m + 1)}`)).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>History</Text>

      {/* Nawigacja miesiąca */}
      <View style={styles.monthRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} style={styles.arrow}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={palette.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{MONTHS[cursor.m]} {cursor.y}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} style={styles.arrow}>
          <MaterialCommunityIcons name="chevron-right" size={26} color={palette.text} />
        </Pressable>
      </View>

      {/* Nagłówki dni tygodnia */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      {/* Siatka */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day == null) return <View key={i} style={styles.cell} />;
          const ds = `${cursor.y}-${pad(cursor.m + 1)}-${pad(day)}`;
          const info = workoutDays.get(ds);
          const has = !!info;
          const offgymOnly = !!info && info.offgym && !info.gym;
          const isToday = ds === todayStr;
          return (
            <Pressable
              key={i}
              style={styles.cell}
              disabled={!has}
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: ds } })}
            >
              <View style={[styles.dayInner, info?.gym && styles.dayDone, offgymOnly && styles.dayOffgym, isToday && !has && styles.dayToday]}>
                <Text style={[styles.dayText, has && (offgymOnly ? styles.dayTextOffgym : styles.dayTextDone)]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendKey}>Gym</Text>
        <View style={styles.legendDotOffgym} />
        <Text style={styles.legendKey}>Off Gym</Text>
      </View>
      <Text style={styles.legendText}>
        {totalThisMonth > 0 ? `${totalThisMonth} training day${totalThisMonth === 1 ? '' : 's'} this month — tap a day to see details` : 'No training days this month'}
      </Text>
    </View>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  arrow: { padding: spacing.xs },
  monthLabel: { color: palette.text, fontSize: 18, fontWeight: '800' },
  weekRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  weekday: { width: CELL as any, textAlign: 'center', color: palette.textFaint, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm, marginTop: spacing.xs },
  cell: { width: CELL as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  dayInner: { width: '100%', aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: palette.accent },
  dayOffgym: { backgroundColor: palette.offgym },
  dayToday: { borderWidth: 1.5, borderColor: palette.border },
  dayText: { color: palette.textMuted, fontSize: 15, fontWeight: '700' },
  dayTextDone: { color: palette.accentDark, fontWeight: '900' },
  dayTextOffgym: { color: palette.offgymDark, fontWeight: '900' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  legendDot: { width: 14, height: 14, borderRadius: 4, backgroundColor: palette.accent },
  legendDotOffgym: { width: 14, height: 14, borderRadius: 4, backgroundColor: palette.offgym, marginLeft: spacing.md },
  legendKey: { color: palette.textMuted, fontSize: 13, fontWeight: '700' },
  legendText: { color: palette.textMuted, fontSize: 13, lineHeight: 18, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
