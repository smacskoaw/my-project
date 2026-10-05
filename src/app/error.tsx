'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container page-space empty-state">
      <h1>تعذر تحميل هذه الصفحة</h1>
      <p>حدث خطأ مؤقت. يرجى إعادة المحاولة بعد قليل.</p>
      <button className="button" onClick={reset}>
        إعادة المحاولة
      </button>
    </main>
  );
}
