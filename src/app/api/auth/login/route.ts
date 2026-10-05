import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createSession, findAdmin } from '@/lib/store';
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
    const admin = await findAdmin(username);
    dummy ??= hashPassword(randomBytes(32).toString('hex'));
    const valid = await verifyPassword(password, admin?.password_hash || (await dummy));
    if (!admin || !valid) throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    const token = randomBytes(32).toString('hex');
    await createSession(digest(token), admin);
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
