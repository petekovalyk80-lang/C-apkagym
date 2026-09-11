import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type {
  Exercise,
  Plan,
  PlanTemplate,
  ProgressPoint,
  SessionDoc,
  SetEntry,
  UserDoc,
  Workout,
} from '@/lib/types';

// ── Dane referencyjne ─────────────────────────────────────────────────

/** Pobiera cały katalog ćwiczeń. */
export async function fetchExercises(): Promise<Exercise[]> {
  const snap = await getDocs(collection(db, 'exercises'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Exercise, 'id'>) }));
}

/** Pobiera wszystkie szablony planów. */
export async function fetchTemplates(): Promise<PlanTemplate[]> {
  const snap = await getDocs(collection(db, 'planTemplates'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PlanTemplate, 'id'>) }));
}

/** Pobiera jeden szablon planu po ID. */
export async function fetchTemplate(templateId: string): Promise<PlanTemplate | null> {
  const ref = doc(db, 'planTemplates', templateId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<PlanTemplate, 'id'>) }) : null;
}

/** Mapowanie liczby dni treningowych → ID szablonu. */
export const templateIdForDays: Record<number, string> = {
  3: 'full-body-3day',
  4: 'upper-lower-4day',
  6: 'ppl-6day',
};

/** Szablon Off Gym (bootcamp, sama masa ciała) — pobierany na żądanie, poza rotacją planu. */
export const OFF_GYM_TEMPLATE_ID = 'off-gym-bootcamp';

// ── Użytkownik + onboarding ───────────────────────────────────────────

/** Pobiera dokument użytkownika (lub null, jeśli jeszcze nie ma). */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

/**
 * Instancjonuje szablon do `users/{uid}/plans/{planId}` (edytowalna kopia).
 * Nadpisuje kopię aktualną treścią szablonu — dlatego użyj też przy zmianie
 * planu, by odświeżyć starą kopię do najnowszej wersji. Szablon nietknięty.
 */
async function instantiatePlan(uid: string, daysPerWeek: number): Promise<Plan> {
  const templateId = templateIdForDays[daysPerWeek];
  const template = await fetchTemplate(templateId);
  if (!template) throw new Error(`Brak szablonu dla ${daysPerWeek} dni (${templateId})`);

  const plan: Plan = {
    id: template.id,
    name: template.name,
    daysPerWeek: template.daysPerWeek,
    workouts: template.workouts,
  };
  await setDoc(doc(db, 'users', uid, 'plans', plan.id), {
    name: plan.name,
    daysPerWeek: plan.daysPerWeek,
    workouts: plan.workouts,
  });
  return plan;
}

/** Onboarding: instancjonuje plan i tworzy dokument użytkownika. */
export async function setupUserPlan(uid: string, daysPerWeek: number): Promise<Plan> {
  const plan = await instantiatePlan(uid, daysPerWeek);
  await setDoc(doc(db, 'users', uid), {
    units: 'kg',
    trainingDaysPerWeek: daysPerWeek,
    activePlanId: plan.id,
    createdAt: Timestamp.now(),
  });
  return plan;
}

/** Zmiana planu po onboardingu: nowa/odświeżona kopia + aktualizacja usera (bez resetu createdAt). */
export async function changePlan(uid: string, daysPerWeek: number): Promise<Plan> {
  const plan = await instantiatePlan(uid, daysPerWeek);
  await updateDoc(doc(db, 'users', uid), {
    trainingDaysPerWeek: daysPerWeek,
    activePlanId: plan.id,
  });
  return plan;
}

/** Pobiera aktywny plan użytkownika. */
export async function getActivePlan(uid: string, activePlanId: string): Promise<Plan | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'plans', activePlanId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Plan, 'id'>) }) : null;
}

// ── Rotacja treningów ─────────────────────────────────────────────────

/** Ostatnia sesja użytkownika (do wyliczenia następnego treningu). */
export async function getLastSession(uid: string): Promise<SessionDoc | null> {
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    orderBy('startedAt', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) };
}

/**
 * Ostatnia sesja SIŁOWA (pomija Off Gym) — do rotacji planu. Off Gym nie może
 * przestawiać kolejki treningów siłowych, więc szukamy ostatniej sesji `!offGym`.
 */
export async function getLastGymSession(uid: string): Promise<SessionDoc | null> {
  const q = query(
    collection(db, 'users', uid, 'sessions'),
    orderBy('startedAt', 'desc'),
    limit(20),
  );
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const s = { id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) };
    if (!s.offGym) return s;
  }
  return null;
}

/**
 * Następny trening w rotacji: po workoutId ostatniej sesji bierze kolejny wg
 * `order` (po ostatnim → wraca do pierwszego). Bez historii → pierwszy trening.
 */
export function computeNextWorkout(plan: Plan, lastWorkoutId: string | null): Workout {
  const sorted = [...plan.workouts].sort((a, b) => a.order - b.order);
  if (!lastWorkoutId) return sorted[0];
  const idx = sorted.findIndex((w) => w.workoutId === lastWorkoutId);
  if (idx === -1) return sorted[0];
  return sorted[(idx + 1) % sorted.length];
}

// ── Sesje i serie ─────────────────────────────────────────────────────

/**
 * Tworzy sesję ostemplowaną REALNĄ datą urządzenia (nie serwerową) —
 * dzięki temu „ćwiczę we wtorek" nie rozjedzie się z wyświetlanym dniem.
 */
export async function startSession(
  uid: string,
  planId: string,
  workoutId: string,
  workoutName: string,
  offGym = false,
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, 'users', uid, 'sessions'), {
    planId,
    workoutId,
    workoutName,
    date: now,
    startedAt: now,
    completedAt: null,
    offGym,
  });
  return ref.id;
}

/** Loguje jedną serię (weight + reps) w sesji. */
export async function logSet(
  uid: string,
  sessionId: string,
  entry: Omit<SetEntry, 'id' | 'completedAt'>,
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'sessions', sessionId, 'sets'), {
    ...entry,
    completedAt: Timestamp.now(),
  });
}

/** Oznacza sesję jako zakończoną. */
export async function completeSession(uid: string, sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), {
    completedAt: Timestamp.now(),
  });
}

/** Wszystkie sesje użytkownika (do kalendarza historii), od najnowszej. */
export async function fetchSessions(uid: string): Promise<SessionDoc[]> {
  const q = query(collection(db, 'users', uid, 'sessions'), orderBy('startedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }));
}

/** Serie zapisane w danej sesji (do rozpiski dnia), w kolejności logowania. */
export async function fetchSessionSets(uid: string, sessionId: string): Promise<SetEntry[]> {
  const q = query(
    collection(db, 'users', uid, 'sessions', sessionId, 'sets'),
    orderBy('completedAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SetEntry, 'id'>) }));
}

// ── Progres (wykresy) ─────────────────────────────────────────────────

const epley = (weight: number, reps: number) => (weight > 0 ? weight * (1 + reps / 30) : 0);

/**
 * Historia progresu per ćwiczenie, zagregowana KLIENTOWO (bez collectionGroup /
 * indeksów): dla każdej sesji bierze jej serie i sprowadza do jednego punktu na
 * ćwiczenie (najlepsze wartości tego dnia). Zwraca serie posortowane rosnąco po dacie.
 */
export async function fetchExerciseHistory(uid: string): Promise<Record<string, ProgressPoint[]>> {
  const sessions = await fetchSessions(uid);
  const perSession = await Promise.all(
    sessions.map((s) => fetchSessionSets(uid, s.id).then((sets) => ({ s, sets }))),
  );

  const result: Record<string, ProgressPoint[]> = {};
  for (const { s, sets } of perSession) {
    if (!s.date) continue;
    const byEx = new Map<string, SetEntry[]>();
    for (const set of sets) {
      if (!byEx.has(set.exerciseId)) byEx.set(set.exerciseId, []);
      byEx.get(set.exerciseId)!.push(set);
    }
    for (const [exId, exSets] of byEx) {
      let e1rm = 0;
      let bestWeight = 0;
      let bestReps = 0;
      for (const st of exSets) {
        e1rm = Math.max(e1rm, epley(st.weight, st.reps));
        bestWeight = Math.max(bestWeight, st.weight);
        bestReps = Math.max(bestReps, st.reps);
      }
      (result[exId] ??= []).push({
        date: s.date,
        e1rm: Math.round(e1rm * 10) / 10,
        bestWeight,
        bestReps,
      });
    }
  }
  for (const k in result) result[k].sort((a, b) => a.date.toMillis() - b.date.toMillis());
  return result;
}
