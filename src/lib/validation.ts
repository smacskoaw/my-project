import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { countries, education, nationalities, specialties } from './constants';
export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)));
}
export function normalizePhone(value: string, country: string) {
  let input = normalizeDigits(value).replace(/[\s()\-]/g, '');
  if (input.startsWith('00')) input = '+' + input.slice(2);
  if (/^(964|963)/.test(input)) input = '+' + input;
  const phone = parsePhoneNumberFromString(input, {
    defaultCountry: country === 'العراق' ? 'IQ' : 'SY',
    extract: false,
  });
  return phone?.isValid() ? phone.number : null;
}
const text = (min: number, max: number) =>
  z
    .string({ error: 'هذا الحقل مطلوب' })
    .trim()
    .min(min, 'هذا الحقل مطلوب أو قصير جداً')
    .max(max, `الحد الأقصى ${max} حرفاً`);
const number = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? Number(normalizeDigits(v)) : v),
    z
      .number({ error: 'أدخل عدداً صحيحاً' })
      .int('أدخل عدداً صحيحاً')
      .min(min, `الحد الأدنى ${min}`)
      .max(max, `الحد الأقصى ${max}`),
  );
const choice = { error: 'يرجى اختيار قيمة من القائمة' };
export const applicationSchema = z
  .object({
    fullName: text(3, 120),
    phone: text(7, 30),
    nationality: z.enum(nationalities, choice),
    country: z.enum(countries, choice),
    city: text(2, 80),
    age: number(18, 100),
    gender: z.enum(['', 'ذكر', 'أنثى', 'أفضل عدم الإجابة'], choice).default(''),
    education: z.enum(education, choice),
    specialty: z.enum(specialties, choice),
    otherSpecialty: text(0, 100).default(''),
    experience: number(0, 80),
    lastJob: text(0, 150).default(''),
    employed: z.enum(['نعم', 'لا'], choice),
    skills: text(0, 1500).default(''),
    notes: text(0, 2000).default(''),
  })
  .superRefine((d, ctx) => {
    if (!normalizePhone(d.phone, d.country))
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'أدخل رقم هاتف صحيحاً مع رمز الدولة، مثل +964 أو +963',
      });
    if (d.specialty === 'أخرى' && d.otherSpecialty.length < 2)
      ctx.addIssue({ code: 'custom', path: ['otherSpecialty'], message: 'يرجى كتابة تخصصك' });
    if (d.experience > d.age - 14)
      ctx.addIssue({
        code: 'custom',
        path: ['experience'],
        message: 'سنوات الخبرة لا تتناسب مع العمر',
      });
  })
  .transform((d) => ({
    ...d,
    phone: normalizePhone(d.phone, d.country)!,
    otherSpecialty: d.specialty === 'أخرى' ? d.otherSpecialty : '',
  }));
export const submissionSchema = z.object({
  data: applicationSchema,
  consent: z.literal(true, { error: 'الموافقة على استخدام البيانات مطلوبة' }),
  idempotencyKey: z.uuid(),
});
export type ApplicationData = z.output<typeof applicationSchema>;
export type ApplicationRecord = {
  id: string;
  data: ApplicationData;
  status: string;
  created_at: string;
  consented_at: string;
};
export function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent('مرحباً، نتواصل معك بخصوص طلب التوظيف الذي قمت بتقديمه عبر منصة منصتي.')}`;
}
