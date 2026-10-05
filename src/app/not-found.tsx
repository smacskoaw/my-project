import Link from 'next/link';
import { Header, Footer } from '@/components/site-shell';
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="container page-space empty-state">
        <span className="section-kicker">404</span>
        <h1>هذه الصفحة غير موجودة</h1>
        <p>لنعد إلى بداية رحلتك.</p>
        <Link href="/" className="button">
          العودة إلى الرئيسية
        </Link>
      </main>
      <Footer />
    </>
  );
}
