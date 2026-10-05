import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
config({ quiet: true });
async function main() {
  if (process.env.DATABASE_PROVIDER !== 'firestore')
    throw new Error('Set DATABASE_PROVIDER=firestore before checking the connection.');
  const { firestore } = await import('../src/lib/firebase-admin');
  // One read, no writes, and never print applicant data or credentials.
  await firestore().collection('minassati_stats').doc('global').get();
  console.log('Firestore connection verified for project ' + process.env.FIREBASE_PROJECT_ID);
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(
      'Firestore check failed: ' +
        (e.code || e.name) +
        '. Verify project, database creation and server credentials.',
    );
    process.exit(1);
  });
