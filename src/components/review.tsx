'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, CheckCheck, ArrowLeft, Pencil, LoaderCircle, ShieldCheck } from 'lucide-react';
import { applicationSchema, type ApplicationData } from '@/lib/validation';
import { DRAFT_KEY } from './application-form';
import { DataDetails } from './data-details';
export function Review() {
  const [draft, setDraft] = useState<{ data: ApplicationData; idempotencyKey: string } | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DRAFT_KEY);
      if (stored) {
        const d = JSON.parse(stored);
        const parsed = applicationSchema.safeParse(d.data);
        if (parsed.success) setDraft({ ...d, data: parsed.data });
      }
      setReceipt(sessionStorage.getItem('minassati-receipt') || '');
    } catch {
      setError('تعذر استعادة بيانات الطلب. يرجى العودة إلى النموذج.');
    } finally {
      setLoaded(true);
    }
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !consent || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, consent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReceipt(result.id);
      setDraft(null);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.setItem('minassati-receipt', result.id);
      } catch {
        /* Successful submission remains visible even if storage is unavailable. */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الإرسال. حاول مجدداً.');
    } finally {
      setBusy(false);
    }
  }
  if (!loaded)
    return (
      <div className="empty-state">
        <LoaderCircle className="spin" /> جارٍ تحميل بياناتك…
      </div>
    );
  if (!draft && receipt)
    return (
      <div className="success-card">
        <span className="success-icon">
          <CheckCheck size={38} />
        </span>
        <span className="section-kicker">خطوة موفقة نحو المستقبل</span>
        <h1>تم استلام طلبك بنجاح!</h1>
        <p>تم استلام طلبك بنجاح، وسيتم التواصل معك عند توفر فرصة مناسبة.</p>
        <div className="receipt">
          رقم الطلب <b dir="ltr">{receipt}</b>
        </div>
        <Link className="button" href="/">
          العودة إلى الرئيسية <ArrowLeft size={18} />
        </Link>
      </div>
    );
  if (!draft)
    return (
      <div className="empty-state">
        <h1>لنبدأ ببياناتك أولاً</h1>
        <p>{error || 'لم تُضف بيانات طلبك بعد، أو انتهت جلسة المتصفح.'}</p>
        <Link className="button" href="/#apply">
          الانتقال إلى نموذج التقديم
        </Link>
      </div>
    );
  return (
    <>
      <div className="review-progress">
        <span>
          <Check size={16} /> تعبئة البيانات
        </span>
        <i />
        <strong>٢ المراجعة والإرسال</strong>
      </div>
      <div className="section-heading centered">
        <span className="section-kicker">اقتربت من إنهاء طلبك</span>
        <h1>تأكد من بياناتك</h1>
        <p>راجع المعلومات التالية، ثم أرسل طلبك عندما تكون جاهزاً.</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-card">
          <div className="form-card-heading">
            <h3>ملفك الشخصي والمهني</h3>
            <Link href="/#apply" className="text-link">
              <Pencil size={16} /> تعديل البيانات
            </Link>
          </div>
          <DataDetails data={draft.data} />
        </div>
        <div className="consent-card">
          <ShieldCheck size={25} />
          <div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              أوافق على استخدام بياناتي لغرض التواصل معي بخصوص فرص العمل.
            </label>
            <Link href="/privacy" target="_blank">
              قراءة سياسة الخصوصية
            </Link>
          </div>
        </div>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="review-actions">
          <Link className="button button-outline" href="/#apply">
            تعديل البيانات
          </Link>
          <button className="button" disabled={!consent || busy}>
            {busy ? (
              <>
                <LoaderCircle size={18} className="spin" /> جارٍ الإرسال…
              </>
            ) : (
              <>
                إرسال الطلب <ArrowLeft size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
