import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GifImage from '@/components/GifImage';
import { palette, radius, spacing } from '@/constants/theme';
import { OFF_GYM_TEMPLATE_ID, computeNextWorkout, getLastGymSession } from '@/lib/db';
import { guestDaysLeft } from '@/lib/trial';
import type { SessionDoc, Workout } from '@/lib/types';
import { useStore } from '@/store/useStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const plan = useStore((s) => s.plan);
  const uid = useStore((s) => s.uid);
  const authed = useStore((s) => s.authed);
  const isAnonymous = useStore((s) => s.isAnonymous);
  const exercises = useStore((s) => s.exercises);

  const [next, setNext] = useState<Workout | null>(null);
  const [last, setLast] = useState<SessionDoc | null>(null);
  // Trening pokazany w górnej karcie: null = domyślnie następny; ustawiany klikiem w liście.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSelectedId(null); // po powrocie na home wracamy do „następnego"
      (async () => {
        if (!uid || !plan) return;
        const lastSession = await getLastGymSession(uid);
        if (!active) return;
        setLast(lastSession);
        setNext(computeNextWorkout(plan, lastSession?.workoutId ?? null));
      })();
      return () => {
        active = false;
      };
    }, [uid, plan]),
  );

  // Nikt nie zalogowany → ekran powitalny
  if (!authed) {
    return <Redirect href="/welcome" />;
  }
  // Brak planu → onboarding
  if (!user || !plan) {
    return <Redirect href="/onboarding" />;
  }
  // Gość po 14 dniach → ściana konta
  const daysLeft = guestDaysLeft(user.createdAt);
  if (isAnonymous && daysLeft <= 0) {
    return <Redirect href="/upgrade" />;
  }

  const workouts = [...plan.workouts].sort((a, b) => a.order - b.order);
  // Karta pokazuje wybrany trening (domyślnie następny)
  const selected = (selectedId && workouts.find((w) => w.workoutId === selectedId)) || next;
  const isNextSelected = !selectedId || selectedId === next?.workoutId;

  function pick(workoutId: string) {
    setSelectedId(workoutId);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Nagłówek */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="anvil" size={24} color={palette.accent} />
        <Text style={styles.brand}>ANVIL</Text>
        <Text style={styles.byline}>by PeteKovSoftware</Text>
      </View>

      {isAnonymous && (
        <Pressable onPress={() => router.push({ pathname: '/auth', params: { mode: 'create' } })} style={({ pressed }) => [styles.trialBanner, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={palette.accent} />
          <Text style={styles.trialText}>Guest · {daysLeft} day{daysLeft === 1 ? '' : 's'} left</Text>
          <Text style={styles.trialCta}>Create account</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={palette.accent} />
        </Pressable>
      )}

      {/* Karta wybranego treningu (domyślnie następny) */}
      <Text style={styles.sectionLabel}>{isNextSelected ? 'NEXT WORKOUT' : 'WORKOUT PREVIEW'}</Text>
      {selected && (
        <View style={styles.nextCard}>
          <View style={styles.nextTop}>
            <Text style={styles.nextName}>{selected.name}</Text>
            <View style={styles.countPill}>
              <MaterialCommunityIcons name="dumbbell" size={13} color={palette.accent} />
              <Text style={styles.countText}>{selected.exercises.length} exercises</Text>
            </View>
          </View>
          <Text style={styles.nextExercises} numberOfLines={2}>
            {selected.exercises
              .map((e) => exercises[e.exerciseId]?.name ?? e.exerciseId)
              .join(' · ')}
          </Text>

          {/* Pasek GIF-ów exercises — przewijalny palcem */}
          <FlatList
            horizontal
            data={selected.exercises}
            keyExtractor={(e) => `${e.exerciseId}-${e.order}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gifStrip}
            renderItem={({ item }) => {
              const ex = exercises[item.exerciseId];
              if (!ex) return null;
              return (
                <Pressable
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}
                  style={({ pressed }) => [styles.gifCard, pressed && styles.pressed]}
                >
                  <View style={styles.gifBox}>
                    <GifImage uri={ex.imageUrl} accent={palette.accent} height={118} rounded={radius.sm} />
                  </View>
                  <Text style={styles.gifName} numberOfLines={2}>{ex.name}</Text>
                </Pressable>
              );
            }}
          />

          <Pressable
            onPress={() => router.push({ pathname: '/workout/[workoutId]', params: { workoutId: selected.workoutId } })}
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="play" size={20} color={palette.accentDark} />
            <Text style={styles.startText}>Start workout</Text>
          </Pressable>
        </View>
      )}

      {/* Cały plan */}
      <View style={styles.planHeader}>
        <Text style={styles.sectionLabel}>YOUR PLAN · {plan.name}</Text>
        <Pressable onPress={() => router.push('/plan-select')} style={styles.changeBtn} hitSlop={8}>
          <MaterialCommunityIcons name="tune-variant" size={14} color={palette.accent} />
          <Text style={styles.changeText}>Change</Text>
        </Pressable>
      </View>
      {workouts.map((w) => {
        const isNext = w.workoutId === next?.workoutId;
        const isSelected = w.workoutId === selected?.workoutId;
        return (
          <Pressable
            key={w.workoutId}
            onPress={() => pick(w.workoutId)}
            style={({ pressed }) => [styles.row, isSelected && styles.rowNext, pressed && styles.pressed]}
          >
            <View style={[styles.rowBadge, isSelected && styles.rowBadgeNext]}>
              <Text style={[styles.rowBadgeText, isSelected && styles.rowBadgeTextNext]}>{w.order + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{w.name}</Text>
              <Text style={styles.rowMeta}>{w.exercises.length} exercises</Text>
            </View>
            <Text style={styles.nextTag}>CHECK IT</Text>
            <MaterialCommunityIcons
              name={isSelected ? 'chevron-up' : 'chevron-right'}
              size={22}
              color={isSelected ? palette.accent : palette.textFaint}
            />
          </Pressable>
        );
      })}

      {/* Off Gym — trening bez siłowni (sama masa ciała) */}
      <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>NO GYM? NO PROBLEM</Text>
      <Pressable
        onPress={() => router.push({ pathname: '/workout/[workoutId]', params: { workoutId: OFF_GYM_TEMPLATE_ID } })}
        style={({ pressed }) => [styles.offgymCard, pressed && styles.pressed]}
      >
        <View style={styles.offgymIcon}>
          <MaterialCommunityIcons name="home-variant" size={22} color={palette.offgym} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.offgymTitle}>Off Gym · Bodyweight</Text>
          <Text style={styles.offgymSub}>
            Bootcamp circuit, zero equipment — for travel or rest days. Logged in history, keeps your plan rotation intact.
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={palette.offgym} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  brand: { color: palette.text, fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  byline: { color: palette.textFaint, fontSize: 11, fontWeight: '600', alignSelf: 'flex-end', marginBottom: 2, marginLeft: -2 },
  sectionLabel: { color: palette.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 1, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  trialBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: palette.accent, backgroundColor: palette.accentDim },
  trialText: { color: palette.text, fontSize: 13, fontWeight: '700', flex: 1 },
  trialCta: { color: palette.accent, fontSize: 13, fontWeight: '900' },
  nextCard: {
    backgroundColor: palette.card,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.accent,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  nextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextName: { color: palette.text, fontSize: 24, fontWeight: '900' },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  nextExercises: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  gifStrip: { paddingTop: spacing.md, paddingBottom: spacing.xs, paddingRight: spacing.xs },
  gifCard: { width: 128, maxWidth: 128, minWidth: 0, marginRight: spacing.sm, overflow: 'hidden' },
  gifBox: { borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  gifName: { color: palette.text, fontSize: 12, fontWeight: '700', marginTop: spacing.xs, lineHeight: 16, minHeight: 32 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: palette.accent, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.lg,
  },
  startText: { color: palette.accentDark, fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.8 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: spacing.lg, marginBottom: spacing.sm },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  changeText: { color: palette.accent, fontWeight: '800', fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.card, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: palette.border, padding: spacing.md,
  },
  rowNext: { borderColor: palette.accent },
  rowBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  rowBadgeNext: { backgroundColor: palette.accentDim },
  rowBadgeText: { color: palette.textMuted, fontWeight: '900' },
  rowBadgeTextNext: { color: palette.accent },
  rowName: { color: palette.text, fontSize: 16, fontWeight: '700' },
  rowMeta: { color: palette.textMuted, fontSize: 12, marginTop: 2 },
  nextTag: { color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  offgymCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.card, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: palette.offgym, padding: spacing.md,
  },
  offgymIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.offgymDim, alignItems: 'center', justifyContent: 'center' },
  offgymTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  offgymSub: { color: palette.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
