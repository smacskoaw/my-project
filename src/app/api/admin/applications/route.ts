import { currentAdmin, apiError, HttpError } from '@/lib/security';
import { listApplications } from '@/lib/applications';
export async function GET(request: Request) {
  try {
    if (!(await currentAdmin())) throw new HttpError(401, 'يرجى تسجيل الدخول');
    return Response.json(await listApplications(new URL(request.url).searchParams), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return apiError(error);
  }
}
