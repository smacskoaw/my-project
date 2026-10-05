import { Header, Footer } from '@/components/site-shell';
import { Review } from '@/components/review';
export const metadata = { title: 'مراجعة البيانات', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main" className="container narrow page-space">
        <Review />
      </main>
      <Footer />
    </>
  );
}
