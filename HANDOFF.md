# ANVIL — Handoff / Continuation Guide

Self-contained brief so a **fresh session** (new context window, new project, or another dev/AI) can take over. Read this first; it is the source of truth. (The old `CLAUDE.md` in this repo is the day‑1 ruleset and is **stale** — it mentions Next.js/Supabase/Vercel that were **never used**; ignore its stack parts.)

## What Anvil is
Android-first **gym workout tracker**. Dark theme, single neon-green accent `#C4F82A`, English UI, tagline "turn sweat into muscle", "by PeteKovSoftware". Anonymous per-device user (no login yet). Working dir: `C:\apkagym`.

## Stack
- **Expo SDK 57**, React Native 0.86, React 19, **TypeScript**, **expo-router** (file-based, `experiments.typedRoutes`).
- **Firebase JS SDK** (`firebase` package — the WEB sdk, **not** `@react-native-firebase`) → runs in **Expo Go**, no native build needed. Firestore + **anonymous Auth**.
- **zustand** (state), **expo-image** (animated GIFs), `@react-native-async-storage/async-storage` (auth persistence).
- Exercise GIFs: public CDN `https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@1.2.0/<folder>/<file>.gif` (free, no key).

## Run / build / verify
- **Phone (dev):** `npx expo start --port 8081` → scan QR in Expo Go (phone + PC on same Wi‑Fi). Custom launcher icon/splash only appear in a real build, not Expo Go.
- **Web preview (fast iterate):** `npx expo start --web` (port 8081). NOTE: web pane crops the bottom ~10px → **bottom tab labels can't be screenshotted on web**; verify the tab bar on a device.
- **Typecheck:** `npx tsc --noEmit`. Route-type errors for new routes clear once Metro runs (it regenerates `.expo/types`).
- **EAS build (installable APK):** `npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait`. Watch: `npx eas-cli@latest build:view <id>` (grep `^Status` → finished/errored). Logged in as **piotrekk80** (petekovalyk80@gmail.com). Free queue can take 30+ min. APK link = "Application Archive URL".
- **iOS build + TestFlight (DONE once — Sep 2026, app runs on a real iPhone 14 Pro):**
  - Build: `eas build -p ios --profile production` → then `eas submit -p ios --profile production`.
  - **⚠️ On the user's Windows PC you MUST prefix every `eas`/`firebase` network command with** `$env:NODE_OPTIONS="--use-system-ca"` (PowerShell, per-session) — corporate root CA isn't in Node's bundle → TLS to api.expo.dev fails otherwise. (Node ≥20.19/22.15 for the flag.)
  - Apple: agreements must be current — the **Developer Program License Agreement** (developer.apple.com) **and** a separate one accepted by logging into **App Store Connect web**. Account/team = **472BN9THNF** (PIOTR PAWEL KOWALIK, Individual). If EAS restores a wrong cached Apple login, clear it: `Remove-Item -Recurse -Force "$env:USERPROFILE\.app-store"`.
  - Credentials: **reuse** the distribution cert + App Store Connect API key (they're per-account, shared with whats-the-gist, don't mix apps); **generate a new provisioning profile** (app-specific). `ITSAppUsesNonExemptEncryption:false` is set in app.json (clears export compliance). `buildNumber` auto-increments.
  - **App Store display name "Anvil" is TAKEN** → TestFlight got "Anvil (6bbc27)"; pick a unique store name at public launch (e.g. Anvil Gym/Lifting).
  - **WEEKEND TODO:** External TestFlight (public link) for friends → needs one-time Beta App Review.

## Firebase
- Project **anvil-73c7e**, Firestore DB `(default)`, region **eur3**. Anonymous Auth **enabled**.
- Client config (public, safe by design) hardcoded in `lib/firebase.ts`. Auth uses `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` and **`auth.authStateReady()`** in `ensureAnonymousAuth()` — CRITICAL: without it a NEW anonymous uid is created every launch (data loss). `firebase@12`: `getReactNativePersistence` lives only in the RN build → reached via a namespace cast in `lib/firebase.ts` (works at runtime via Metro).
- Rules: `firestore.rules` (published in console). `exercises`/`planTemplates` → read for any authed user, no client write. `users/{uid}` + all subcollections → owner-only.
- **Seed:** `node scripts/seed.js` (idempotent `set`, uses admin key). Seeds **55 exercises** + **4 planTemplates** (incl. `off-gym-bootcamp`). Re-run after editing the catalog/templates.

## Data model (Firestore)
```
exercises/{id}                name, muscleGroup, description, effects(action&why), imageUrl(GIF), bodyweight:bool, timed:bool
planTemplates/{id}            name, daysPerWeek(3|4|6|1), workouts[]   // 1 = off-gym-bootcamp
  workouts[]                  { workoutId, name, order, exercises[] }
    exercises[]               { exerciseId, order, targetSets, targetReps, targetRIR }
users/{uid}                   units:'kg', trainingDaysPerWeek, activePlanId, createdAt
users/{uid}/plans/{planId}    editable copy of a template (name, daysPerWeek, workouts[])
users/{uid}/sessions/{id}     planId, workoutId, workoutName, date, startedAt, completedAt|null, offGym:bool
  …/sessions/{id}/sets/{id}   exerciseId, setNumber, weight, reps, completedAt
```
Templates: `full-body-3day`, `upper-lower-4day`, `ppl-6day`. Content is **evidence-based** (Israetel/RP, Nippard — from the user's research in `gemini-code-1788982675365.md`): exercises ordered by CNS tier (compound→machine→isolation), proper rep ranges + RIR. Rotation model (NO weekdays): "next workout" = next in `order` after the last session's `workoutId` (wraps).

## Features implemented
Onboarding (3/4/6 → instantiate template copy) · Home (top card shows the **selected** workout, default = next; tapping a plan row = "CHECK IT" preview that swaps the top card, doesn't start; swipeable GIF strip; Start) · **Change plan** (`plan-select`, also refreshes the copy to latest template) · Workout session (lazy session on first set, log weight×reps, **bodyweight** = reps only, **timed** (plank) = seconds, RIR shown, finish/exit) · **History** (month calendar, green = workout days → tap → day details with sets) · Atlas (browse by muscle) · Exercise detail (technique + **"Action & effects"** blurb) · Branding (logo splash `assets/brand/logo.jpg`, byline, adaptive icon/native splash in `app.json`) · **Full English**.

**Added this round (Sep 2026):**
- **"Action & effects"** blurb on every exercise (`effects` field; shown under technique on exercise detail).
- **Rest timer** (`components/RestTimer.tsx`): 90s countdown after a logged set, only when it's not the last suggested set and the exercise isn't `timed`; hitting 0 does nothing (no alarm), always skippable.
- **Exercise swap** (workout screen): per-exercise sheet of same-`muscleGroup` alternatives; applies **today only**, keeps the slot's sets/reps/RIR. Local state, resets on leaving.
- **Optional plank finisher**: virtual extra step after the last exercise (id `plank`); timed hold, fully skippable via "Finish workout". Logged as a normal `plank` set; doesn't affect rotation.
- **Off Gym** (bodyweight bootcamp): startable from Home; `off-gym-bootcamp` template (9 moves), session flagged `offGym:true`. **Rotation-safe** via `getLastGymSession()` (skips off-gym). History colours off-gym-only days **turquoise** (`palette.offgym`), gym days green; day details show an "OFF GYM" tag.
- **Progress tab**: per-exercise est-1RM line chart (`app/(tabs)/progress.tsx`, `components/LineChart.tsx`, `fetchExerciseHistory` in `lib/db.ts`). 4th tab, `chart-line` icon.

## Key files
- `app/_layout.tsx` — root, `BrandSplash` (logo, min 2.2s), Stack routes.
- `app/(tabs)/_layout.tsx` — tabs Workout/History/Atlas/Progress · `index.tsx` (home) · `history.tsx` (calendar) · `atlas.tsx` · `progress.tsx` (est-1RM charts).
- `app/onboarding.tsx`, `app/plan-select.tsx`, `app/workout/[workoutId].tsx`, `app/day/[date].tsx`, `app/exercise/[id].tsx`.
- `lib/firebase.ts` (init + `ensureAnonymousAuth`), `lib/db.ts` (all Firestore fns), `lib/types.ts`.
- `store/useStore.ts` (bootstrap, exercises map, plan, `completeOnboarding`, `switchPlan`).
- `constants/theme.ts` (palette + `muscleLabel`), `components/GifImage.tsx`, `components/ExerciseRow.tsx`.
- `scripts/seed.js`, `firestore.rules`, `eas.json`, `app.json`.

## Gotchas
- Use **`router.push`**, not `Link asChild` (RN-web expands to content width).
- After adding a route file, `tsc` errors on its typed href until Metro regenerates `.expo/types` — start the dev/web server once.
- Plan template **names are English** ("(3 days)"); a user's existing plan **copy** keeps its old name until onboarding/Change re-instantiates. Fresh install onboards fresh → English.
- pull-up / dips / push-up / plank / hanging-leg-raise / ab-wheel are `bodyweight` (reps only, no kg). plank is also `timed` (seconds). Weighted pull-ups/dips = future feature.
- **Secrets (gitignored, never commit):** `*firebase-adminsdk*.json` (admin key, used only by seed), `google-services.json`. The Firebase web `apiKey` in `lib/firebase.ts` is a **public client id** (safe; security is Firestore rules).

## Agreed feature roadmap (user, Sep 2026)
Priority order the user approved: **1) plank finisher ✅ · 2) rest timer ✅ · 3) exercise swap ✅ · 4) Off Gym ✅ · 5a) charts ✅ · 5b) auto-progression ✅.** Roadmap 1–5 DONE.
- **Charts ✅** — **Progress** tab: per-exercise **estimated 1RM** line chart (Epley on the best set each session; bodyweight/timed → best reps/hold). Aggregated **client-side** in `fetchExerciseHistory()` (NO `collectionGroup`, NO Firestore index — works under existing owner rules). Chart = `components/LineChart.tsx` on **react-native-svg** (Expo Go OK). Dev tool `scripts/seed-demo.js <uid> [--clean]` injects demo history.
- **Auto-progression ✅** — workout screen shows each exercise's **last top set** + a **"Beat it"** target (double progression: at top of rep range → +2.5 kg back to bottom, else same weight +1 rep; bodyweight +1 rep; timed +5 s). `ProgressPoint.topWeight/topReps`, `suggestNext()` in `app/workout/[workoutId].tsx`.

## AUTH — Etap 1 ✅ (Sep 2026), Etap 2 TODO
Real accounts so each lifter's data follows them across devices; "1 user = only their data" (owner-only Firestore rules). **Guest-first**: `linkWithCredential` on the anonymous user → same `uid`, **zero migration**.
- **Etap 1 ✅ (email/password, testable in Expo Go):** `app/welcome.tsx` (guest-first), `app/auth.tsx` (`?mode=create|signin`, forgot-password reset, Google shown as coming-with-build), `app/upgrade.tsx` (trial-ended wall), `app/(tabs)/profile.tsx` (5th tab: status, 14-day trial bar, sign out). `lib/firebase.ts` auth fns + `lib/trial.ts` (`guestDaysLeft`, `TRIAL_DAYS=14` from `createdAt`). Store: bootstrap no longer auto-creates a guest → shows Welcome when unauthed; `authed/isAnonymous/email` + `continueAsGuest/signIn/createAccount/signOut`. Home guards redirect to `/welcome` (unauthed) and `/upgrade` (guest trial expired); guest trial banner on Home.
  - **⚠️ ACTION NEEDED:** enable **Email/Password** in Firebase console (Authentication → Sign-in method). Until then sign-up returns `OPERATION_NOT_ALLOWED`. Anonymous is already on. The guest flow works today; email create/sign-in works the moment the provider is enabled.
- **Etap 2 TODO (needs a real build, not Expo Go):** **Google Sign-In** (OAuth config) + **RevenueCat** subscriptions + real paywall. Pricing not yet locked (leaning 29,99/yr + 3,99/mo, or 2,99/29,99). Trial wall currently unlocks by creating a free account; Etap 2 flips it to require an active subscription. **App Check** before public release.
- **Mockup** (dark neon theme, anvil logo revised): `https://claude.ai/code/artifact/c1b1891e-3426-48c3-b338-73a4ed3156bb`.

## Next steps (do each in a fresh session)
1. ~~Exercise "Action & effects" descriptions~~ **DONE** — `effects` on all exercises, rendered on exercise detail.
2. **AUTH — open account creation.** Currently anonymous single-user/device. Add email/password and/or Google sign-in via **`linkWithCredential`** on the existing anonymous user → keeps the same `uid`, **zero data migration**. Add a sign-in/account screen + sign-out. Model already `users/{uid}`, designed "single-user now, multi-user later".
3. **Native splash shows anvil only (no logo text).** Android 12+ native splash uses `assets/brand/anvil.png` (anvil on near-black, no wordmark) via `app.json` expo-splash-screen. The full logo-with-text (`assets/brand/logo.jpg`, from `logo1.jpg`) only shows in the CODED `BrandSplash` (app/_layout.tsx) after JS loads. To show branded text at cold start, either swap the native splash `image` to a text-inclusive asset (note: Android 12 crops the splash icon to a centered circle/box, so a wide wordmark may clip — may need a padded square version) or accept native = mark only + coded = full logo.
4. **Marketing website** — **IN PROGRESS in a separate chat/repo** (brief = `ANVIL-WEBSITE-BRIEF.md`; landing v1 artifact exists). Keep website work OUT of the app repo/chat.
5. **Equipment type (FIRST from field testing, Sep 2026).** "Weight (kg)" is ambiguous across barbell (total incl. bar) / dumbbell (per hand) / machine (per side or stack). Real case: user did machine overhead press (2×10kg = 20 total, 10/side), logged 10kg → pollutes the barbell overhead-press history/1RM. PLAN: add `equipment` (barbell/dumbbell/machine/cable/bodyweight) to the catalog → adaptive weight-input label + tag; principle "different equipment = different exercise = separate history". GAP: no "Machine Shoulder Press" in catalog to swap to → add machine variants (check GIF DB). Optional: "per side" toggle for tonnage.
6. **Apple Health / Health Connect sync (backlog idea).** Write each finished session as a strength-training workout (type+duration+est. calories; NOT set-level detail — that stays in Anvil). iOS = HealthKit, Android = Health Connect. Garmin deferred (needs Garmin Developer Program approval + OAuth + server). Build-only (native, not Expo Go); a Profile toggle + permission.
7. **Polish backlog:** ~~rest timer~~ (done), edit/delete a logged set, volume guardrails (MEV 8–10 / MAV 12–18 / block >20–22 per muscle/wk), optional weighted bodyweight, "pick today's focus" custom builder. Ideas raised but not chosen: exercise-swap "change in plan (permanent)"; configurable rest duration per exercise; streaks/gamification.

## Billing / safety
Firebase: keep the **Spark (free)** plan → billing impossible. If on Blaze, set a budget alert. No Gemini/other paid APIs are integrated (GIFs are free). Consider **App Check** before any public release (anonymous auth is open).
