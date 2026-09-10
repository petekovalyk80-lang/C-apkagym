/**
 * Seed Firestore — katalog `exercises` i szablony `planTemplates`.
 * Plany oparte na spec evidence-based (Israetel/RP, Nippard): kolejność wg
 * obciążenia CUN (Tier 1→2→3), zakresy powtórzeń i RIR per ćwiczenie.
 *
 * Uruchom JEDNORAZOWO:  node scripts/seed.js
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ROOT = path.join(__dirname, '..');

const keyFile = fs.readdirSync(ROOT).find((f) => /firebase-adminsdk.*\.json$/i.test(f));
if (!keyFile) {
  console.error('❌ Nie znaleziono klucza service-account (*firebase-adminsdk*.json) w', ROOT);
  process.exit(1);
}
const serviceAccount = require(path.join(ROOT, keyFile));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log(`🔑 Projekt: ${serviceAccount.project_id}  (klucz: ${keyFile})`);

const GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@1.2.0';
const gif = (p) => `${GIF_BASE}/${p}.gif`;

// Ćwiczenia z masą ciała — bez pola ciężaru w apce.
const BODYWEIGHT = new Set(['push-up', 'pull-up', 'dips', 'plank', 'hanging-leg-raise', 'ab-wheel']);
// Ćwiczenia mierzone czasem (sekundy) zamiast powtórzeń.
const TIMED = new Set(['plank']);

// [id, name, muscleGroup, gifPath, description(EN)]
const EXERCISES = [
  // ——— KLATKA ———
  ['barbell-bench-press', 'Barbell Bench Press', 'chest', 'pectorals/barbell-bench-press', 'Lie on a flat bench and press a barbell from your chest to full arm extension.'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'pectorals/dumbbell-incline-alternate-press', 'Press dumbbells upward on a 30° incline bench to target the upper chest.'],
  ['machine-chest-press', 'Machine Chest Press', 'chest', 'pectorals/lever-chest-press', 'Press the handles forward on a chest-press machine — safe under fatigue.'],
  ['dips', 'Chest Dips', 'chest', 'pectorals/chest-dip', 'Lower and press your body up on parallel bars, leaning forward for the chest.'],
  ['cable-crossover', 'Cable Crossover', 'chest', 'pectorals/cable-cross-over-variation', 'Bring cable handles together in front of you for a peak chest contraction.'],
  ['cable-fly', 'Cable Fly', 'chest', 'pectorals/cable-decline-fly', 'Bring cable handles together in front of your chest with a slight elbow bend.'],
  ['push-up', 'Push-Up', 'chest', 'pectorals/push-up', 'Lower and push your body up from a plank position using chest and triceps.'],
  // ——— BARKI ———
  ['overhead-press', 'Overhead Press', 'shoulders', 'delts/barbell-seated-overhead-press', 'Press a barbell overhead from shoulder height to full lockout.'],
  ['dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'delts/dumbbell-seated-shoulder-press', 'Press dumbbells overhead from shoulder height, seated or standing.'],
  ['lateral-raise', 'Dumbbell Lateral Raise', 'shoulders', 'delts/dumbbell-lateral-raise', 'Raise dumbbells out to the sides to shoulder height for the side delts.'],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'delts/cable-lateral-raise', 'Raise a low-pulley handle out to the side — constant tension on the side delt.'],
  ['face-pull', 'Face Pull', 'rear-delts', 'delts/cable-rear-delt-row-with-rope', 'Pull a rope to your face with elbows high to work the rear delts.'],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'rear-delts', 'delts/lever-seated-reverse-fly', 'Open your arms back on a reverse-fly machine to isolate the rear delts.'],
  // ——— TRICEPS ———
  ['triceps-pushdown', 'Triceps Pushdown', 'triceps', 'triceps/cable-pushdown', 'Push a cable bar down by extending your elbows, keeping them at your sides.'],
  ['overhead-triceps-extension', 'Overhead Triceps Extension', 'triceps', 'triceps/barbell-standing-overhead-triceps-extension', 'Extend a bar overhead behind your head to stretch and work the triceps.'],
  ['cable-overhead-triceps-extension', 'Overhead Cable Extension', 'triceps', 'triceps/cable-overhead-triceps-extension-rope-attachment', 'Extend a rope overhead behind your head — constant tension on the long head.'],
  ['skullcrusher', 'Lying Triceps Extension (Skullcrusher)', 'triceps', 'triceps/barbell-lying-triceps-extension-skull-crusher', 'Lie down and lower an EZ-bar toward your forehead, then extend the elbows.'],
  ['close-grip-bench-press', 'Close-Grip Bench Press', 'triceps', 'triceps/barbell-close-grip-bench-press', 'Bench press with a shoulder-width grip to emphasise the triceps.'],
  // ——— PLECY ———
  ['lat-pulldown', 'Lat Pulldown', 'back', 'lats/cable-lat-pulldown-full-range-of-motion', 'Pull a bar down to your upper chest, driving the elbows down.'],
  ['seated-cable-row', 'Seated Cable Row', 'back', 'upper-back/cable-seated-row', 'Pull a cable handle to your torso while seated, squeezing the shoulder blades.'],
  ['barbell-row', 'Barbell Row', 'back', 'upper-back/barbell-bent-over-row', 'Hinge forward and row a barbell to your lower ribs.'],
  ['dumbbell-row', 'One-Arm Dumbbell Row', 'back', 'upper-back/dumbbell-one-arm-bent-over-row', 'Row a dumbbell to your hip with one arm, torso supported.'],
  ['t-bar-row', 'T-Bar Row', 'back', 'upper-back/lever-t-bar-reverse-grip-row', 'Row a T-bar to your torso, chest supported, for back thickness.'],
  ['pull-up', 'Pull-Up', 'back', 'lats/pull-up', 'Pull your body up on a bar until your chin clears it.'],
  ['cable-pullover', 'Straight-Arm Pullover', 'back', 'lats/barbell-bent-arm-pullover', 'With near-straight arms, pull the bar down in an arc to work the lats.'],
  // ——— BICEPS ———
  ['barbell-curl', 'Barbell Curl', 'biceps', 'biceps/barbell-curl', 'Curl a barbell up with your elbows fixed at your sides.'],
  ['dumbbell-curl', 'Dumbbell Curl', 'biceps', 'biceps/dumbbell-biceps-curl', 'Curl dumbbells up, supinating the wrists, elbows fixed.'],
  ['incline-dumbbell-curl', 'Incline Dumbbell Curl', 'biceps', 'biceps/dumbbell-incline-biceps-curl', 'Curl dumbbells on an incline bench — biceps worked in the stretched position.'],
  ['preacher-curl', 'Preacher Curl', 'biceps', 'biceps/barbell-lying-preacher-curl', 'Curl over a preacher pad to isolate the biceps with no swing.'],
  ['hammer-curl', 'Hammer Curl', 'biceps', 'biceps/dumbbell-hammer-curl', 'Curl dumbbells with a neutral grip for the biceps and forearms.'],
  // ——— NOGI ———
  ['squat', 'Barbell Squat', 'legs', 'glutes/barbell-full-squat', 'Squat down with a barbell on your back to at least parallel, then stand.'],
  ['front-squat', 'Front Squat', 'legs', 'glutes/barbell-front-squat', 'Squat with the barbell racked on the front delts — upright torso, quad focus.'],
  ['hack-squat', 'Hack Squat', 'legs', 'glutes/barbell-hack-squat', 'Push through a fixed hack-squat path — heavy quad work, spine offloaded.'],
  ['leg-press', 'Leg Press', 'legs', 'glutes/sled-45-leg-press', 'Press a loaded sled away with your legs without locking the knees.'],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'legs', 'quads/barbell-single-leg-split-squat', 'Rear foot elevated, drop into a lunge on the front leg, then drive up.'],
  ['walking-lunge', 'Walking Lunge', 'legs', 'glutes/walking-lunge', 'Step forward into a lunge and alternate legs while moving forward.'],
  ['leg-extension', 'Leg Extension', 'quads', 'quads/lever-leg-extension', 'Extend your knees against a machine pad to isolate the quads.'],
  ['romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'glutes/barbell-romanian-deadlift', 'Hinge at the hips to lower a barbell along your legs, feeling the hamstrings.'],
  ['deadlift', 'Deadlift', 'posterior-chain', 'glutes/barbell-deadlift', 'Lift a barbell from the floor to a standing position with a flat back.'],
  ['leg-curl', 'Lying Leg Curl', 'hamstrings', 'hamstrings/lever-lying-leg-curl', 'Curl your heels toward your glutes lying down — hamstring isolation.'],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'hamstrings/lever-seated-leg-curl', 'Curl your heels down while seated — hamstrings in a lengthened position.'],
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'calves/barbell-standing-calf-raise', 'Rise onto your toes against load, then lower for a full stretch (gastrocnemius).'],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'calves/lever-seated-calf-raise', 'Raise your heels seated with knees bent — targets the soleus.'],
  // ——— BRZUCH ———
  ['plank', 'Plank', 'core', 'abs/weighted-front-plank', 'Hold a straight-body position on your forearms, bracing the core.'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'core', 'abs/hanging-leg-raise', 'Hang from a bar and raise your legs to work the lower abs.'],
  ['cable-crunch', 'Cable Crunch', 'core', 'abs/cable-kneeling-crunch', 'Kneel and crunch your torso down against cable resistance for the abs.'],
  ['ab-wheel', 'Ab Wheel Rollout', 'core', 'abs/barbell-rollerout', 'Roll out and back while keeping the core braced and the spine neutral.'],
];

// Skrót ćwiczenia w treningu: [exerciseId, targetSets, targetReps, targetRIR]
function buildWorkouts(defs) {
  return defs.map(([workoutId, name, list], order) => ({
    workoutId,
    name,
    order,
    exercises: list.map(([exerciseId, targetSets, targetReps, targetRIR], i) => ({
      exerciseId,
      order: i,
      targetSets,
      targetReps,
      targetRIR,
    })),
  }));
}

const TEMPLATES = [
  {
    id: 'full-body-3day',
    name: 'Full Body (3 days)',
    daysPerWeek: 3,
    workouts: buildWorkouts([
      ['full-body-a', 'Full Body A', [
        ['squat', 3, '6-8', '2'], ['barbell-bench-press', 3, '8-10', '1-2'], ['dumbbell-row', 3, '8-10', '1-2'],
        ['leg-curl', 3, '10-12', '1'], ['lateral-raise', 3, '12-15', '0-1'], ['cable-crunch', 3, '12-15', '1'],
      ]],
      ['full-body-b', 'Full Body B', [
        ['romanian-deadlift', 3, '8-10', '2'], ['incline-dumbbell-press', 3, '8-10', '1-2'], ['lat-pulldown', 3, '10-12', '1'],
        ['leg-press', 3, '10-12', '1-2'], ['skullcrusher', 3, '10-12', '1'], ['dumbbell-curl', 3, '10-12', '1'],
      ]],
      ['full-body-c', 'Full Body C', [
        ['bulgarian-split-squat', 3, '8-10', '1-2'], ['overhead-press', 3, '8-10', '1-2'], ['seated-cable-row', 3, '10-12', '1'],
        ['leg-extension', 3, '12-15', '0-1'], ['face-pull', 3, '12-15', '1'], ['standing-calf-raise', 3, '12-15', '0'],
      ]],
    ]),
  },
  {
    id: 'upper-lower-4day',
    name: 'Upper / Lower (4 days)',
    daysPerWeek: 4,
    workouts: buildWorkouts([
      ['upper-a', 'Upper A', [
        ['barbell-bench-press', 4, '6-8', '1-2'], ['barbell-row', 4, '6-8', '2'], ['dips', 3, '8-10', '1-2'],
        ['lat-pulldown', 3, '10-12', '1'], ['lateral-raise', 4, '12-15', '0-1'],
        ['barbell-curl', 3, '10-12', '1'], ['triceps-pushdown', 3, '10-12', '1'],
      ]],
      ['lower-a', 'Lower A', [
        ['squat', 4, '6-8', '2'], ['romanian-deadlift', 3, '8-10', '2'], ['leg-press', 3, '10-12', '1'],
        ['leg-curl', 3, '10-12', '0-1'], ['standing-calf-raise', 4, '10-12', '0'], ['hanging-leg-raise', 3, '12-15', '1'],
      ]],
      ['upper-b', 'Upper B', [
        ['overhead-press', 4, '6-8', '1-2'], ['pull-up', 4, '6-8', '1-2'], ['machine-chest-press', 3, '10-12', '1'],
        ['seated-cable-row', 3, '10-12', '1'], ['reverse-pec-deck', 4, '12-15', '0-1'],
        ['incline-dumbbell-curl', 3, '10-12', '1'], ['cable-overhead-triceps-extension', 3, '10-12', '1'],
      ]],
      ['lower-b', 'Lower B', [
        ['deadlift', 4, '6-8', '2'], ['hack-squat', 3, '8-10', '1-2'], ['walking-lunge', 3, '10-12', '1'],
        ['leg-extension', 3, '12-15', '0-1'], ['seated-calf-raise', 4, '12-15', '0'], ['ab-wheel', 3, '10-12', '1'],
      ]],
    ]),
  },
  {
    id: 'ppl-6day',
    name: 'Push / Pull / Legs (6 days)',
    daysPerWeek: 6,
    workouts: buildWorkouts([
      ['push-a', 'Push A', [
        ['barbell-bench-press', 3, '5-7', '1-2'], ['overhead-press', 3, '6-8', '2'], ['dips', 3, '8-10', '1'],
        ['lateral-raise', 3, '10-12', '1'], ['triceps-pushdown', 3, '10-12', '0-1'],
      ]],
      ['pull-a', 'Pull A', [
        ['barbell-row', 3, '6-8', '2'], ['pull-up', 3, '6-8', '1-2'], ['dumbbell-row', 3, '8-10', '1'],
        ['face-pull', 3, '12-15', '1'], ['barbell-curl', 3, '8-10', '1'],
      ]],
      ['legs-a', 'Legs A', [
        ['squat', 3, '6-8', '2'], ['leg-press', 3, '8-10', '1-2'], ['seated-leg-curl', 3, '10-12', '0-1'],
        ['leg-extension', 3, '12-15', '0'], ['standing-calf-raise', 4, '10-12', '0'], ['cable-crunch', 3, '12-15', '1'],
      ]],
      ['push-b', 'Push B', [
        ['incline-dumbbell-press', 3, '8-10', '1-2'], ['machine-chest-press', 3, '10-12', '1'], ['cable-lateral-raise', 4, '12-15', '0'],
        ['cable-crossover', 3, '12-15', '0-1'], ['cable-overhead-triceps-extension', 3, '10-12', '0-1'],
      ]],
      ['pull-b', 'Pull B', [
        ['lat-pulldown', 3, '8-10', '1-2'], ['t-bar-row', 3, '10-12', '1'], ['cable-pullover', 3, '12-15', '0-1'],
        ['reverse-pec-deck', 3, '12-15', '0'], ['preacher-curl', 3, '10-12', '0-1'], ['hammer-curl', 3, '10-12', '1'],
      ]],
      ['legs-b', 'Legs B', [
        ['romanian-deadlift', 3, '6-8', '2'], ['hack-squat', 3, '8-10', '1-2'], ['leg-curl', 3, '10-12', '0-1'],
        ['bulgarian-split-squat', 2, '10-12', '1'], ['seated-calf-raise', 4, '12-15', '0'], ['hanging-leg-raise', 3, '12-15', '1'],
      ]],
    ]),
  },
];

function validate() {
  const catalog = new Set(EXERCISES.map((e) => e[0]));
  const missing = new Set();
  for (const t of TEMPLATES) {
    for (const w of t.workouts) {
      for (const e of w.exercises) if (!catalog.has(e.exerciseId)) missing.add(e.exerciseId);
    }
  }
  if (missing.size) {
    console.error('❌ Szablony odwołują się do nieistniejących ćwiczeń:', [...missing]);
    process.exit(1);
  }
}

async function run() {
  validate();
  const batch = db.batch();

  for (const [id, name, muscleGroup, gifPath, description] of EXERCISES) {
    batch.set(db.collection('exercises').doc(id), {
      name,
      muscleGroup,
      description,
      imageUrl: gif(gifPath),
      bodyweight: BODYWEIGHT.has(id),
      timed: TIMED.has(id),
    });
  }
  for (const t of TEMPLATES) {
    batch.set(db.collection('planTemplates').doc(t.id), {
      name: t.name,
      daysPerWeek: t.daysPerWeek,
      workouts: t.workouts,
    });
  }
  await batch.commit();

  const [exSnap, tplSnap] = await Promise.all([
    db.collection('exercises').get(),
    db.collection('planTemplates').get(),
  ]);
  console.log(`✅ Zaseedowano: ${EXERCISES.length} ćwiczeń, ${TEMPLATES.length} szablony.`);
  console.log(`📊 W Firestore: exercises=${exSnap.size}, planTemplates=${tplSnap.size}`);
  console.log('   Szablony:', tplSnap.docs.map((d) => `${d.id} (${d.data().workouts.length} treningów)`).join(', '));
}

run().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Seed nieudany:', err);
  process.exit(1);
});
