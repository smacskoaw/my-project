import { normalizeDigits, type ApplicationRecord } from './validation';
const day = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
export function dashboardResults(all: ApplicationRecord[], filters: Record<string, string>) {
  const search = normalizeDigits((filters.q || '').trim()).toLocaleLowerCase('ar');
  const phone = /^[+\d\s()-]+$/.test(search) ? search.replace(/\D/g, '').replace(/^00?/, '') : '';
  const rows = all
    .filter((r) => {
      if (
        search &&
        !r.data.fullName.toLocaleLowerCase('ar').includes(search) &&
        !(phone && r.data.phone.includes(phone))
      )
        return false;
      for (const k of ['nationality', 'city', 'education', 'specialty'] as const)
        if (filters[k] && r.data[k] !== filters[k]) return false;
      return !filters.status || r.status === filters.status;
    })
    .sort(
      (a, b) =>
        (a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)) *
        (filters.sort === 'oldest' ? 1 : -1),
    );
  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const requested = Number(filters.page || 1);
  const page = Math.min(pages, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1));
  return {
    rows: rows.slice((page - 1) * 12, page * 12),
    total: rows.length,
    pages,
    page,
    stats: {
      total: all.length,
      today: all.filter((r) => day(new Date(r.created_at)) === day(new Date())).length,
      iraq: all.filter((r) => r.data.country === 'العراق').length,
      syria: all.filter((r) => r.data.country === 'سوريا').length,
      specialties: new Set(
        all.map((r) => (r.data.specialty === 'أخرى' ? r.data.otherSpecialty : r.data.specialty)),
      ).size,
    },
    cities: [...new Set(all.map((r) => r.data.city))].sort((a, b) => a.localeCompare(b, 'ar')),
  };
}
