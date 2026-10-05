import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { apiError, checkOrigin, digest, SESSION_COOKIE } from '@/lib/security';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) await query('DELETE FROM sessions WHERE token_hash=$1', [digest(token)]);
    jar.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
