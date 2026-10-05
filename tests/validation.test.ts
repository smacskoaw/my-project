import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applicationSchema,
  normalizePhone,
  submissionSchema,
  whatsappUrl,
} from '../src/lib/validation';
export const valid = {
  fullName: 'أحمد محمد علي',
  phone: '07701234567',
  nationality: 'عراقي',
  country: 'العراق',
  city: 'بغداد',
  age: '28',
  education: 'بكالوريوس',
  specialty: 'البرمجة',
  experience: '5',
  employed: 'لا',
  skills: 'React',
};
test('normalizes Iraqi, Syrian, Arabic and international phone numbers', () => {
  assert.equal(normalizePhone('٠٧٧٠١٢٣٤٥٦٧', 'العراق'), '+9647701234567');
  assert.equal(normalizePhone('0944123456', 'سوريا'), '+963944123456');
  assert.equal(normalizePhone('00964 770 123 4567', 'العراق'), '+9647701234567');
  assert.equal(normalizePhone('123', 'العراق'), null);
});
test('validates all fields and clears irrelevant other specialty', () => {
  const data = applicationSchema.parse({ ...valid, otherSpecialty: 'ignored' });
  assert.equal(data.phone, '+9647701234567');
  assert.equal(data.age, 28);
  assert.equal(data.otherSpecialty, '');
});
test('rejects missing, malformed, out of range and impossible data', () => {
  for (const change of [
    { fullName: '' },
    { phone: 'abc' },
    { age: '' },
    { age: 17 },
    { age: 101 },
    { age: 18, experience: 20 },
    { country: 'الأردن' },
    { specialty: 'أخرى' },
    { education: 'invalid' },
  ])
    assert.equal(
      applicationSchema.safeParse({ ...valid, ...change }).success,
      false,
      JSON.stringify(change),
    );
});
test('consent is mandatory and idempotency keys must be UUIDs', () => {
  const body = { data: valid, consent: true, idempotencyKey: crypto.randomUUID() };
  assert.equal(submissionSchema.safeParse(body).success, true);
  assert.equal(submissionSchema.safeParse({ ...body, consent: false }).success, false);
  assert.equal(submissionSchema.safeParse({ ...body, idempotencyKey: 'x' }).success, false);
});
test('WhatsApp link uses digits only and encoded Arabic message', () => {
  const url = new URL(whatsappUrl('+9647701234567'));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/9647701234567');
  assert.match(url.searchParams.get('text')!, /منصتي/);
});
