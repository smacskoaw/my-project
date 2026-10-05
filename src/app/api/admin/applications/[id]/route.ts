import { z } from 'zod';
import { statuses } from '@/lib/constants';
import { query } from '@/lib/db';
import { apiError, checkOrigin, currentAdmin, HttpError, readJson } from '@/lib/security';
type Context = { params: Promise<{ id: string }> };
async function authorize(request: Request, context: Context) {
  checkOrigin(request);
  if (!(await currentAdmin())) throw new HttpError(401, 'يرجى تسجيل الدخول');
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, 'الطلب غير موجود');
  return id;
}
export async function PATCH(request: Request, context: Context) {
  try {
    const id = await authorize(request, context);
    const body = z.object({ status: z.enum(statuses) }).safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'حالة غير صالحة');
    const rows = await query('UPDATE applications SET status=$1 WHERE id=$2 RETURNING id', [
      body.data.status,
      id,
    ]);
    if (!rows.length) throw new HttpError(404, 'الطلب غير موجود');
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const id = await authorize(request, context);
    const rows = await query('DELETE FROM applications WHERE id=$1 RETURNING id', [id]);
    if (!rows.length) throw new HttpError(404, 'الطلب غير موجود');
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
