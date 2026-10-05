import { submissionSchema } from '@/lib/validation';
import { query } from '@/lib/db';
import {
  apiError,
  checkOrigin,
  clientKey,
  digest,
  HttpError,
  rateLimit,
  readJson,
} from '@/lib/security';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await rateLimit('submit-ip:' + clientKey(request), 20, 600);
    const result = submissionSchema.safeParse(await readJson(request));
    if (!result.success)
      return Response.json(
        { error: 'يرجى مراجعة البيانات والموافقة على استخدامها.', fields: result.error.flatten() },
        { status: 400 },
      );
    const { data, idempotencyKey } = result.data;
    const hash = digest(JSON.stringify(data));
    const existing = await query<{ id: string; payload_hash: string }>(
      'SELECT id,payload_hash FROM applications WHERE idempotency_key=$1',
      [idempotencyKey],
    );
    if (existing[0]) {
      if (existing[0].payload_hash !== hash)
        throw new HttpError(409, 'تم استخدام هذا الطلب سابقاً ببيانات مختلفة. ابدأ طلباً جديداً.');
      return Response.json({ id: existing[0].id });
    }
    await rateLimit('submit-phone:' + data.phone, 1, 600);
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO applications(id,idempotency_key,payload_hash,data) VALUES($1,$2,$3,$4::jsonb)',
      [id, idempotencyKey, hash, JSON.stringify(data)],
    );
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
