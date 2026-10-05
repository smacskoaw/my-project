import { config } from 'dotenv';
import { Timestamp } from 'firebase-admin/firestore';
config({ path: '.env.local', quiet: true });
config({ quiet: true });
async function main() {
  if (process.env.DATABASE_PROVIDER !== 'firestore')
    throw new Error('This command is only for Firestore.');
  const { firestore } = await import('../src/lib/firebase-admin');
  const db = firestore();
  for (const [collection, field] of [
    ['minassati_sessions', 'expires_at'],
    ['minassati_rate_limits', 'reset_at'],
  ]) {
    const docs = await db
      .collection(collection)
      .where(field, '<', Timestamp.fromMillis(Date.now() - 86400000))
      .limit(400)
      .get();
    const batch = db.batch();
    for (const doc of docs.docs) batch.delete(doc.ref);
    if (!docs.empty) await batch.commit();
    console.log(collection + ': ' + docs.size + ' expired records removed');
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Cleanup failed: ' + (e.code || e.name));
    process.exit(1);
  });
