import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/store';
import { apiError, checkOrigin, digest, SESSION_COOKIE } from '@/lib/security';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) await deleteSession(digest(token));
    jar.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
