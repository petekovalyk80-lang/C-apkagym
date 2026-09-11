/**
 * DEMO DATA (tylko do weryfikacji wykresów) — wstrzykuje kilka historycznych
 * sesji z rosnącą progresją dla podanego uid. Idempotentne (stałe ID demo-*).
 *
 *   node scripts/seed-demo.js <uid>            # wstaw
 *   node scripts/seed-demo.js <uid> --clean    # usuń dane demo
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const ROOT = path.join(__dirname, '..');
const keyFile = fs.readdirSync(ROOT).find((f) => /firebase-adminsdk.*\.json$/i.test(f));
if (!keyFile) { console.error('Brak klucza admin.'); process.exit(1); }
initializeApp({ credential: cert(require(path.join(ROOT, keyFile))) });
const db = getFirestore();

const uid = process.argv[2];
const clean = process.argv.includes('--clean');
if (!uid) { console.error('Podaj uid: node scripts/seed-demo.js <uid>'); process.exit(1); }

// 6 tygodni wstecz, co ~7 dni. Bench i squat rosną (progresja).
const WEEKS = [42, 35, 28, 21, 14, 7]; // dni temu
const BENCH = [
  [60, 8], [62.5, 8], [65, 7], [65, 8], [67.5, 7], [70, 6],
];
const SQUAT = [
  [100, 6], [102.5, 6], [105, 6], [107.5, 5], [110, 5], [115, 5],
];

async function run() {
  const sessionsCol = db.collection('users').doc(uid).collection('sessions');

  if (clean) {
    let removed = 0;
    for (let i = 0; i < WEEKS.length; i++) {
      const sid = `demo-${i + 1}`;
      const setsSnap = await sessionsCol.doc(sid).collection('sets').get();
      for (const d of setsSnap.docs) await d.ref.delete();
      await sessionsCol.doc(sid).delete();
      removed++;
    }
    console.log(`🧹 Usunięto ${removed} sesji demo dla ${uid}.`);
    return;
  }

  for (let i = 0; i < WEEKS.length; i++) {
    const when = Timestamp.fromMillis(Date.now() - WEEKS[i] * 86400_000);
    const sid = `demo-${i + 1}`;
    const sref = sessionsCol.doc(sid);
    await sref.set({
      planId: 'full-body-3day',
      workoutId: 'full-body-a',
      workoutName: 'Full Body A',
      date: when,
      startedAt: when,
      completedAt: when,
      offGym: false,
    });
    // wyczyść stare sety demo
    const old = await sref.collection('sets').get();
    for (const d of old.docs) await d.ref.delete();

    const plan = [
      ['barbell-bench-press', BENCH[i]],
      ['squat', SQUAT[i]],
    ];
    let n = 0;
    for (const [exId, [w, reps]] of plan) {
      for (let s = 1; s <= 3; s++) {
        await sref.collection('sets').add({
          exerciseId: exId,
          setNumber: s,
          weight: w,
          reps: reps - (s - 1), // lekki spadek powtórzeń w kolejnych seriach
          completedAt: when,
        });
        n++;
      }
    }
    console.log(`✅ ${sid} (${WEEKS[i]}d temu): bench ${BENCH[i][0]}kg, squat ${SQUAT[i][0]}kg — ${n} serii`);
  }
  console.log('📊 Gotowe. Otwórz zakładkę Progress.');
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
