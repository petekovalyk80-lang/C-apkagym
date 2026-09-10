import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import {
  getAuth,
  initializeAuth,
  signInAnonymously,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

/**
 * `getReactNativePersistence` istnieje tylko w buildzie React Native firebase/auth
 * (Metro rozwiązuje wariant `rn`); domyślne typy go nie zawierają, więc sięgamy
 * po niego z zachowaniem typów przez rzutowanie namespace'u.
 */
const getReactNativePersistence = (
  fbAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

/**
 * UWAGA: To NIE jest sekret. Firebase web/JS config (apiKey, appId itd.) to
 * publiczne identyfikatory klienta — muszą trafić do apki, a bezpieczeństwo
 * zapewniają reguły Firestore, nie tajność klucza. (Sekret to service-account
 * key z Admin SDK — ten jest w .gitignore.)
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAbHCgoDobyQrU7lLPgXRbHnTohg1GlZiA',
  authDomain: 'anvil-73c7e.firebaseapp.com',
  projectId: 'anvil-73c7e',
  storageBucket: 'anvil-73c7e.firebasestorage.app',
  messagingSenderId: '962300522495',
  appId: '1:962300522495:android:ad99b2f261781a124541ca',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth z TRWAŁĄ pamięcią (AsyncStorage) — dzięki temu anonimowy `uid`
 * przeżywa restart apki i dane użytkownika nie zostają osierocone.
 * `initializeAuth` rzuca przy podwójnym wywołaniu (fast refresh) → fallback na getAuth.
 */
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

/** Firestore — long-polling stabilizuje transport na React Native / Expo Go. */
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { app, auth, db };

/**
 * Gwarantuje zalogowanego (anonimowo) użytkownika i zwraca jego uid.
 * Wywołaj przy starcie aplikacji, zanim czytasz/zapisujesz dane pod users/{uid}.
 */
export async function ensureAnonymousAuth(): Promise<string> {
  // Czeka aż warstwa trwałej pamięci wczyta zapisaną sesję (kluczowe:
  // bez tego pierwszy stan to `null` i tworzyłby się nowy uid przy każdym starcie).
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}
