import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, getApps } from 'firebase-admin/app';
import { Timestamp } from 'firebase-admin/firestore';
import { applicationSchema } from '../../src/lib/validation';
import { HttpError } from '../../src/lib/errors';
import { firestore } from '../../src/lib/firebase-admin';
import * as store from '../../src/lib/firestore-store';
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || ''))
  throw new Error('Tests require the local Firestore emulator.');
process.env.FIREBASE_PROJECT_ID = 'demo-minassati';
process.env.DATABASE_PROVIDER = 'firestore';
const valid = applicationSchema.parse({
  fullName: 'أحمد محمد علي',
  phone: '07701234567',
  nationality: 'عراقي',
  country: 'العراق',
  city: 'بغداد',
  age: 28,
  education: 'بكالوريوس',
  specialty: 'البرمجة',
  experience: 5,
  employed: 'لا',
});
after(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)));
});
test('Firestore storage, auth and access rules', { timeout: 120000 }, async (t) => {
  const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}`;
  const reset = await fetch(
    `${base}/emulator/v1/projects/demo-minassati/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  assert.equal(reset.ok, true);
  const key = crypto.randomUUID();
  await t.test(
    'atomic duplicate submission writes only one applicant and one set of counters',
    async () => {
      const saves = await Promise.all(
        Array.from({ length: 3 }, () =>
          store.saveApplication(valid, key, 'payload-hash', 'phone-key'),
        ),
      );
      assert.equal(saves.filter((s) => s.created).length, 1);
      assert.equal(new Set(saves.map((s) => s.id)).size, 1);
      const list = await store.listApplications(new URLSearchParams());
      assert.equal(list.total, 1);
      assert.equal(list.stats.total, 1);
      assert.equal(list.stats.iraq, 1);
      assert.equal(list.stats.today, 1);
      assert.equal(list.stats.specialties, 1);
      assert.deepEqual(list.cities, ['بغداد']);
      await assert.rejects(
        () => store.saveApplication(valid, key, 'different', 'phone-key'),
        (e) => e instanceof HttpError && e.status === 409,
      );
      await assert.rejects(
        () => store.saveApplication(valid, crypto.randomUUID(), 'payload-hash', 'phone-key'),
        (e) => e instanceof HttpError && e.status === 429,
      );
    },
  );
  await t.test('direct unauthenticated Firestore reads and writes are denied', async () => {
    const url = `${base}/v1/projects/demo-minassati/databases/(default)/documents/minassati_applications/${key}`;
    assert.equal((await fetch(url)).status, 403);
    assert.equal(
      (
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { status: { stringValue: 'مقبول' } } }),
        })
      ).status,
      403,
    );
    const adminUrl = `${base}/v1/projects/demo-minassati/databases/(default)/documents/minassati_admins`;
    assert.equal((await fetch(adminUrl)).status, 403);
  });
  await t.test('search, combined filters, pagination and sorting work', async () => {
    for (let i = 0; i < 13; i++)
      await store.saveApplication(
        {
          ...valid,
          fullName: `سارة اختبار ${i}`,
          phone: `+9639441234${String(i).padStart(2, '0')}`,
          country: 'سوريا',
          nationality: 'سوري',
          city: 'دمشق',
          specialty: 'التعليم',
        },
        crypto.randomUUID(),
        'hash-' + i,
        'phone-' + i,
      );
    const list = await store.listApplications(new URLSearchParams({ page: '2' }));
    assert.equal(list.total, 14);
    assert.equal(list.rows.length, 2);
    assert.equal(list.pages, 2);
    assert.equal(list.stats.syria, 13);
    const search = await store.listApplications(
      new URLSearchParams({
        q: '٠٧٧٠١٢٣٤٥٦٧',
        city: 'بغداد',
        nationality: 'عراقي',
        education: 'بكالوريوس',
        specialty: 'البرمجة',
        status: 'جديد',
      }),
    );
    assert.equal(search.total, 1);
    assert.equal(search.rows[0].id, key);
    assert.equal((await store.listApplications(new URLSearchParams({ q: 'محم' }))).total, 1);
    assert.equal(
      (await store.listApplications(new URLSearchParams({ sort: 'oldest' }))).rows[0].id,
      key,
    );
  });
  await t.test('changing status and deleting update counts consistently', async () => {
    await store.updateApplication(key, 'مقبول');
    assert.equal((await store.listApplications(new URLSearchParams({ status: 'مقبول' }))).total, 1);
    await store.deleteApplication(key);
    const list = await store.listApplications(new URLSearchParams());
    assert.equal(list.stats.total, 13);
    assert.equal(list.stats.iraq, 0);
    assert.equal(list.stats.specialties, 1);
    assert.deepEqual(list.cities, ['دمشق']);
    await assert.rejects(
      () => store.deleteApplication(key),
      (e) => e instanceof HttpError && e.status === 404,
    );
    assert.equal((await store.listApplications(new URLSearchParams())).stats.total, 13);
  });
  await t.test(
    'password resets invalidate old admin sessions; expiry and logout are enforced',
    async () => {
      await store.upsertAdmin('test-admin', 'old-hash');
      const admin = (await store.findAdmin('test-admin'))!;
      await store.createSession('token-one', admin);
      assert.equal((await store.sessionAdmin('token-one'))?.username, 'test-admin');
      await store.upsertAdmin('test-admin', 'new-hash');
      assert.equal(await store.sessionAdmin('token-one'), null);
      // A login racing with a password reset must not revive an old password's session.
      await store.createSession('token-race', admin);
      assert.equal(await store.sessionAdmin('token-race'), null);
      const updated = (await store.findAdmin('test-admin'))!;
      await store.createSession('token-two', updated);
      await store.deleteSession('token-two');
      assert.equal(await store.sessionAdmin('token-two'), null);
      await store.createSession('expired', updated);
      await firestore()
        .collection(store.collections.sessions)
        .doc('expired')
        .update({ expires_at: Timestamp.fromMillis(0) });
      assert.equal(await store.sessionAdmin('expired'), null);
    },
  );
  await t.test('rate limit increments are shared and transactional', async () => {
    const counts = await Promise.all(
      Array.from({ length: 3 }, () => store.incrementLimit('test-limit', 600)),
    );
    assert.deepEqual(
      counts.sort((a, b) => a - b),
      [1, 2, 3],
    );
  });
});
