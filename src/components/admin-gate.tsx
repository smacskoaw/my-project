'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onIdTokenChanged, getIdTokenResult } from 'firebase/auth';
import { LoaderCircle } from 'lucide-react';
import { firebaseClient } from '@/lib/firebase-client';
import { Dashboard } from './dashboard';
export function AdminGate() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let generation = 0;
    const stop = onIdTokenChanged(firebaseClient().auth, async (user) => {
      const current = ++generation;
      setUsername('');
      try {
        const token = user ? await getIdTokenResult(user) : null;
        if (current !== generation) return;
        if (!user || token?.claims.minassatiAdmin !== true) {
          router.replace('/admin/login/');
          return;
        }
        setUsername(user.displayName || user.email?.split('@')[0] || 'الإدارة');
      } catch {
        if (current === generation) setError('تعذر التحقق من الدخول. أعد تحميل الصفحة.');
      }
    });
    return () => {
      generation++;
      stop();
    };
  }, [router]);
  if (!username)
    return (
      <main id="main" className="empty-state">
        {error || (
          <>
            <LoaderCircle className="spin" /> جارٍ التحقق من الدخول…
          </>
        )}
      </main>
    );
  return <Dashboard username={username} />;
}
