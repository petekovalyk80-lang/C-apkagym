import { create } from 'zustand';

import {
  changePlan,
  fetchExercises,
  getActivePlan,
  getUserDoc,
  setupUserPlan,
} from '@/lib/db';
import { ensureAnonymousAuth } from '@/lib/firebase';
import type { Exercise, Plan, UserDoc } from '@/lib/types';

interface AppState {
  ready: boolean;
  error: string | null;
  uid: string | null;
  user: UserDoc | null;
  plan: Plan | null;
  exercises: Record<string, Exercise>;

  bootstrap: () => Promise<void>;
  completeOnboarding: (daysPerWeek: number) => Promise<void>;
  switchPlan: (daysPerWeek: number) => Promise<void>;
  exerciseById: (id: string) => Exercise | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  uid: null,
  user: null,
  plan: null,
  exercises: {},

  /** Uruchamiane raz przy starcie apki: auth → katalog → user → aktywny plan. */
  bootstrap: async () => {
    try {
      const uid = await ensureAnonymousAuth();
      const [exList, user] = await Promise.all([fetchExercises(), getUserDoc(uid)]);
      const exercises = Object.fromEntries(exList.map((e) => [e.id, e]));
      const plan = user ? await getActivePlan(uid, user.activePlanId) : null;
      set({ uid, user, plan, exercises, ready: true, error: null });
    } catch (e: any) {
      set({ ready: true, error: e?.message ?? 'Błąd inicjalizacji' });
    }
  },

  /** Finalizacja onboardingu: instancjonuje plan i odświeża stan. */
  completeOnboarding: async (daysPerWeek: number) => {
    const uid = get().uid;
    if (!uid) throw new Error('Brak uid');
    const plan = await setupUserPlan(uid, daysPerWeek);
    const user = await getUserDoc(uid);
    set({ plan, user });
  },

  /** Zmiana planu (liczby dni) po onboardingu — odświeża też do najnowszego szablonu. */
  switchPlan: async (daysPerWeek: number) => {
    const uid = get().uid;
    if (!uid) throw new Error('Brak uid');
    const plan = await changePlan(uid, daysPerWeek);
    const user = await getUserDoc(uid);
    set({ plan, user });
  },

  exerciseById: (id: string) => get().exercises[id],
}));
