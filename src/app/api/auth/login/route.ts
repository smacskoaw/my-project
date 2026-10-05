import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { query } from '@/lib/db';
import {
  apiError,
  checkOrigin,
  clientKey,
  digest,
  hashPassword,
  HttpError,
  rateLimit,
  readJson,
  SESSION_COOKIE,
  verifyPassword,
} from '@/lib/security';
export const runtime = 'nodejs';
let dummy: Promise<string> | undefined;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit('login-ip:' + clientKey(request), 10, 600);
    const parsed = z
      .object({ username: z.string().trim().min(1).max(100), password: z.string().min(1).max(200) })
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, 'أدخل اسم المستخدم وكلمة المرور');
    const { username, password } = parsed.data;
    await rateLimit('login-user:' + username, 10, 600);
    const [admin] = await query<{ id: string; password_hash: string }>(
      'SELECT id,password_hash FROM admins WHERE username=$1',
      [username],
    );
    dummy ??= hashPassword(randomBytes(32).toString('hex'));
    const valid = await verifyPassword(password, admin?.password_hash || (await dummy));
    if (!admin || !valid) throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    const token = randomBytes(32).toString('hex');
    await query('DELETE FROM sessions WHERE expires_at<NOW()');
    await query(
      "INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '8 hours')",
      [digest(token), admin.id],
    );
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'strict',
      path: '/',
      maxAge: 28800,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
