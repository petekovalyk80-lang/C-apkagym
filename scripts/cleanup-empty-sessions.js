/* Usuwa puste sesje (0 serii) — sprząta artefakty testów. Uruchom: node scripts/cleanup-empty-sessions.js */
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
  let deleted = 0;
  for (const u of users.docs) {
    const sess = await db.collection('users').doc(u.id).collection('sessions').get();
    for (const s of sess.docs) {
      const sets = await s.ref.collection('sets').get();
      if (sets.size === 0) {
        await s.ref.delete();
        deleted++;
        console.log('  usunięto pustą sesję', u.id, s.id, '(workout', s.data().workoutId + ')');
      }
    }
  }
  console.log(`✅ Usunięto pustych sesji: ${deleted}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
