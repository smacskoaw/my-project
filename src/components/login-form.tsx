'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LoaderCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace('/admin');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تسجيل الدخول');
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="login-card">
      <span className="login-icon">
        <LockKeyhole size={28} />
      </span>
      <span className="section-kicker">مساحة الإدارة</span>
      <h1>أهلاً بعودتك.</h1>
      <p>سجّل دخولك لمتابعة الطلبات وإدارة الفرص.</p>
      <div className="field">
        <label htmlFor="username">اسم المستخدم</label>
        <input id="username" name="username" required maxLength={100} autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">كلمة المرور</label>
        <div className="password-input">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            required
            maxLength={200}
            autoComplete="current-password"
          />
          <button
            type="button"
            aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <button className="button" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={20} />
        ) : (
          <>
            تسجيل الدخول <ArrowLeft size={18} />
          </>
        )}
      </button>
      <small>هذه المساحة مخصصة لفريق إدارة منصتي فقط.</small>
    </form>
  );
}
