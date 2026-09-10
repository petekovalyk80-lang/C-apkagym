import type { Timestamp } from 'firebase/firestore';

/** Ćwiczenie z katalogu `exercises` (dane referencyjne). */
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
  /** Działanie i efekty — co ćwiczenie robi / na co wpływa (nie technika). */
  effects?: string;
  imageUrl: string;
  /** Ćwiczenie z masą ciała (bez obciążenia) — bez pola ciężaru. */
  bodyweight?: boolean;
  /** Ćwiczenie mierzone czasem (np. plank) — zamiast powtórzeń wpisujemy sekundy. */
  timed?: boolean;
}

/** Pozycja ćwiczenia w treningu. */
export interface WorkoutExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string;
  /** Reps in Reserve — sugerowany zapas powtórzeń, np. "2", "1-2", "0-1". */
  targetRIR?: string;
}

/** Pojedynczy trening (Workout A/B/C…) w planie. */
export interface Workout {
  workoutId: string;
  name: string;
  order: number;
  exercises: WorkoutExercise[];
}

/** Szablon planu (`planTemplates`) — z niego instancjonujemy plan usera. */
export interface PlanTemplate {
  id: string;
  name: string;
  daysPerWeek: number;
  workouts: Workout[];
}

/** Plan użytkownika (`users/{uid}/plans/{planId}`) — edytowalna kopia szablonu. */
export interface Plan {
  id: string;
  name: string;
  daysPerWeek: number;
  workouts: Workout[];
}

/** Dokument użytkownika (`users/{uid}`). */
export interface UserDoc {
  displayName?: string;
  units: 'kg';
  trainingDaysPerWeek: number;
  activePlanId: string;
  createdAt: Timestamp;
}

/** Sesja treningowa (`users/{uid}/sessions/{sessionId}`). */
export interface SessionDoc {
  id: string;
  planId: string;
  workoutId: string;
  /** Nazwa treningu zapisana w chwili startu (żeby historia pokazała ją niezależnie od aktualnego planu). */
  workoutName?: string;
  date: Timestamp;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
}

/** Pojedyncza seria (`…/sessions/{sessionId}/sets/{setId}`). */
export interface SetEntry {
  id?: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  completedAt: Timestamp;
}
