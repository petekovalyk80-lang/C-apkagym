import { create } from 'zustand';

import {
  changePlan,
  fetchExercises,
  getActivePlan,
  getUserDoc,
  setupUserPlan,
} from '@/lib/db';
import {
  auth,
  createAccountEmail,
  currentAuthInfo,
  signInEmail,
  signOutUser,
  startGuest,
} from '@/lib/firebase';
import type { Exercise, Plan, UserDoc } from '@/lib/types';

interface AppState {
  ready: boolean;
  error: string | null;
  /** Czy jest zalogowany JAKIKOLWIEK użytkownik (gość lub konto). */
  authed: boolean;
  /** Gość (anonimowy) vs konto email. */
  isAnonymous: boolean;
  email: string | null;
  uid: string | null;
  user: UserDoc | null;
  plan: Plan | null;
  exercises: Record<string, Exercise>;

  bootstrap: () => Promise<void>;
  loadForCurrentUser: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: (daysPerWeek: number) => Promise<void>;
  switchPlan: (daysPerWeek: number) => Promise<void>;
  exerciseById: (id: string) => Exercise | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  authed: false,
  isAnonymous: false,
  email: null,
  uid: null,
  user: null,
  plan: null,
  exercises: {},

  /**
   * Start apki: czeka na trwałą sesję. Gdy NIKT nie jest zalogowany → `authed:false`
   * (pokaże się ekran powitalny). Nie tworzymy już automatycznie gościa — użytkownik
   * świadomie wybiera „Continue as guest" / logowanie.
   */
  bootstrap: async () => {
    try {
      await auth.authStateReady();
      if (!auth.currentUser) {
        set({ authed: false, ready: true, error: null, uid: null, user: null, plan: null });
        return;
      }
      await get().loadForCurrentUser();
      set({ ready: true, error: null });
    } catch (e: any) {
      set({ ready: true, error: e?.message ?? 'Błąd inicjalizacji' });
    }
  },

  /** Ładuje katalog + usera + plan dla AKTUALNIE zalogowanego uid. */
  loadForCurrentUser: async () => {
    const info = currentAuthInfo();
    if (!info.uid) {
      set({ authed: false, uid: null, user: null, plan: null });
      return;
    }
    const [exList, user] = await Promise.all([fetchExercises(), getUserDoc(info.uid)]);
    const exercises = Object.fromEntries(exList.map((e) => [e.id, e]));
    const plan = user ? await getActivePlan(info.uid, user.activePlanId) : null;
    set({
      authed: true,
      isAnonymous: info.isAnonymous,
      email: info.email,
      uid: info.uid,
      user,
      plan,
      exercises,
    });
  },

  /** „Continue as guest" — rozpoczyna sesję anonimową i ładuje stan. */
  continueAsGuest: async () => {
    await startGuest();
    await get().loadForCurrentUser();
  },

  /** Logowanie istniejącym kontem → przełącza uid i ładuje jego dane. */
  signIn: async (email: string, password: string) => {
    await signInEmail(email, password);
    await get().loadForCurrentUser();
  },

  /** Tworzy konto: dla gościa PODPINA (link) → te same dane; inaczej świeże konto. */
  createAccount: async (email: string, password: string) => {
    await createAccountEmail(email, password);
    await get().loadForCurrentUser();
  },

  /** Wylogowanie → brak użytkownika (ekran powitalny). */
  signOut: async () => {
    await signOutUser();
    set({ authed: false, isAnonymous: false, email: null, uid: null, user: null, plan: null });
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
