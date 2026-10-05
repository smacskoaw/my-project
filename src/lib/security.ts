import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { incrementLimit, sessionAdmin } from './store';
import { HttpError } from './errors';
import { appOrigin } from './runtime-config';
export { HttpError } from './errors';
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
  return sessionAdmin(digest(token));
}
export function checkOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(appOrigin()).origin)
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
export function rateKey(key: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32))
    throw new Error('RATE_LIMIT_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret || 'local-development-only')
    .update(key)
    .digest('hex');
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  if ((await incrementLimit(rateKey(key), seconds)) > limit)
    throw new HttpError(429, 'محاولات كثيرة خلال وقت قصير. يرجى الانتظار ثم المحاولة مجدداً.');
}
export function clientKey(request: Request) {
  if (process.env.TRUST_PROXY === 'true' && process.env.RENDER === 'true')
    return (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown').slice(
      0,
      80,
    );
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
