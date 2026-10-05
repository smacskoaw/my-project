import { before, after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { applicationSchema } from '../../src/lib/validation';
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-minassati',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => {
  await env.cleanup();
});
const data = applicationSchema.parse({
  fullName: 'متقدم اختبار الحماية',
  phone: '+9647700000098',
  nationality: 'عراقي',
  country: 'العراق',
  city: 'بغداد',
  age: 28,
  education: 'بكالوريوس',
  specialty: 'البرمجة',
  experience: 4,
  employed: 'لا',
});
function submit(
  uid: string,
  id = crypto.randomUUID(),
  changes: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  const db = env.authenticatedContext(uid).firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, 'minassati_applications', id), {
    data: { ...data, ...changes },
    status: 'جديد',
    owner_uid: uid,
    created_at: serverTimestamp(),
    consented_at: serverTimestamp(),
    ...extra,
  });
  batch.set(doc(db, 'minassati_submitters', uid), {
    submitted_at: serverTimestamp(),
    application_id: id,
  });
  batch.set(doc(db, 'minassati_submitters', uid, 'receipts', id), {
    submitted_at: serverTimestamp(),
  });
  return { commit: () => batch.commit(), id, db };
}
test('public cannot read applicants or server credentials, nor submit without auth', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, 'minassati_applications')));
  await assertFails(getDoc(doc(db, 'minassati_admins', 'anything')));
  await assertFails(setDoc(doc(db, 'minassati_applications', crypto.randomUUID()), { data }));
});
test('atomic authenticated submission works but applicant cannot read, change or delete it', async () => {
  const submission = submit('visitor-one');
  await assertSucceeds(submission.commit());
  await assertSucceeds(
    getDoc(doc(submission.db, 'minassati_submitters', 'visitor-one', 'receipts', submission.id)),
  );
  const ref = doc(submission.db, 'minassati_applications', submission.id);
  await assertFails(getDoc(ref));
  await assertFails(getDocs(collection(submission.db, 'minassati_applications')));
  await assertFails(updateDoc(ref, { status: 'مقبول' }));
  await assertFails(deleteDoc(ref));
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext('other').firestore(),
        'minassati_submitters',
        'visitor-one',
        'receipts',
        submission.id,
      ),
    ),
  );
  await assertFails(submit('visitor-one').commit());
  await assertFails(deleteDoc(doc(submission.db, 'minassati_submitters', 'visitor-one')));
});
test('rules reject invalid, oversize, extra fields and forged admin status', async () => {
  for (const change of [
    { age: 12 },
    { age: 20, experience: 30 },
    { fullName: 'x' },
    { phone: 'bad' },
    { country: 'bad' },
    { specialty: 'bad' },
    { notes: 'x'.repeat(2001) },
    { extra: 'injected' },
  ]) {
    await assertFails(submit(crypto.randomUUID(), undefined, change).commit());
  }
  await assertFails(submit('forged-status', undefined, {}, { status: 'مقبول' }).commit());
  await assertFails(submit('forged-time', undefined, {}, { consented_at: null }).commit());
});
test('cannot skip atomic gate/receipt or elevate an ordinary account', async () => {
  const db = env
    .authenticatedContext('impostor', { email: 'ahmadshaheen@admin.sgyqkl.firebaseapp.com' })
    .firestore();
  await assertFails(
    setDoc(doc(db, 'minassati_applications', crypto.randomUUID()), {
      data,
      status: 'جديد',
      owner_uid: 'impostor',
      created_at: serverTimestamp(),
      consented_at: serverTimestamp(),
    }),
  );
  await assertFails(getDocs(collection(db, 'minassati_applications')));
  await assertFails(setDoc(doc(db, 'minassati_admins', 'impostor'), { minassatiAdmin: true }));
});
test('custom-claim administrator reads, changes only status and deletes', async () => {
  const submission = submit('admin-test-applicant');
  await assertSucceeds(submission.commit());
  const db = env.authenticatedContext('real-admin', { minassatiAdmin: true }).firestore();
  const ref = doc(db, 'minassati_applications', submission.id);
  await assertSucceeds(getDocs(collection(db, 'minassati_applications')));
  await assertSucceeds(updateDoc(ref, { status: 'تم التواصل' }));
  await assertFails(updateDoc(ref, { 'data.fullName': 'changed' }));
  await assertFails(updateDoc(ref, { status: 'bad' }));
  await assertSucceeds(deleteDoc(ref));
});
