'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserRound,
  BriefcaseBusiness,
  ShieldCheck,
  Check,
  LoaderCircle,
} from 'lucide-react';
import { cities, countries, education, labels, nationalities, specialties } from '@/lib/constants';
import { applicationSchema } from '@/lib/validation';
export const DRAFT_KEY = 'minassati-draft-v1';
export function ApplicationForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored);
        setValues(
          Object.fromEntries(Object.entries(draft.data || {}).map(([k, v]) => [k, String(v)])),
        );
      }
    } catch {
      setNotice('تعذر استعادة البيانات المحفوظة في هذه الجلسة.');
    }
  }, []);
  function update(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value, ...(name === 'country' ? { city: '' } : {}) }));
    setErrors((e) => ({ ...e, [name]: '' }));
  }
  function field(
    name: string,
    options?: readonly string[],
    extra?: {
      type?: string;
      optional?: boolean;
      placeholder?: string;
      max?: number;
      min?: number;
      wide?: boolean;
    },
  ) {
    const error = errors[name];
    const optional = extra?.optional;
    const props = {
      id: name,
      name,
      value: values[name] || '',
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
      ) => update(name, e.target.value),
      required: !optional,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${name}-error` : undefined,
    };
    return (
      <div className={'field ' + (extra?.wide ? 'field-wide' : '')} key={name}>
        <label htmlFor={name}>
          {labels[name]}{' '}
          {optional ? (
            <span className="optional">(اختياري)</span>
          ) : (
            <span className="required">*</span>
          )}
        </label>
        {options ? (
          <select {...props}>
            <option value="">اختر {labels[name]}</option>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : extra?.type === 'textarea' ? (
          <textarea {...props} rows={3} maxLength={extra.max} placeholder={extra.placeholder} />
        ) : (
          <input
            {...props}
            type={extra?.type || 'text'}
            min={extra?.min}
            max={extra?.type === 'number' ? extra.max : undefined}
            maxLength={extra?.type !== 'number' ? extra?.max : undefined}
            placeholder={extra?.placeholder}
            autoComplete={
              name === 'fullName'
                ? 'name'
                : name === 'phone'
                  ? 'tel'
                  : name === 'city'
                    ? 'address-level2'
                    : undefined
            }
            dir={name === 'phone' ? 'ltr' : undefined}
            list={name === 'city' ? 'city-options' : undefined}
          />
        )}{' '}
        {error && (
          <span className="field-error" id={`${name}-error`}>
            {error}
          </span>
        )}
      </div>
    );
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice('');
    const result = applicationSchema.safeParse({
      ...values,
      gender: values.gender || '',
      otherSpecialty: values.otherSpecialty || '',
      lastJob: values.lastJob || '',
      skills: values.skills || '',
      notes: values.notes || '',
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      let idempotencyKey = crypto.randomUUID();
      const previous = sessionStorage.getItem(DRAFT_KEY);
      if (previous) idempotencyKey = JSON.parse(previous).idempotencyKey || idempotencyKey;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ data: result.data, idempotencyKey }));
      router.push('/review');
    } catch {
      setBusy(false);
      setNotice('يرجى السماح بتخزين بيانات الجلسة في المتصفح لإكمال المراجعة.');
    }
  }
  return (
    <div className="application-layout">
      <aside className="application-aside">
        <div className="form-steps">
          <div className="active">
            <span>1</span>
            <div>
              <strong>البيانات الشخصية والمهنية</strong>
              <small>أخبرنا عنك وعن خبراتك</small>
            </div>
          </div>
          <div>
            <span>2</span>
            <div>
              <strong>المراجعة والإرسال</strong>
              <small>خطوة أخيرة قبل بداية جديدة</small>
            </div>
          </div>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={27} />
          <h3>خصوصيتك أولوية</h3>
          <p>تُستخدم معلوماتك للتوظيف والتواصل معك فقط، ولا تظهر للزوار.</p>
          <a href="/privacy">اطّلع على سياسة الخصوصية ←</a>
        </div>
        <div className="form-tip">
          <span className="small-check">
            <Check size={13} />
          </span>{' '}
          لا تحتاج إلى إرفاق سيرة ذاتية
        </div>
      </aside>
      <form className="application-form" onSubmit={submit} noValidate>
        <div className="form-card">
          <div className="form-card-heading">
            <span className="step-icon">
              <UserRound size={22} />
            </span>
            <div>
              <h3>أولاً، معلوماتك الأساسية</h3>
              <p>لنتعرّف عليك ونعرف كيف نتواصل معك.</p>
            </div>
            <span className="card-index">01</span>
          </div>
          <div className="fields-grid">
            {field('fullName', undefined, { placeholder: 'اكتب اسمك الكامل', max: 120 })}
            {field('phone', undefined, { type: 'tel', placeholder: '+964 770 123 4567', max: 30 })}
            {field('nationality', nationalities)}
            {field('country', countries)}
            {field('city', undefined, { placeholder: 'اكتب أو اختر مدينتك', max: 80 })}
            <datalist id="city-options">
              {(cities[values.country] || []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {field('age', undefined, {
              type: 'number',
              min: 18,
              max: 100,
              placeholder: 'العمر بالسنوات',
            })}
            {field('gender', ['ذكر', 'أنثى', 'أفضل عدم الإجابة'], { optional: true })}
          </div>
        </div>
        <div className="form-card">
          <div className="form-card-heading">
            <span className="step-icon">
              <BriefcaseBusiness size={22} />
            </span>
            <div>
              <h3>ثانياً، رحلتك المهنية</h3>
              <p>كل مهارة وخبرة تضيف شيئاً إلى قصتك.</p>
            </div>
            <span className="card-index">02</span>
          </div>
          <div className="fields-grid">
            {field('education', education)}
            {field('specialty', specialties)}
            {values.specialty === 'أخرى' &&
              field('otherSpecialty', undefined, {
                placeholder: 'اكتب تخصصك',
                max: 100,
                wide: true,
              })}
            {field('experience', undefined, {
              type: 'number',
              min: 0,
              max: 80,
              placeholder: '0 إذا كنت في بداية مسيرتك',
            })}
            {field('employed', ['نعم', 'لا'])}
            {field('lastJob', undefined, {
              optional: true,
              placeholder: 'المسمى الوظيفي الأخير',
              max: 150,
              wide: true,
            })}
            {field('skills', undefined, {
              type: 'textarea',
              optional: true,
              placeholder: 'مثال: استخدام الحاسوب، التواصل، إدارة الفريق…',
              max: 1500,
              wide: true,
            })}
            {field('notes', undefined, {
              type: 'textarea',
              optional: true,
              placeholder: 'هل هناك شيء آخر تود مشاركته معنا؟',
              max: 2000,
              wide: true,
            })}
          </div>
        </div>
        {notice && (
          <div className="alert error" role="alert">
            {notice}
          </div>
        )}
        <div className="form-bottom">
          <span>
            <ShieldCheck size={17} /> الحقول المميزة بـ <b className="required">*</b> مطلوبة
          </span>
          <button className="button" disabled={busy} type="submit">
            {busy ? (
              <LoaderCircle className="spin" size={19} />
            ) : (
              <>
                التالي <ArrowLeft size={19} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
