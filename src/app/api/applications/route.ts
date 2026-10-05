import { submissionSchema } from '@/lib/validation';
import { saveApplication } from '@/lib/store';
import {
  apiError,
  checkOrigin,
  clientKey,
  digest,
  rateKey,
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
    const saved = await saveApplication(
      data,
      idempotencyKey,
      hash,
      rateKey('submit-phone:' + data.phone),
    );
    return Response.json({ id: saved.id }, { status: saved.created ? 201 : 200 });
  } catch (error) {
    return apiError(error);
  }
}
