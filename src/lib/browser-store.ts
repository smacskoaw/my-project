'use client';
import {
  browserSessionPersistence,
  getIdTokenResult,
  setPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseClient } from './firebase-client';
import { submissionSchema, type ApplicationRecord } from './validation';

export async function loginAdmin(username: string, password: string) {
  const { auth } = firebaseClient();
  await setPersistence(auth, browserSessionPersistence);
  const email = username.trim().toLowerCase() + '@admin.sgyqkl.firebaseapp.com';
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const token = await getIdTokenResult(user, true);
    if (token.claims.minassatiAdmin !== true) {
      await signOut(auth);
      throw new Error('not-admin');
    }
  } catch {
    throw new Error('تعذر تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور واتصال الإنترنت.');
  }
}
export async function logoutAdmin() {
  await signOut(firebaseClient().auth);
}
export async function submitApplication(input: unknown) {
  const { data, idempotencyKey } = submissionSchema.parse(input);
  const { auth, db } = firebaseClient();
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  const uid = auth.currentUser!.uid;
  const receipt = doc(db, 'minassati_submitters', uid, 'receipts', idempotencyKey);
  if ((await getDoc(receipt)).exists()) return { id: idempotencyKey };
  const gate = doc(db, 'minassati_submitters', uid);
  const previous = await getDoc(gate);
  if (previous.exists() && previous.data().submitted_at.toMillis() > Date.now() - 600000)
    throw new Error('تم إرسال طلب مؤخراً من هذا المتصفح. يرجى الانتظار عشر دقائق.');
  const batch = writeBatch(db);
  batch.set(doc(db, 'minassati_applications', idempotencyKey), {
    data,
    status: 'جديد',
    owner_uid: uid,
    created_at: serverTimestamp(),
    consented_at: serverTimestamp(),
  });
  batch.set(gate, { submitted_at: serverTimestamp(), application_id: idempotencyKey });
  batch.set(receipt, { submitted_at: serverTimestamp() });
  try {
    await batch.commit();
  } catch {
    if ((await getDoc(receipt)).exists()) return { id: idempotencyKey };
    throw new Error('تعذر حفظ الطلب. تحقق من الاتصال، أو انتظر عشر دقائق إذا أرسلت طلباً مؤخراً.');
  }
  return { id: idempotencyKey };
}
export function watchApplications(next: (rows: ApplicationRecord[]) => void, error: () => void) {
  return onSnapshot(
    collection(firebaseClient().db, 'minassati_applications'),
    (snapshot) => {
      next(
        snapshot.docs.map((d) => {
          const r = d.data();
          return {
            id: d.id,
            data: r.data,
            status: r.status,
            created_at: r.created_at.toDate().toISOString(),
            consented_at: r.consented_at.toDate().toISOString(),
          };
        }),
      );
    },
    error,
  );
}
export async function changeApplication(id: string, method: 'PATCH' | 'DELETE', status?: string) {
  const ref = doc(firebaseClient().db, 'minassati_applications', id);
  if (method === 'DELETE') await deleteDoc(ref);
  else await updateDoc(ref, { status });
}
