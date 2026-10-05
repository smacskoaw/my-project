import { query } from '../src/lib/db';
import { hashPassword } from '../src/lib/security';
async function main() {
  if (process.env.DATABASE_PROVIDER === 'firestore') {
    if (
      process.env.FIREBASE_PROJECT_ID !== 'demo-minassati' ||
      !/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')
    )
      throw new Error('Firebase fixtures require the demo project and local emulator.');
    const { saveApplication, upsertAdmin } = await import('../src/lib/firestore-store');
    const { applicationSchema } = await import('../src/lib/validation');
    const reset = await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-minassati/databases/(default)/documents`,
      { method: 'DELETE' },
    );
    if (!reset.ok) throw new Error('Emulator reset failed');
    await upsertAdmin('test-admin', await hashPassword('Test-only-password-482!'));
    for (let i = 0; i < 15; i++)
      await saveApplication(
        applicationSchema.parse({
          fullName: `متقدم تجريبي ${i}`,
          phone: `+9639441234${String(i).padStart(2, '0')}`,
          nationality: 'سوري',
          country: 'سوريا',
          city: i % 2 ? 'دمشق' : 'حلب',
          age: 30,
          education: 'بكالوريوس',
          specialty: i % 2 ? 'التعليم' : 'المحاسبة',
          experience: 5,
          employed: 'لا',
          skills: 'التواصل',
        }),
        crypto.randomUUID(),
        'test',
        'fixture-' + i,
      );
    console.log('Isolated Firestore emulator fixtures ready.');
    return;
  }
  if (process.env.DATABASE_URL || process.env.DATABASE_DIR !== '.test-data/e2e')
    throw new Error('Fixtures are allowed only in the dedicated local test database.');
  await query('DELETE FROM applications');
  await query('DELETE FROM rate_limits');
  await query('DELETE FROM sessions');
  await query('DELETE FROM admins');
  await query('INSERT INTO admins(id,username,password_hash) VALUES($1,$2,$3)', [
    crypto.randomUUID(),
    'test-admin',
    await hashPassword('Test-only-password-482!'),
  ]);
  for (let i = 0; i < 15; i++) {
    const data = {
      fullName: `متقدم تجريبي ${i}`,
      phone: `+9639441234${String(i).padStart(2, '0')}`,
      nationality: 'سوري',
      country: 'سوريا',
      city: i % 2 ? 'دمشق' : 'حلب',
      age: 30,
      gender: '',
      education: 'بكالوريوس',
      specialty: i % 2 ? 'التعليم' : 'المحاسبة',
      otherSpecialty: '',
      experience: 5,
      lastJob: '',
      employed: 'لا',
      skills: 'التواصل',
      notes: '',
    };
    await query(
      'INSERT INTO applications(id,idempotency_key,payload_hash,data) VALUES($1,$2,$3,$4)',
      [crypto.randomUUID(), crypto.randomUUID(), 'test', JSON.stringify(data)],
    );
  }
  console.log('Isolated E2E fixtures ready.');
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
