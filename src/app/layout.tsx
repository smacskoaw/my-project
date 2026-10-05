import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'منصتي | خطوتك الأولى نحو فرصة أفضل', template: '%s | منصتي' },
  description:
    'قدّم بياناتك المهنية عبر منصتي، منصة استقبال طلبات التوظيف للباحثين عن العمل في العراق وسوريا.',
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          انتقل إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
