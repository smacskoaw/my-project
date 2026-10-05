import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/security';
import { Dashboard } from '@/components/dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'لوحة الإدارة', robots: { index: false, follow: false } };
export default async function Page() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return <Dashboard username={admin.username} />;
}
