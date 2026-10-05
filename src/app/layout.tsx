import type { Metadata } from 'next';
import './globals.css';
import localFont from 'next/font/local';
const arabic = localFont({
  src: [
    { path: '../../public/fonts/arabic-regular.ttf', weight: '100 500' },
    { path: '../../public/fonts/arabic-bold.ttf', weight: '600 900' },
  ],
  variable: '--font-arabic',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'منصتي | خطوتك الأولى نحو فرصة أفضل', template: '%s | منصتي' },
  description:
    'قدّم بياناتك المهنية عبر منصتي، منصة استقبال طلبات التوظيف للباحثين عن العمل في العراق وسوريا.',
  robots: { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className={arabic.variable}>
      <body>
        <a className="skip-link" href="#main">
          انتقل إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
