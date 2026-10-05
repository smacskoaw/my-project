import { Header, Footer } from '@/components/site-shell';
import { LoginForm } from '@/components/login-form';
export const metadata = { title: 'دخول الإدارة', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="container login-main">
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
