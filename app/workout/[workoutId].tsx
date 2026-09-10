import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GifImage from '@/components/GifImage';
import { muscleLabel, palette, radius, spacing } from '@/constants/theme';
import { completeSession, logSet, startSession } from '@/lib/db';
import { useStore } from '@/store/useStore';

interface LoggedSet {
  weight: number;
  reps: number;
}

export default function WorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const uid = useStore((s) => s.uid);
  const plan = useStore((s) => s.plan);
  const exerciseById = useStore((s) => s.exerciseById);

  const workout = useMemo(
    () => plan?.workouts.find((w) => w.workoutId === workoutId) ?? null,
    [plan, workoutId],
  );

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [logged, setLogged] = useState<Record<string, LoggedSet[]>>({});
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const totalLogged = Object.values(logged).reduce((n, arr) => n + arr.length, 0);

  /** Tworzy sesję LENIWIE — dopiero gdy pojawia się pierwsza realna seria. */
  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId;
    if (!uid || !plan || !workout) return null;
    const id = await startSession(uid, plan.id, workout.workoutId, workout.name);
    setSessionId(id);
    return id;
  }

  async function saveSet(current: { exerciseId: string }) {
    if (!uid || saving) return;
    const bw = !!exerciseById(current.exerciseId)?.bodyweight;
    const w = bw ? 0 : parseFloat(weight.replace(',', '.'));
    const r = parseInt(reps, 10);
    if (isNaN(r) || r <= 0 || (!bw && isNaN(w))) return;
    setSaving(true);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const setNumber = (logged[current.exerciseId]?.length ?? 0) + 1;
      await logSet(uid, sid, { exerciseId: current.exerciseId, setNumber, weight: w, reps: r });
      setLogged((prev) => ({
        ...prev,
        [current.exerciseId]: [...(prev[current.exerciseId] ?? []), { weight: w, reps: r }],
      }));
      setReps(''); // waga zostaje na kolejną serię
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      if (uid && sessionId) await completeSession(uid, sessionId);
      router.replace('/(tabs)');
    } catch {
      setFinishing(false);
    }
  }

  if (!workout) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Workout not found.</Text>
      </View>
    );
  }

  const total = workout.exercises.length;
  const current = workout.exercises[index];
  const exercise = exerciseById(current.exerciseId);
  const isBW = !!exercise?.bodyweight;
  const isTimed = !!exercise?.timed;
  const currentSets = logged[current.exerciseId] ?? [];
  const isLast = index === total - 1;

  function go(delta: number) {
    const ni = index + delta;
    if (ni < 0 || ni >= total) return;
    setIndex(ni);
    setWeight('');
    setReps('');
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: workout.name,
          headerRight: () => (
            <Pressable onPress={finish} hitSlop={10} disabled={finishing}>
              <Text style={styles.headerFinish}>{totalLogged > 0 ? 'Finish' : 'Exit'}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Postęp */}
          <View style={styles.progressRow}>
            {workout.exercises.map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i === index && styles.progressDotActive, i < index && styles.progressDotDone]}
              />
            ))}
          </View>
          <Text style={styles.counter}>
            Exercise {index + 1} / {total}
          </Text>

          {exercise && (
            <>
              <View style={styles.gifWrap}>
                <GifImage uri={exercise.imageUrl} accent={palette.accent} height={220} rounded={radius.lg} />
              </View>
              <Text style={styles.exName}>{exercise.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.muscleTag}>
                  <Text style={styles.muscleText}>{muscleLabel(exercise.muscleGroup)}</Text>
                </View>
                {(isBW || isTimed) && (
                  <View style={styles.modeTag}>
                    <MaterialCommunityIcons
                      name={isTimed ? 'timer-outline' : 'human-handsup'}
                      size={12}
                      color={palette.textMuted}
                    />
                    <Text style={styles.modeText}>{isTimed ? 'Timed' : 'Bodyweight'}</Text>
                  </View>
                )}
                <Text style={styles.target}>
                  Target: {current.targetSets} × {current.targetReps}
                  {current.targetRIR ? ` · RIR ${current.targetRIR}` : ''}
                </Text>
              </View>
              {!!exercise.description && <Text style={styles.desc}>{exercise.description}</Text>}
            </>
          )}

          {/* Zalogowane serie */}
          <Text style={styles.setsHeader}>
            Sets ({currentSets.length}/{current.targetSets})
          </Text>
          {currentSets.length === 0 ? (
            <Text style={styles.noSets}>Log your first set below.</Text>
          ) : (
            currentSets.map((s, i) => (
              <View key={i} style={styles.setRow}>
                <View style={styles.setNum}>
                  <Text style={styles.setNumText}>{i + 1}</Text>
                </View>
                {!isBW && (
                  <>
                    <Text style={styles.setVal}>{s.weight} kg</Text>
                    <Text style={styles.setX}>×</Text>
                  </>
                )}
                <Text style={styles.setVal}>{s.reps} {isTimed ? 's' : 'reps'}</Text>
              </View>
            ))
          )}

          {/* Wprowadzanie serii */}
          <View style={styles.inputRow}>
            {!isBW && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={palette.textFaint}
                  style={styles.input}
                />
              </View>
            )}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>{isTimed ? 'Time (sec)' : 'Reps'}</Text>
              <TextInput
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={palette.textFaint}
                style={styles.input}
              />
            </View>
            <Pressable
              onPress={() => saveSet(current)}
              disabled={saving}
              style={({ pressed }) => [styles.addBtn, saving && styles.addBtnDisabled, pressed && styles.pressed]}
            >
              {saving ? (
                <ActivityIndicator color={palette.accentDark} />
              ) : (
                <MaterialCommunityIcons name="plus" size={26} color={palette.accentDark} />
              )}
            </Pressable>
          </View>
        </ScrollView>

        {/* Dolna nawigacja */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable onPress={() => go(-1)} disabled={index === 0} style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={palette.text} />
            <Text style={styles.navText}>Previous</Text>
          </Pressable>

          {isLast ? (
            <Pressable onPress={finish} disabled={finishing} style={[styles.navBtn, styles.finishBtn]}>
              {finishing ? (
                <ActivityIndicator color={palette.accentDark} />
              ) : (
                <>
                  <MaterialCommunityIcons name="flag-checkered" size={20} color={palette.accentDark} />
                  <Text style={styles.finishText}>Finish workout</Text>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable onPress={() => go(1)} style={[styles.navBtn, styles.nextBtn]}>
              <Text style={styles.nextText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={palette.accentDark} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg },
  muted: { color: palette.textMuted },
  headerFinish: { color: palette.accent, fontWeight: '800', fontSize: 15, marginRight: spacing.md },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: palette.border },
  progressDotActive: { backgroundColor: palette.accent },
  progressDotDone: { backgroundColor: palette.accent, opacity: 0.5 },
  counter: { color: palette.textMuted, fontSize: 13, marginBottom: spacing.md },
  gifWrap: { borderRadius: radius.lg, borderWidth: 2, borderColor: palette.accent, overflow: 'hidden', marginBottom: spacing.md },
  exName: { color: palette.text, fontSize: 22, fontWeight: '900', lineHeight: 27 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  muscleTag: { backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  muscleText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  modeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  modeText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  target: { color: palette.textMuted, fontSize: 13, fontWeight: '600' },
  desc: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  setsHeader: { color: palette.text, fontSize: 15, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  noSets: { color: palette.textFaint, fontSize: 13, marginBottom: spacing.sm },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.card, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  setNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.accentDim, alignItems: 'center', justifyContent: 'center' },
  setNumText: { color: palette.accent, fontWeight: '900', fontSize: 12 },
  setVal: { color: palette.text, fontSize: 15, fontWeight: '700' },
  setX: { color: palette.textFaint, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  inputBox: { flex: 1 },
  inputLabel: { color: palette.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, color: palette.text, fontSize: 18, fontWeight: '700', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, textAlign: 'center' },
  addBtn: { width: 52, height: 48, borderRadius: radius.sm, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.border, backgroundColor: palette.surface },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: palette.card },
  navBtnDisabled: { opacity: 0.4 },
  navText: { color: palette.text, fontSize: 15, fontWeight: '700' },
  nextBtn: { backgroundColor: palette.accent },
  nextText: { color: palette.accentDark, fontSize: 15, fontWeight: '900' },
  finishBtn: { backgroundColor: palette.accent },
  finishText: { color: palette.accentDark, fontSize: 15, fontWeight: '900' },
});
