'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { watchApplications, changeApplication, logoutAdmin } from '@/lib/browser-store';
import { dashboardResults } from '@/lib/dashboard-results';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Users,
  CalendarDays,
  MapPin,
  Layers,
  Search,
  SlidersHorizontal,
  LogOut,
  ArrowUpLeft,
  Trash2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  LoaderCircle,
  RefreshCw,
  CheckCheck,
} from 'lucide-react';
import { Logo } from './site-shell';
import { education, nationalities, specialties, statuses } from '@/lib/constants';
import { whatsappUrl, type ApplicationRecord } from '@/lib/validation';
import { DataDetails } from './data-details';
type Results = {
  rows: ApplicationRecord[];
  total: number;
  page: number;
  pages: number;
  stats: { total: number; today: number; iraq: number; syria: number; specialties: number };
  cities: string[];
};
const formatDate = (date: string) =>
  new Date(date).toLocaleString('ar-IQ', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Baghdad',
  });
export function Dashboard({ username }: { username: string }) {
  const router = useRouter();
  const [allRows, setAllRows] = useState<ApplicationRecord[] | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({ sort: 'newest', page: '1' });
  const result: Results | null = useMemo(
    () => (allRows ? dashboardResults(allRows, filters) : null),
    [allRows, filters],
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<ApplicationRecord | null>(null);
  const [deleting, setDeleting] = useState<ApplicationRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q: search, page: '1' })), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (selected) detailDialog.current?.showModal();
    else detailDialog.current?.close();
  }, [selected]);
  useEffect(() => {
    if (deleting) deleteDialog.current?.showModal();
    else deleteDialog.current?.close();
  }, [deleting]);
  useEffect(() => {
    setLoading(true);
    setError('');
    return watchApplications(
      (rows) => {
        setAllRows(rows);
        setLoading(false);
      },
      () => {
        setAllRows(null);
        setLoading(false);
        setError('تعذر تحميل الطلبات. تحقق من اتصالك وصلاحية دخولك.');
      },
    );
  }, [revision]);
  function filter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: '1' }));
  }
  async function mutate(id: string, method: 'PATCH' | 'DELETE', status?: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await changeApplication(id, method, status);
      setToast(method === 'DELETE' ? 'تم حذف الطلب بنجاح' : 'تم تحديث حالة الطلب');
      setDeleting(null);
      if (method === 'DELETE') setSelected(null);
      else setSelected((s) => (s?.id === id ? { ...s, status: status! } : s));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ العملية');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await logoutAdmin();
      router.replace('/admin/login');
      router.refresh();
    } catch {
      setError('تعذر تسجيل الخروج. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }
  function selectFilter(key: string, label: string, options: readonly string[]) {
    return (
      <select
        aria-label={label}
        value={filters[key] || ''}
        onChange={(e) => filter(key, e.target.value)}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <span className="admin-label">مساحة العمل</span>
        <Link className="sidebar-active" href="/admin/">
          <BriefcaseBusiness size={20} /> طلبات التوظيف
        </Link>
        <Link href="/" target="_blank" rel="noreferrer">
          <ArrowUpLeft size={20} /> عرض الموقع
        </Link>
        <div className="sidebar-bottom">
          <span className="admin-avatar">{username.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{username}</strong>
            <small>مسؤول المنصة</small>
          </div>
          <button aria-label="تسجيل الخروج" disabled={busy} onClick={logout}>
            <LogOut size={20} />
          </button>
        </div>
      </aside>
      <main id="main" className="admin-main">
        <header className="admin-topbar">
          <span>
            لوحة الإدارة <span className="muted">/ نظرة عامة</span>
          </span>
          <span className="admin-date">
            {new Date().toLocaleDateString('ar-IQ', { dateStyle: 'long' })}
          </span>
        </header>
        <div className="admin-content">
          <div className="section-heading">
            <div>
              <span className="section-kicker">كل فرصة تبدأ بشخص</span>
              <h1>طلبات التوظيف</h1>
              <p>تعرّف على المتقدمين، وتابع رحلتهم من مكان واحد.</p>
            </div>
            <button
              className="button button-outline button-small"
              onClick={() => setRevision((r) => r + 1)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> تحديث
            </button>
          </div>
          <div className="stats-grid">
            {[
              { label: 'إجمالي الطلبات', key: 'total', icon: Users },
              { label: 'طلبات اليوم', key: 'today', icon: CalendarDays },
              { label: 'المقيمون في العراق', key: 'iraq', icon: MapPin },
              { label: 'المقيمون في سوريا', key: 'syria', icon: MapPin },
              { label: 'التخصصات المختلفة', key: 'specialties', icon: Layers },
            ].map((s, i) => (
              <div className={'stat-card stat-' + i} key={s.key}>
                <div>
                  <span>{s.label}</span>
                  <s.icon size={19} />
                </div>
                <strong>
                  {result
                    ? result.stats[s.key as keyof Results['stats']].toLocaleString('ar-IQ')
                    : '—'}
                </strong>
                <small>{i === 1 ? 'بتوقيت بغداد' : 'من طلبات المنصة'}</small>
              </div>
            ))}
          </div>
          <section className="admin-requests">
            <div className="requests-heading">
              <h2>
                جميع الطلبات <span>{result?.total || 0}</span>
              </h2>
              <span>
                <SlidersHorizontal size={17} /> البحث والتصفية
              </span>
            </div>
            <div className="filters">
              <div className="search-box">
                <Search size={19} />
                <input
                  aria-label="البحث بالاسم أو الهاتف"
                  placeholder="ابحث بالاسم أو رقم الهاتف…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {selectFilter('nationality', 'جميع الجنسيات', nationalities)}
              {selectFilter('city', 'جميع المدن', result?.cities || [])}
              {selectFilter('education', 'جميع المؤهلات', education)}
              {selectFilter('specialty', 'جميع التخصصات', specialties)}
              {selectFilter('status', 'جميع الحالات', statuses)}
              <select
                aria-label="ترتيب الطلبات"
                value={filters.sort}
                onChange={(e) => filter('sort', e.target.value)}
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
              </select>
              <button
                className="text-link"
                onClick={() => {
                  setSearch('');
                  setFilters({ sort: 'newest', page: '1' });
                }}
              >
                مسح الفلاتر
              </button>
            </div>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <div className={'results ' + (loading ? 'is-loading' : '')} aria-busy={loading}>
              {!result && loading ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" /> جارٍ تحميل الطلبات…
                </div>
              ) : result?.rows.length ? (
                <div className="applicant-grid">
                  {result.rows.map((row) => (
                    <article className="applicant-card" key={row.id}>
                      <div className="applicant-top">
                        <span className="applicant-avatar">{row.data.fullName.slice(0, 1)}</span>
                        <div>
                          <button className="name-button" onClick={() => setSelected(row)}>
                            {row.data.fullName}
                          </button>
                          <p>
                            {row.data.specialty === 'أخرى'
                              ? row.data.otherSpecialty
                              : row.data.specialty}
                          </p>
                        </div>
                        <span
                          className={
                            'status status-' +
                            statuses.indexOf(row.status as (typeof statuses)[number])
                          }
                        >
                          {row.status}
                        </span>
                      </div>
                      <dl className="applicant-summary">
                        <div>
                          <dt>الهاتف</dt>
                          <dd dir="ltr">{row.data.phone}</dd>
                        </div>
                        <div>
                          <dt>الإقامة</dt>
                          <dd>
                            {row.data.country}، {row.data.city}
                          </dd>
                        </div>
                        <div>
                          <dt>الجنسية / العمر</dt>
                          <dd>
                            {row.data.nationality} / {row.data.age} سنة
                          </dd>
                        </div>
                        <div>
                          <dt>المؤهل / الخبرة</dt>
                          <dd>
                            {row.data.education} / {row.data.experience} سنة
                          </dd>
                        </div>
                      </dl>
                      <div className="applicant-date">{formatDate(row.created_at)}</div>
                      <div className="applicant-actions">
                        <button className="text-link" onClick={() => setSelected(row)}>
                          عرض التفاصيل <ArrowUpLeft size={15} />
                        </button>
                        <a
                          className="whatsapp-button"
                          href={whatsappUrl(row.data.phone)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle size={16} /> واتساب
                        </a>
                        <button
                          className="delete-button"
                          aria-label={'حذف طلب ' + row.data.fullName}
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <BriefcaseBusiness size={38} />
                  <h3>
                    {result?.stats.total ? 'لا توجد نتائج مطابقة' : 'الطلبات القادمة ستظهر هنا'}
                  </h3>
                  <p>
                    {result?.stats.total
                      ? 'جرّب تغيير كلمات البحث أو خيارات التصفية.'
                      : 'عندما يرسل أحدهم طلبه، يمكنك مراجعته والتواصل معه من هنا.'}
                  </p>
                </div>
              )}
            </div>
            <div className="pagination">
              <span>
                {result?.total || 0} نتيجة • الصفحة {result?.page || 1} من {result?.pages || 1}
              </span>
              <div>
                <button
                  aria-label="الصفحة السابقة"
                  disabled={loading || !result || result.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: String(result!.page - 1) }))}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  aria-label="الصفحة التالية"
                  disabled={loading || !result || result.page >= result.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: String(result!.page + 1) }))}
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <dialog
        ref={detailDialog}
        className="detail-dialog"
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="dialog-heading">
              <div>
                <span className="section-kicker">ملف المتقدم</span>
                <h2>{selected.data.fullName}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="إغلاق التفاصيل"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <p className="muted">تاريخ التقديم: {formatDate(selected.created_at)}</p>
            <DataDetails data={selected.data} />
            <div className="detail-meta">
              موافقة استخدام البيانات: {formatDate(selected.consented_at)}
              <br />
              رقم الطلب: <span dir="ltr">{selected.id}</span>
            </div>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <div className="dialog-actions">
              <label>
                حالة الطلب
                <select
                  disabled={busy}
                  value={selected.status}
                  onChange={(e) => void mutate(selected.id, 'PATCH', e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <a
                className="button"
                href={whatsappUrl(selected.data.phone)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={18} /> تواصل عبر واتساب
              </a>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={deleteDialog}
        className="delete-dialog"
        onCancel={() => {
          if (!busy) setDeleting(null);
        }}
      >
        <span className="danger-icon">
          <Trash2 size={27} />
        </span>
        <h2>هل أنت متأكد من حذف هذا الطلب؟</h2>
        <p>
          سيتم حذف طلب {deleting?.data.fullName} نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذه
          العملية.
        </p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="review-actions">
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            إلغاء
          </button>
          <button
            className="button button-danger"
            disabled={busy}
            onClick={() => deleting && void mutate(deleting.id, 'DELETE')}
          >
            {busy ? 'جارٍ الحذف…' : 'نعم، حذف الطلب'}
          </button>
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={20} />
          {toast}
        </div>
      )}
    </div>
  );
}
