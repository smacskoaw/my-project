import Link from 'next/link';
import { ArrowUpLeft, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="منصتي - الرئيسية">
      <span className="logo-icon">
        <BriefcaseBusiness size={24} />
      </span>
      <span>
        منصتي<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav aria-label="التنقل الرئيسي">
          <Link href="/">الرئيسية</Link>
          <Link href="/#about">من نحن</Link>
          <Link href="/#apply">التقديم على وظيفة</Link>
        </nav>
        <Link href="/#apply" className="button button-small">
          ابدأ رحلتك <ArrowUpLeft size={17} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>خطوتك الأولى نحو فرصة تستحقها.</p>
        </div>
        <div className="footer-links">
          <Link href="/privacy">سياسة الخصوصية</Link>
          <Link href="/admin">دخول الإدارة</Link>
        </div>
        <span className="footer-note">
          <ShieldCheck size={16} /> بياناتك تُستخدم لأغراض التوظيف فقط
        </span>
      </div>
      <div className="container copyright">
        © {new Date().getFullYear()} منصتي. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
