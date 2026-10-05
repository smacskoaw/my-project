import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { query } from './db';
const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'minassati_session';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(':');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const stored = Buffer.from(value, 'hex');
  return stored.length === key.length && timingSafeEqual(stored, key);
}
export async function currentAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const rows = await query<{ id: string; username: string }>(
    'SELECT a.id,a.username FROM sessions s JOIN admins a ON s.admin_id=a.id WHERE s.token_hash=$1 AND s.expires_at>NOW()',
    [digest(token)],
  );
  return rows[0] || null;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request) {
  if (
    request.headers.get('origin') !==
    new URL(process.env.APP_ORIGIN || 'http://localhost:3000').origin
  )
    throw new HttpError(403, 'تعذر التحقق من مصدر الطلب. حدّث الصفحة وحاول مجدداً.');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'صيغة الطلب غير مدعومة');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'الطلب فارغ');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 20000) {
      await reader.cancel();
      throw new HttpError(413, 'حجم الطلب أكبر من المسموح');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'البيانات المرسلة غير صالحة');
  }
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32))
    throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters');
  const hashed = createHmac('sha256', secret || 'local-development-only')
    .update(key)
    .digest('hex');
  const rows = await query<{ hits: number }>(
    `INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,NOW()+$2*INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<=NOW() THEN 1 ELSE rate_limits.hits+1 END, reset_at=CASE WHEN rate_limits.reset_at<=NOW() THEN NOW()+$2*INTERVAL '1 second' ELSE rate_limits.reset_at END RETURNING hits`,
    [hashed, seconds],
  );
  if (rows[0].hits > limit)
    throw new HttpError(429, 'محاولات كثيرة خلال وقت قصير. يرجى الانتظار ثم المحاولة مجدداً.');
}
export function clientKey(request: Request) {
  return process.env.TRUST_PROXY === 'true'
    ? (request.headers.get('x-real-ip') || 'unknown').slice(0, 80)
    : 'local';
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.status === 429 ? { 'Retry-After': '600' } : undefined,
      },
    );
  console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
  return Response.json(
    { error: 'تعذر إكمال العملية الآن. يرجى المحاولة لاحقاً.' },
    { status: 500 },
  );
}
