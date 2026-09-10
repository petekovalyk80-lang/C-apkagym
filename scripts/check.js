/* Diagnostyka: zrzut users/plans/sessions/sets. Uruchom: node scripts/check.js */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const ROOT = path.join(__dirname, '..');
const keyFile = fs.readdirSync(ROOT).find((f) => /firebase-adminsdk.*\.json$/i.test(f));
initializeApp({ credential: cert(require(path.join(ROOT, keyFile))) });
const db = getFirestore();

(async () => {
  const users = await db.collection('users').get();
  console.log('users:', users.size);
  for (const u of users.docs) {
    console.log(' user', u.id, JSON.stringify(u.data()));
    const plans = await db.collection('users').doc(u.id).collection('plans').get();
    console.log('   plans:', plans.docs.map((p) => p.id).join(',') || '(brak)');
    const sess = await db.collection('users').doc(u.id).collection('sessions').get();
    console.log('   sessions:', sess.size);
    for (const s of sess.docs) {
      const sets = await s.ref.collection('sets').get();
      console.log(
        '     session', s.id, 'workout', s.data().workoutId,
        'completedAt', s.data().completedAt ? 'tak' : 'null',
        'sets:', sets.size,
        sets.docs.map((x) => `${x.data().exerciseId} ${x.data().weight}x${x.data().reps}`).join(' | '),
      );
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
