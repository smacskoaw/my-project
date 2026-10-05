import { AdminGate } from '@/components/admin-gate';
export const metadata = { title: 'لوحة الإدارة', robots: { index: false, follow: false } };
export default function Page() {
  return <AdminGate />;
}
