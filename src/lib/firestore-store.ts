import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, type Transaction, type Query } from 'firebase-admin/firestore';
import { firestore } from './firebase-admin';
import { HttpError } from './errors';
import { normalizeSearch, searchTokens } from './firestore-search';
import type { AdminRecord } from './store';
import type { ApplicationData, ApplicationRecord } from './validation';
export const collections = {
  applications: 'minassati_applications',
  admins: 'minassati_admins',
  sessions: 'minassati_sessions',
  limits: 'minassati_rate_limits',
  stats: 'minassati_stats',
  cities: 'minassati_cities',
  specialties: 'minassati_specialties',
};
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export const baghdadDay = (date: Date) =>
  date.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });

export async function findAdmin(username: string): Promise<AdminRecord | null> {
  const doc = await firestore().collection(collections.admins).doc(hash(username)).get();
  return doc.exists ? ({ ...doc.data(), id: doc.id } as AdminRecord) : null;
}
export async function upsertAdmin(username: string, passwordHash: string) {
  await firestore().collection(collections.admins).doc(hash(username)).set({
    username,
    password_hash: passwordHash,
    version: crypto.randomUUID(),
    updated_at: Timestamp.now(),
  });
}
export async function sessionAdmin(tokenHash: string) {
  const db = firestore();
  const snapshot = await db.collection(collections.sessions).doc(tokenHash).get();
  if (!snapshot.exists) return null;
  const session = snapshot.data()!;
  if (session.expires_at.toMillis() <= Date.now()) return null;
  const admin = await db.collection(collections.admins).doc(session.admin_id).get();
  if (!admin.exists || admin.data()!.version !== session.admin_version) return null;
  return { id: admin.id, username: admin.data()!.username as string };
}
export async function createSession(tokenHash: string, admin: AdminRecord) {
  await firestore()
    .collection(collections.sessions)
    .doc(tokenHash)
    .create({
      admin_id: admin.id,
      admin_version: admin.version,
      expires_at: Timestamp.fromMillis(Date.now() + 28800000),
    });
}
export async function deleteSession(tokenHash: string) {
  await firestore().collection(collections.sessions).doc(tokenHash).delete();
}
export async function incrementLimit(key: string, seconds: number) {
  const db = firestore();
  const ref = db.collection(collections.limits).doc(key);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const previous = doc.data();
    const now = Date.now();
    const reset = !previous || previous.reset_at.toMillis() <= now;
    const hits = reset ? 1 : previous.hits + 1;
    tx.set(ref, {
      hits,
      reset_at: reset ? Timestamp.fromMillis(now + seconds * 1000) : previous.reset_at,
    });
    return hits;
  });
}
function updateCounters(tx: Transaction, data: ApplicationData, createdAt: Date, delta: number) {
  const db = firestore();
  const specialty = data.specialty === 'أخرى' ? data.otherSpecialty : data.specialty;
  const counters: Record<string, unknown> = { total: FieldValue.increment(delta) };
  counters[data.country === 'العراق' ? 'iraq' : 'syria'] = FieldValue.increment(delta);
  tx.set(db.collection(collections.stats).doc('global'), counters, { merge: true });
  tx.set(
    db.collection(collections.stats).doc('day-' + baghdadDay(createdAt)),
    { total: FieldValue.increment(delta) },
    { merge: true },
  );
  tx.set(
    db.collection(collections.cities).doc(hash(data.city)),
    { name: data.city, count: FieldValue.increment(delta) },
    { merge: true },
  );
  tx.set(
    db.collection(collections.specialties).doc(hash(specialty)),
    { name: specialty, count: FieldValue.increment(delta) },
    { merge: true },
  );
}
export async function saveApplication(
  data: ApplicationData,
  key: string,
  payloadHash: string,
  phoneRateKey: string,
) {
  const db = firestore();
  const ref = db.collection(collections.applications).doc(key);
  const rate = db.collection(collections.limits).doc(phoneRateKey);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      if (existing.data()!.payload_hash !== payloadHash)
        throw new HttpError(409, 'تم استخدام هذا الطلب سابقاً ببيانات مختلفة. ابدأ طلباً جديداً.');
      return { id: key, created: false };
    }
    const rateDoc = await tx.get(rate);
    const now = Date.now();
    if (rateDoc.exists && rateDoc.data()!.reset_at.toMillis() > now)
      throw new HttpError(429, 'تم إرسال طلب لهذا الرقم مؤخراً. يرجى الانتظار قبل إرسال طلب جديد.');
    const date = new Date(now);
    tx.create(ref, {
      data,
      payload_hash: payloadHash,
      status: 'جديد',
      created_at: Timestamp.fromDate(date),
      consented_at: Timestamp.fromDate(date),
      search_tokens: searchTokens(data.fullName, data.phone),
    });
    tx.set(rate, { hits: 1, reset_at: Timestamp.fromMillis(now + 600000) });
    updateCounters(tx, data, date, 1);
    return { id: key, created: true };
  });
}
export async function updateApplication(id: string, status: string) {
  const db = firestore();
  const ref = db.collection(collections.applications).doc(id);
  await db.runTransaction(async (tx) => {
    if (!(await tx.get(ref)).exists) throw new HttpError(404, 'الطلب غير موجود');
    tx.update(ref, { status });
  });
}
export async function deleteApplication(id: string) {
  const db = firestore();
  const ref = db.collection(collections.applications).doc(id);
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new HttpError(404, 'الطلب غير موجود');
    const record = doc.data()!;
    updateCounters(tx, record.data, record.created_at.toDate(), -1);
    tx.delete(ref);
  });
}
export async function listApplications(params: URLSearchParams) {
  const db = firestore();
  let filtered: Query = db.collection(collections.applications);
  for (const field of ['nationality', 'city', 'education', 'specialty']) {
    const value = params.get(field);
    if (value) filtered = filtered.where('data.' + field, '==', value.slice(0, 150));
  }
  if (params.get('status')) filtered = filtered.where('status', '==', params.get('status'));
  const search = normalizeSearch((params.get('q') || '').slice(0, 120));
  if (search) filtered = filtered.where('search_tokens', 'array-contains', search);
  const total = (await filtered.count().get()).data().count;
  const pages = Math.max(1, Math.ceil(total / 12));
  const requested = Number(params.get('page') || 1);
  const page = Math.min(pages, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const direction = params.get('sort') === 'oldest' ? 'asc' : 'desc';
  const [docs, global, today, cities, specialties] = await Promise.all([
    filtered
      .orderBy('created_at', direction)
      .offset((page - 1) * 12)
      .limit(12)
      .get(),
    db.collection(collections.stats).doc('global').get(),
    db
      .collection(collections.stats)
      .doc('day-' + baghdadDay(new Date()))
      .get(),
    db.collection(collections.cities).where('count', '>', 0).get(),
    db.collection(collections.specialties).where('count', '>', 0).count().get(),
  ]);
  const counters = global.data() || {};
  const rows: ApplicationRecord[] = docs.docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      data: r.data,
      status: r.status,
      created_at: r.created_at.toDate().toISOString(),
      consented_at: r.consented_at.toDate().toISOString(),
    };
  });
  return {
    rows,
    total,
    page,
    pages,
    stats: {
      total: counters.total || 0,
      today: today.data()?.total || 0,
      iraq: counters.iraq || 0,
      syria: counters.syria || 0,
      specialties: specialties.data().count,
    },
    cities: cities.docs
      .map((d) => d.data().name as string)
      .sort((a, b) => a.localeCompare(b, 'ar')),
  };
}
