import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GifImage from '@/components/GifImage';
import PlankStopwatch from '@/components/PlankStopwatch';
import RestTimer from '@/components/RestTimer';
import { muscleLabel, palette, radius, spacing } from '@/constants/theme';
import { OFF_GYM_TEMPLATE_ID, completeSession, fetchExerciseHistory, fetchTemplate, findOpenSession, logSet, startSession } from '@/lib/db';
import type { Exercise, ProgressPoint, Workout } from '@/lib/types';
import { useStore } from '@/store/useStore';

/** Parsuje górną granicę zakresu powtórzeń ("6-8" → 8, "12" → 12). */
function upperReps(reps: string): number {
  const m = reps.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return parseInt(m[2], 10);
  const n = parseInt(reps, 10);
  return isNaN(n) ? 0 : n;
}
function lowerReps(reps: string): number {
  const m = reps.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Auto-progresja „pobij poprzedni" — sugestia następnego celu na bazie ostatniej top-serii. */
function suggestNext(ex: Exercise | undefined, targetReps: string, last: ProgressPoint): string {
  if (ex?.timed) return `${last.topReps + 5} s`;
  if (ex?.bodyweight) return `${last.topReps + 1} reps`;
  const up = upperReps(targetReps);
  // Podwójna progresja: dobiłeś górę zakresu → +2.5 kg i wróć do dołu; inaczej +1 powt.
  if (up && last.topReps >= up) return `${last.topWeight + 2.5} kg × ${lowerReps(targetReps) || last.topReps}`;
  return `${last.topWeight} kg × ${last.topReps + 1}`;
}

interface LoggedSet {
  weight: number;
  reps: number;
}

/** ID ćwiczenia użytego jako opcjonalny finisher core na końcu treningu. */
const FINISHER_ID = 'plank';
const REST_SECONDS = 90;

export default function WorkoutScreen() {
  // Trzymaj ekran wybudzony przez cały trening — telefon nie usypia między seriami.
  useKeepAwake();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const uid = useStore((s) => s.uid);
  const plan = useStore((s) => s.plan);
  const exercises = useStore((s) => s.exercises);
  const exerciseById = useStore((s) => s.exerciseById);

  const isOffGym = workoutId === OFF_GYM_TEMPLATE_ID;
  const [offGymWorkout, setOffGymWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (!isOffGym) return;
    let active = true;
    (async () => {
      const tpl = await fetchTemplate(OFF_GYM_TEMPLATE_ID);
      if (active) setOffGymWorkout(tpl?.workouts?.[0] ?? null);
    })();
    return () => { active = false; };
  }, [isOffGym]);

  const workout = useMemo(
    () => (isOffGym ? offGymWorkout : plan?.workouts.find((w) => w.workoutId === workoutId) ?? null),
    [plan, workoutId, isOffGym, offGymWorkout],
  );

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [logged, setLogged] = useState<Record<string, LoggedSet[]>>({});
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** Podmiany ćwiczeń — TYLKO na dziś (indeks kroku → nowe exerciseId). */
  const [swaps, setSwaps] = useState<Record<number, string>>({});
  const [swapOpen, setSwapOpen] = useState(false);
  /** Nonce rest timera; null = ukryty. */
  const [restNonce, setRestNonce] = useState<number | null>(null);
  /** Ostatni występ każdego ćwiczenia (do „pobij poprzedni"). */
  const [lastPerf, setLastPerf] = useState<Record<string, ProgressPoint>>({});
  /** Ref ScrollView — do przewinięcia pól wejściowych nad klawiaturę. */
  const scrollRef = useRef<ScrollView>(null);
  /** Auto-wznowienie sesji odpalamy dokładnie raz. */
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    (async () => {
      const h = await fetchExerciseHistory(uid);
      if (!active) return;
      const map: Record<string, ProgressPoint> = {};
      for (const k in h) {
        const arr = h[k];
        if (arr.length) map[k] = arr[arr.length - 1];
      }
      setLastPerf(map);
    })();
    return () => { active = false; };
  }, [uid]);

  // Auto-wznowienie: jeśli apka zamknęła się w trakcie treningu, po powrocie odtwarzamy
  // dzisiejszą niezakończoną sesję (serie są już w Firestore) i lądujemy na ostatnim ćwiczeniu.
  useEffect(() => {
    if (resumedRef.current || !uid || !workout) return;
    resumedRef.current = true;
    let active = true;
    (async () => {
      const open = await findOpenSession(uid, workout.workoutId);
      if (!active || !open) return;
      const map: Record<string, LoggedSet[]> = {};
      for (const st of open.sets) {
        (map[st.exerciseId] ??= []).push({ weight: st.weight, reps: st.reps });
      }
      const total = workout.exercises.length;
      const hasFinisher = !!exerciseById(FINISHER_ID);
      const stepCount = total + (hasFinisher ? 1 : 0);
      let landing = 0;
      for (let i = 0; i < stepCount; i++) {
        const stepId = hasFinisher && i === total ? FINISHER_ID : workout.exercises[i].exerciseId;
        if (map[stepId]?.length) landing = i;
      }
      setSessionId(open.sessionId);
      setLogged(map);
      setIndex(landing);
    })();
    return () => { active = false; };
  }, [uid, workout, exerciseById]);

  const totalLogged = Object.values(logged).reduce((n, arr) => n + arr.length, 0);

  /** Tworzy sesję LENIWIE — dopiero gdy pojawia się pierwsza realna seria. */
  async function ensureSession(): Promise<string | null> {
    if (sessionId) return sessionId;
    if (!uid || !plan || !workout) return null;
    const pid = isOffGym ? OFF_GYM_TEMPLATE_ID : plan.id;
    const id = await startSession(uid, pid, workout.workoutId, workout.name, isOffGym);
    setSessionId(id);
    return id;
  }

  async function saveSet(cur: { exerciseId: string; targetSets: number; timed: boolean; bodyweight: boolean }) {
    if (!uid || saving) return;
    const w = cur.bodyweight ? 0 : parseFloat(weight.replace(',', '.'));
    const r = parseInt(reps, 10);
    if (isNaN(r) || r <= 0 || (!cur.bodyweight && isNaN(w))) return;
    setSaving(true);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const setNumber = (logged[cur.exerciseId]?.length ?? 0) + 1;
      await logSet(uid, sid, { exerciseId: cur.exerciseId, setNumber, weight: w, reps: r });
      setLogged((prev) => ({
        ...prev,
        [cur.exerciseId]: [...(prev[cur.exerciseId] ?? []), { weight: w, reps: r }],
      }));
      setReps(''); // waga zostaje na kolejną serię
      // Rest timer: start tylko jeśli to NIE ostatnia sugerowana seria i ćwiczenie nie jest „timed".
      if (!cur.timed && setNumber < cur.targetSets) setRestNonce(Date.now());
      else setRestNonce(null);
    } finally {
      setSaving(false);
    }
  }

  /** Zapis holdu ze stopera (ćwiczenia `timed`, np. plank) — reps = sekundy, brak wagi. */
  async function saveHold(exerciseId: string, seconds: number) {
    if (!uid || saving || seconds <= 0) return;
    setSaving(true);
    try {
      const sid = await ensureSession();
      if (!sid) return;
      const setNumber = (logged[exerciseId]?.length ?? 0) + 1;
      await logSet(uid, sid, { exerciseId, setNumber, weight: 0, reps: seconds });
      setLogged((prev) => ({
        ...prev,
        [exerciseId]: [...(prev[exerciseId] ?? []), { weight: 0, reps: seconds }],
      }));
    } finally {
      setSaving(false);
    }
  }

  /** Po focusie pola wejściowego przewiń na dół, by rubryki wyszły spod klawiatury. */
  function handleInputFocus() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
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
        {isOffGym ? (
          <ActivityIndicator color={palette.accent} />
        ) : (
          <Text style={styles.muted}>Workout not found.</Text>
        )}
      </View>
    );
  }

  const total = workout.exercises.length;
  const plankEx = exerciseById(FINISHER_ID);
  const hasFinisher = !!plankEx;
  const stepCount = total + (hasFinisher ? 1 : 0);
  const isFinisher = hasFinisher && index === total;
  const isLastStep = index === stepCount - 1;

  const slot = isFinisher ? null : workout.exercises[index];
  const effId = isFinisher ? FINISHER_ID : (slot ? swaps[index] ?? slot.exerciseId : FINISHER_ID);
  const exercise = exerciseById(effId);
  const isBW = !!exercise?.bodyweight;
  const isTimed = !!exercise?.timed;
  const currentSets = logged[effId] ?? [];
  const targetSets = isFinisher ? 1 : slot!.targetSets;

  const alternatives = exercise
    ? Object.values(exercises)
        .filter((e) => e.muscleGroup === exercise.muscleGroup && e.id !== exercise.id)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  function go(delta: number) {
    const ni = index + delta;
    if (ni < 0 || ni >= stepCount) return;
    setIndex(ni);
    setWeight('');
    setReps('');
    setRestNonce(null);
    setSwapOpen(false);
  }

  function applySwap(altId: string) {
    setSwaps((prev) => ({ ...prev, [index]: altId }));
    setSwapOpen(false);
    setWeight('');
    setReps('');
    setRestNonce(null);
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
      <KeyboardAvoidingView style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Postęp */}
          <View style={styles.progressRow}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === index && styles.progressDotActive,
                  i < index && styles.progressDotDone,
                  hasFinisher && i === total && styles.progressDotFinisher,
                ]}
              />
            ))}
          </View>
          <Text style={styles.counter}>
            {isFinisher ? 'Core finisher · optional' : `Exercise ${index + 1} / ${total}`}
          </Text>

          {exercise && (
            <>
              <View style={styles.gifWrap}>
                <GifImage uri={exercise.imageUrl} accent={palette.accent} height={220} rounded={radius.lg} />
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.exName}>{exercise.name}</Text>
                {!isFinisher && alternatives.length > 0 && (
                  <Pressable
                    onPress={() => setSwapOpen(true)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.swapBtn, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color={palette.accent} />
                    <Text style={styles.swapText}>Swap</Text>
                  </Pressable>
                )}
              </View>

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
                {isFinisher ? (
                  <Text style={styles.target}>Suggested: 60–120s hold</Text>
                ) : (
                  <Text style={styles.target}>
                    Target: {slot!.targetSets} × {slot!.targetReps}
                    {slot!.targetRIR ? ` · RIR ${slot!.targetRIR}` : ''}
                  </Text>
                )}
              </View>

              {isFinisher ? (
                <Text style={styles.desc}>
                  Optional core finisher — a brace to end the session. Hold as long as your form
                  stays clean, or skip it. Beginners ~30–45s, intermediate ~60s, advanced 90–120s.
                </Text>
              ) : (
                !!exercise.description && <Text style={styles.desc}>{exercise.description}</Text>
              )}
            </>
          )}

          {/* Auto-progresja: ostatni występ + sugestia „pobij poprzedni" */}
          {!isFinisher && lastPerf[effId] && (
            <View style={styles.lastRow}>
              <View style={styles.lastBox}>
                <Text style={styles.lastLabel}>Last time</Text>
                <Text style={styles.lastValue}>
                  {isBW
                    ? `${lastPerf[effId].topReps} ${isTimed ? 's' : 'reps'}`
                    : `${lastPerf[effId].topWeight} kg × ${lastPerf[effId].topReps}`}
                </Text>
                {!isBW && lastPerf[effId].e1rm > 0 && (
                  <Text style={styles.lastSub}>est. 1RM {lastPerf[effId].e1rm} kg</Text>
                )}
              </View>
              <View style={[styles.lastBox, styles.suggestBox]}>
                <Text style={[styles.lastLabel, styles.suggestLabel]}>Beat it 💪</Text>
                <Text style={[styles.lastValue, styles.suggestValue]}>
                  {suggestNext(exercise, slot ? slot.targetReps : '', lastPerf[effId])}
                </Text>
              </View>
            </View>
          )}

          {/* Zalogowane serie */}
          <Text style={styles.setsHeader}>
            {isFinisher ? `Holds (${currentSets.length})` : `Sets (${currentSets.length}/${targetSets})`}
          </Text>
          {currentSets.length === 0 ? (
            <Text style={styles.noSets}>{isFinisher ? 'Log a hold below, or skip.' : 'Log your first set below.'}</Text>
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

          {/* Wprowadzanie serii — dla „timed" (plank) stoper zamiast ręcznego czasu */}
          {isTimed ? (
            <PlankStopwatch
              onSave={(secs) => saveHold(effId, secs)}
              saving={saving}
              best={lastPerf[effId]?.topReps}
            />
          ) : (
            <View style={styles.inputRow}>
              {!isBW && (
                <View style={styles.inputBox}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    value={weight}
                    onChangeText={setWeight}
                    onFocus={handleInputFocus}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={palette.textFaint}
                    style={styles.input}
                  />
                </View>
              )}
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Reps</Text>
                <TextInput
                  value={reps}
                  onChangeText={setReps}
                  onFocus={handleInputFocus}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={palette.textFaint}
                  style={styles.input}
                />
              </View>
              <Pressable
                onPress={() => saveSet({ exerciseId: effId, targetSets, timed: isTimed, bodyweight: isBW })}
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
          )}
        </ScrollView>

        {/* Rest timer (nad stopką) */}
        {restNonce !== null && (
          <RestTimer nonce={restNonce} duration={REST_SECONDS} onDismiss={() => setRestNonce(null)} />
        )}

        {/* Dolna nawigacja */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable onPress={() => go(-1)} disabled={index === 0} style={[styles.navBtn, index === 0 && styles.navBtnDisabled]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={palette.text} />
            <Text style={styles.navText}>Previous</Text>
          </Pressable>

          {isLastStep ? (
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
              <Text style={styles.nextText}>{hasFinisher && index === total - 1 ? 'Finisher' : 'Next'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={palette.accentDark} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Swap — arkusz z alternatywami z tej samej partii (tylko na dziś) */}
      <Modal visible={swapOpen} transparent animationType="slide" onRequestClose={() => setSwapOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSwapOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Swap exercise</Text>
            <Text style={styles.sheetSub}>
              {exercise ? muscleLabel(exercise.muscleGroup) : ''} alternatives · today only
            </Text>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {alternatives.map((alt) => {
                const isCurrent = alt.id === effId;
                return (
                  <Pressable
                    key={alt.id}
                    onPress={() => applySwap(alt.id)}
                    style={({ pressed }) => [styles.altRow, pressed && styles.pressed]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.altName}>{alt.name}</Text>
                      {(alt.bodyweight || alt.timed) && (
                        <Text style={styles.altMeta}>{alt.timed ? 'Timed' : 'Bodyweight'}</Text>
                      )}
                    </View>
                    {isCurrent && <MaterialCommunityIcons name="check" size={20} color={palette.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  progressDotFinisher: { borderWidth: 1, borderColor: palette.accent, backgroundColor: 'transparent' },
  counter: { color: palette.textMuted, fontSize: 13, marginBottom: spacing.md },
  gifWrap: { borderRadius: radius.lg, borderWidth: 2, borderColor: palette.accent, overflow: 'hidden', marginBottom: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  exName: { color: palette.text, fontSize: 22, fontWeight: '900', lineHeight: 27, flex: 1 },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: 2 },
  swapText: { color: palette.accent, fontSize: 13, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  muscleTag: { backgroundColor: palette.accentDim, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  muscleText: { color: palette.accent, fontSize: 12, fontWeight: '700' },
  modeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  modeText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  target: { color: palette.textMuted, fontSize: 13, fontWeight: '600' },
  desc: { color: palette.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  lastRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  lastBox: { flex: 1, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radius.md, padding: spacing.md },
  suggestBox: { borderColor: palette.accent, backgroundColor: palette.accentDim },
  lastLabel: { color: palette.textFaint, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  suggestLabel: { color: palette.accent },
  lastValue: { color: palette.text, fontSize: 17, fontWeight: '900', marginTop: 4 },
  suggestValue: { color: palette.accent },
  lastSub: { color: palette.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
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
  // Swap sheet
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, maxHeight: '75%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border, marginBottom: spacing.md },
  sheetTitle: { color: palette.text, fontSize: 18, fontWeight: '900' },
  sheetSub: { color: palette.textMuted, fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: spacing.md },
  sheetList: { flexGrow: 0 },
  altRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.card, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  altName: { color: palette.text, fontSize: 15, fontWeight: '700' },
  altMeta: { color: palette.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
});
