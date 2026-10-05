import { query } from './db';
import { databaseProvider, validateProductionConfig } from './runtime-config';
import { HttpError } from './errors';
import type { ApplicationData } from './validation';
export type AdminRecord = { id: string; username: string; password_hash: string; version?: string };
const useFirestore = () => databaseProvider() === 'firestore';
const firebase = () => import('./firestore-store');

export async function findAdmin(username: string): Promise<AdminRecord | null> {
  validateProductionConfig();
  if (useFirestore()) return (await firebase()).findAdmin(username);
  return (
    (
      await query<AdminRecord>('SELECT id,username,password_hash FROM admins WHERE username=$1', [
        username,
      ])
    )[0] || null
  );
}
export async function upsertAdmin(username: string, passwordHash: string) {
  if (useFirestore()) return (await firebase()).upsertAdmin(username, passwordHash);
  await query(
    'INSERT INTO admins(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash',
    [crypto.randomUUID(), username, passwordHash],
  );
  await query('DELETE FROM sessions WHERE admin_id=(SELECT id FROM admins WHERE username=$1)', [
    username,
  ]);
}
export async function sessionAdmin(
  tokenHash: string,
): Promise<{ id: string; username: string } | null> {
  if (useFirestore()) return (await firebase()).sessionAdmin(tokenHash);
  return (
    (
      await query<{ id: string; username: string }>(
        'SELECT a.id,a.username FROM sessions s JOIN admins a ON s.admin_id=a.id WHERE s.token_hash=$1 AND s.expires_at>NOW()',
        [tokenHash],
      )
    )[0] || null
  );
}
export async function createSession(tokenHash: string, admin: AdminRecord) {
  if (useFirestore()) return (await firebase()).createSession(tokenHash, admin);
  await query('DELETE FROM sessions WHERE expires_at<NOW()');
  await query(
    "INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')",
    [tokenHash, admin.id],
  );
}
export async function deleteSession(tokenHash: string) {
  if (useFirestore()) return (await firebase()).deleteSession(tokenHash);
  await query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash]);
}
export async function incrementLimit(key: string, seconds: number): Promise<number> {
  if (useFirestore()) return (await firebase()).incrementLimit(key, seconds);
  return (
    await query<{ hits: number }>(
      `INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,NOW()+$2*INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<=NOW() THEN 1 ELSE rate_limits.hits+1 END, reset_at=CASE WHEN rate_limits.reset_at<=NOW() THEN NOW()+$2*INTERVAL '1 second' ELSE rate_limits.reset_at END RETURNING hits`,
      [key, seconds],
    )
  )[0].hits;
}
export async function saveApplication(
  data: ApplicationData,
  key: string,
  payloadHash: string,
  phoneRateKey: string,
): Promise<{ id: string; created: boolean }> {
  if (useFirestore())
    return (await firebase()).saveApplication(data, key, payloadHash, phoneRateKey);
  const existing = (
    await query<{ id: string; payload_hash: string }>(
      'SELECT id,payload_hash FROM applications WHERE idempotency_key=$1',
      [key],
    )
  )[0];
  if (existing) {
    if (existing.payload_hash !== payloadHash)
      throw new HttpError(409, 'تم استخدام هذا الطلب سابقاً ببيانات مختلفة. ابدأ طلباً جديداً.');
    return { id: existing.id, created: false };
  }
  if ((await incrementLimit(phoneRateKey, 600)) > 1)
    throw new HttpError(429, 'تم إرسال طلب لهذا الرقم مؤخراً. يرجى الانتظار قبل إرسال طلب جديد.');
  const id = crypto.randomUUID();
  await query(
    'INSERT INTO applications(id,idempotency_key,payload_hash,data) VALUES($1,$2,$3,$4::jsonb)',
    [id, key, payloadHash, JSON.stringify(data)],
  );
  return { id, created: true };
}
export async function updateApplication(id: string, status: string) {
  if (useFirestore()) return (await firebase()).updateApplication(id, status);
  const rows = await query('UPDATE applications SET status=$1 WHERE id=$2 RETURNING id', [
    status,
    id,
  ]);
  if (!rows.length) throw new HttpError(404, 'الطلب غير موجود');
}
export async function deleteApplication(id: string) {
  if (useFirestore()) return (await firebase()).deleteApplication(id);
  const rows = await query('DELETE FROM applications WHERE id=$1 RETURNING id', [id]);
  if (!rows.length) throw new HttpError(404, 'الطلب غير موجود');
}
