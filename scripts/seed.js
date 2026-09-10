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

// [id, name, muscleGroup, gifPath, description(EN), effects(EN — action & effects: what it does / why)]
const EXERCISES = [
  // ——— KLATKA ———
  ['barbell-bench-press', 'Barbell Bench Press', 'chest', 'pectorals/barbell-bench-press', 'Lie on a flat bench and press a barbell from your chest to full arm extension.', 'Hits the whole chest with emphasis on the mid and lower pecs. Heavy barbell loading drives huge mechanical tension, the main driver of chest thickness and width. Expect gains in chest size and pressing strength, with strong triceps and front-delt support.'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'chest', 'pectorals/dumbbell-incline-alternate-press', 'Press dumbbells upward on a 30° incline bench to target the upper chest.', 'Biases the upper chest (clavicular head). The incline shifts tension upward while dumbbells allow a deeper stretch at the bottom. Builds the upper-chest shelf and pressing strength, with front-delt and triceps assistance.'],
  ['machine-chest-press', 'Machine Chest Press', 'chest', 'pectorals/lever-chest-press', 'Press the handles forward on a chest-press machine — safe under fatigue.', 'Works the whole chest along a fixed path. Stable guidance lets you push close to failure with low stability cost, keeping tension on the pecs. A great mass-builder late in a session when free-weight fatigue sets in.'],
  ['dips', 'Chest Dips', 'chest', 'pectorals/chest-dip', 'Lower and press your body up on parallel bars, leaning forward for the chest.', 'Emphasises the lower and outer chest. Leaning forward under bodyweight loads the pecs in a deep stretch for strong mechanical tension. Builds lower-chest fullness and pressing power, with heavy triceps involvement.'],
  ['cable-crossover', 'Cable Crossover', 'chest', 'pectorals/cable-cross-over-variation', 'Bring cable handles together in front of you for a peak chest contraction.', 'Targets the inner and mid chest. Constant cable tension peaks at full contraction, adding metabolic stress a press can\'t. Best for chest detail and the squeeze rather than raw strength.'],
  ['cable-fly', 'Cable Fly', 'chest', 'pectorals/cable-decline-fly', 'Bring cable handles together in front of your chest with a slight elbow bend.', 'Isolates the chest through a wide arc. Cables hold tension across the full range and load the pecs hard in the stretched position. Adds chest width and separation with minimal triceps involvement.'],
  ['push-up', 'Push-Up', 'chest', 'pectorals/push-up', 'Lower and push your body up from a plank position using chest and triceps.', 'Trains the whole chest with your bodyweight. Controlled tension and metabolic stress build muscular endurance and pressing conditioning. Scalable anywhere, with steady triceps and front-delt support.'],
  // ——— BARKI ———
  ['overhead-press', 'Overhead Press', 'shoulders', 'delts/barbell-seated-overhead-press', 'Press a barbell overhead from shoulder height to full lockout.', 'Hits mainly the front delts, with side delts and upper chest. Pressing a heavy barbell overhead drives large mechanical tension through the whole shoulder. Builds round, strong shoulders and overhead pressing power, with triceps support.'],
  ['dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'shoulders', 'delts/dumbbell-seated-shoulder-press', 'Press dumbbells overhead from shoulder height, seated or standing.', 'Works the front and side delts. Dumbbells allow a longer range and load each shoulder evenly, fixing side-to-side imbalances. Builds shoulder size and pressing strength, with triceps assistance.'],
  ['lateral-raise', 'Dumbbell Lateral Raise', 'shoulders', 'delts/dumbbell-lateral-raise', 'Raise dumbbells out to the sides to shoulder height for the side delts.', 'Isolates the side delts — the key to shoulder width. Tension peaks near the top of the raise, driving growth that widens the frame. Pure hypertrophy work; keep the load light and the reps clean.'],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'shoulders', 'delts/cable-lateral-raise', 'Raise a low-pulley handle out to the side — constant tension on the side delt.', 'Isolates the side delts with constant cable tension. Unlike dumbbells, the load stays heavy even at the bottom, hammering the delt through the full range. Builds shoulder width and the capped look.'],
  ['face-pull', 'Face Pull', 'rear-delts', 'delts/cable-rear-delt-row-with-rope', 'Pull a rope to your face with elbows high to work the rear delts.', 'Targets the rear delts and upper-back rotators. High-elbow pulling drives tension into the often-neglected rear delt. Builds shoulder health, posture, and 3D delt fullness.'],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'rear-delts', 'delts/lever-seated-reverse-fly', 'Open your arms back on a reverse-fly machine to isolate the rear delts.', 'Isolates the rear delts on a fixed path. Steady machine tension lets you focus purely on the rear-delt squeeze with no momentum. Rounds out the shoulders and balances heavy pressing work.'],
  // ——— TRICEPS ———
  ['triceps-pushdown', 'Triceps Pushdown', 'triceps', 'triceps/cable-pushdown', 'Push a cable bar down by extending your elbows, keeping them at your sides.', 'Trains all three triceps heads, biasing the lateral head. Constant cable tension and a hard lockout drive a strong contraction. Builds the horseshoe look and elbow-extension strength.'],
  ['overhead-triceps-extension', 'Overhead Triceps Extension', 'triceps', 'triceps/barbell-standing-overhead-triceps-extension', 'Extend a bar overhead behind your head to stretch and work the triceps.', 'Emphasises the long head of the triceps. Extending overhead puts the long head in a deep stretch, where mechanical tension is highest for growth. Adds mass to the back of the arm.'],
  ['cable-overhead-triceps-extension', 'Overhead Cable Extension', 'triceps', 'triceps/cable-overhead-triceps-extension-rope-attachment', 'Extend a rope overhead behind your head — constant tension on the long head.', 'Biases the long head with constant cable tension in the stretched position. The rope keeps load on the triceps through the full range for a strong stimulus. Builds long-head thickness and arm size.'],
  ['skullcrusher', 'Lying Triceps Extension (Skullcrusher)', 'triceps', 'triceps/barbell-lying-triceps-extension-skull-crusher', 'Lie down and lower an EZ-bar toward your forehead, then extend the elbows.', 'Hits all three heads with a bias toward the long head. Lowering toward the forehead loads the triceps in a stretch for strong tension. A proven mass-builder for the whole triceps.'],
  ['close-grip-bench-press', 'Close-Grip Bench Press', 'triceps', 'triceps/barbell-close-grip-bench-press', 'Bench press with a shoulder-width grip to emphasise the triceps.', 'Trains the triceps as the prime mover, with chest and front-delt support. The narrow grip lets you overload the triceps heavily. Builds triceps mass and lockout pressing strength.'],
  // ——— PLECY ———
  ['lat-pulldown', 'Lat Pulldown', 'back', 'lats/cable-lat-pulldown-full-range-of-motion', 'Pull a bar down to your upper chest, driving the elbows down.', 'Targets the lats, with biceps and mid-back support. Vertical pulling stretches and contracts the lats through a full range for width. Builds the V-taper and pulling strength; a scalable stand-in for pull-ups.'],
  ['seated-cable-row', 'Seated Cable Row', 'back', 'upper-back/cable-seated-row', 'Pull a cable handle to your torso while seated, squeezing the shoulder blades.', 'Works the mid-back, rhomboids, and lats. Horizontal rowing builds back thickness through a strong squeeze of the shoulder blades. Steady tension makes it easy to load hard and control.'],
  ['barbell-row', 'Barbell Row', 'back', 'upper-back/barbell-bent-over-row', 'Hinge forward and row a barbell to your lower ribs.', 'Builds the whole back — lats, mid-back, and traps. Heavy hinged rowing drives huge mechanical tension for thickness. Also hammers the spinal erectors and grip; a top mass-builder.'],
  ['dumbbell-row', 'One-Arm Dumbbell Row', 'back', 'upper-back/dumbbell-one-arm-bent-over-row', 'Row a dumbbell to your hip with one arm, torso supported.', 'Targets the lats and mid-back one side at a time. The supported position allows a long range, a strong stretch, and heavy loading. Builds back thickness and fixes left-right imbalances.'],
  ['t-bar-row', 'T-Bar Row', 'back', 'upper-back/lever-t-bar-reverse-grip-row', 'Row a T-bar to your torso, chest supported, for back thickness.', 'Builds mid-back and lat thickness. Chest support removes lower-back strain so you can load the back heavily. Drives mechanical tension for dense, thick back development.'],
  ['pull-up', 'Pull-Up', 'back', 'lats/pull-up', 'Pull your body up on a bar until your chin clears it.', 'Targets the lats and upper back with your bodyweight. Pulling through a full stretch builds width and relative strength. Adds bicep and grip work; the benchmark upper-body pull.'],
  ['cable-pullover', 'Straight-Arm Pullover', 'back', 'lats/barbell-bent-arm-pullover', 'With near-straight arms, pull the bar down in an arc to work the lats.', 'Isolates the lats with straight arms. The arcing motion loads the lats in a long stretch without much bicep help. Great for feeling and building the lats before or after heavy rows.'],
  // ——— BICEPS ———
  ['barbell-curl', 'Barbell Curl', 'biceps', 'biceps/barbell-curl', 'Curl a barbell up with your elbows fixed at your sides.', 'Builds overall biceps mass. A heavy barbell lets you overload both heads for strong mechanical tension. The classic size-and-strength curl for the front of the arm.'],
  ['dumbbell-curl', 'Dumbbell Curl', 'biceps', 'biceps/dumbbell-biceps-curl', 'Curl dumbbells up, supinating the wrists, elbows fixed.', 'Works both biceps heads with supination. Turning the wrist up fully shortens the biceps for a strong peak contraction. Builds biceps size and lets each arm work independently.'],
  ['incline-dumbbell-curl', 'Incline Dumbbell Curl', 'biceps', 'biceps/dumbbell-incline-biceps-curl', 'Curl dumbbells on an incline bench — biceps worked in the stretched position.', 'Biases the long head of the biceps. The incline pulls the arms back, loading the biceps in a deep stretch where growth is strongest. Builds the biceps peak and overall arm size.'],
  ['preacher-curl', 'Preacher Curl', 'biceps', 'biceps/barbell-lying-preacher-curl', 'Curl over a preacher pad to isolate the biceps with no swing.', 'Isolates the biceps with the short head emphasised. The pad kills momentum so all tension stays on the muscle, especially in the bottom stretch. Builds lower-biceps thickness and mind-muscle control.'],
  ['hammer-curl', 'Hammer Curl', 'biceps', 'biceps/dumbbell-hammer-curl', 'Curl dumbbells with a neutral grip for the biceps and forearms.', 'Targets the brachialis and forearms alongside the biceps. The neutral grip builds the muscle under the biceps that pushes it up, adding arm width. Also thickens the forearms and grip.'],
  // ——— NOGI ———
  ['squat', 'Barbell Squat', 'legs', 'glutes/barbell-full-squat', 'Squat down with a barbell on your back to at least parallel, then stand.', 'The primary quad and glute builder, with hamstring and core support. Heavy loading through a full squat drives enormous mechanical tension across the legs. Builds overall lower-body size and strength like nothing else.'],
  ['front-squat', 'Front Squat', 'legs', 'glutes/barbell-front-squat', 'Squat with the barbell racked on the front delts — upright torso, quad focus.', 'Biases the quads with an upright torso. The front-rack position keeps you vertical, shifting tension onto the quads and core. Builds quad size and posture-strong core stability.'],
  ['hack-squat', 'Hack Squat', 'legs', 'glutes/barbell-hack-squat', 'Push through a fixed hack-squat path — heavy quad work, spine offloaded.', 'Hammers the quads on a fixed path. The machine offloads the spine so you can push the quads to failure safely, with a strong stretch under load. A top quad mass-builder.'],
  ['leg-press', 'Leg Press', 'legs', 'glutes/sled-45-leg-press', 'Press a loaded sled away with your legs without locking the knees.', 'Loads the quads and glutes with the back supported. The fixed path lets you push heavy without balance or spinal fatigue. Builds leg mass and is easy to take close to failure.'],
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'legs', 'quads/barbell-single-leg-split-squat', 'Rear foot elevated, drop into a lunge on the front leg, then drive up.', 'Trains quads and glutes one leg at a time in a deep stretch. The elevated rear foot drives a long range and strong glute tension. Builds single-leg size, balance, and fixes imbalances.'],
  ['walking-lunge', 'Walking Lunge', 'legs', 'glutes/walking-lunge', 'Step forward into a lunge and alternate legs while moving forward.', 'Works the quads and glutes through a moving lunge. Each step loads the working leg in a stretch with a strong glute contraction. Builds leg size, single-leg strength, and conditioning.'],
  ['leg-extension', 'Leg Extension', 'quads', 'quads/lever-leg-extension', 'Extend your knees against a machine pad to isolate the quads.', 'Isolates the quads, especially the rectus femoris. Machine tension peaks at lockout for a hard contraction with no other muscles involved. Best for quad detail and finishing volume.'],
  ['romanian-deadlift', 'Romanian Deadlift', 'hamstrings', 'glutes/barbell-romanian-deadlift', 'Hinge at the hips to lower a barbell along your legs, feeling the hamstrings.', 'Targets the hamstrings and glutes through a hip hinge. Lowering under control loads the hamstrings in a deep stretch — the key driver of growth. Builds posterior-chain size and hinge strength.'],
  ['deadlift', 'Deadlift', 'posterior-chain', 'glutes/barbell-deadlift', 'Lift a barbell from the floor to a standing position with a flat back.', 'Trains the entire posterior chain — hamstrings, glutes, back, and traps. Pulling heavy from the floor drives full-body mechanical tension and raw strength. The ultimate expression of total-body pulling power.'],
  ['leg-curl', 'Lying Leg Curl', 'hamstrings', 'hamstrings/lever-lying-leg-curl', 'Curl your heels toward your glutes lying down — hamstring isolation.', 'Isolates the hamstrings via knee flexion. The lying position peaks tension at the top for a strong hamstring contraction. Builds hamstring size and balances heavy hinging work.'],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamstrings', 'hamstrings/lever-seated-leg-curl', 'Curl your heels down while seated — hamstrings in a lengthened position.', 'Isolates the hamstrings in a lengthened position. The seated angle stretches the hamstrings under load, where growth is strongest. Research favours it for hamstring hypertrophy.'],
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'calves/barbell-standing-calf-raise', 'Rise onto your toes against load, then lower for a full stretch (gastrocnemius).', 'Targets the gastrocnemius — the diamond-shaped upper calf. A full stretch and contraction with knees straight drives tension where the calf grows. Builds calf size and ankle strength.'],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'calves/lever-seated-calf-raise', 'Raise your heels seated with knees bent — targets the soleus.', 'Isolates the soleus, the deep calf muscle under the gastrocnemius. Bent knees take the gastroc out so tension lands on the soleus. Builds lower-calf thickness and completes calf development.'],
  // ——— BRZUCH ———
  ['plank', 'Plank', 'core', 'abs/weighted-front-plank', 'Hold a straight-body position on your forearms, bracing the core.', 'Trains the entire core as an anti-extension brace. Holding a rigid body under time builds the deep stabilisers that protect the spine. Builds core endurance and bracing strength for heavy lifts.'],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'core', 'abs/hanging-leg-raise', 'Hang from a bar and raise your legs to work the lower abs.', 'Targets the lower abs and hip flexors. Raising the legs against gravity loads the abs through a long range. Builds lower-ab strength and control, plus grip endurance.'],
  ['cable-crunch', 'Cable Crunch', 'core', 'abs/cable-kneeling-crunch', 'Kneel and crunch your torso down against cable resistance for the abs.', 'Works the abs (rectus abdominis) with added load. Crunching against cable resistance lets you progressively overload the abs like any other muscle. Builds ab thickness and the six-pack blocks.'],
  ['ab-wheel', 'Ab Wheel Rollout', 'core', 'abs/barbell-rollerout', 'Roll out and back while keeping the core braced and the spine neutral.', 'Trains the whole core as a powerful anti-extension. Rolling out loads the abs in a long stretch while resisting spinal extension. Builds serious core strength and rigid, dense abs.'],
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

  for (const [id, name, muscleGroup, gifPath, description, effects] of EXERCISES) {
    batch.set(db.collection('exercises').doc(id), {
      name,
      muscleGroup,
      description,
      effects,
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
