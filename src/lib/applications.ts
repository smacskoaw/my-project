import { query } from './db';
import { normalizeDigits, type ApplicationRecord } from './validation';
import { databaseProvider } from './runtime-config';
export async function listApplications(params: URLSearchParams) {
  if (databaseProvider() === 'firestore')
    return (await import('./firestore-store')).listApplications(params);
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (clause: string, value: unknown) => {
    values.push(value);
    where.push(clause.replaceAll('?', `$${values.length}`));
  };
  const rawSearch = normalizeDigits((params.get('q') || '').trim().slice(0, 120));
  const search = /^[+\d\s()-]+$/.test(rawSearch)
    ? rawSearch.replace(/[^\d]/g, '').replace(/^00?/, '')
    : rawSearch;
  if (search)
    add(
      "(data->>'fullName' ILIKE ? OR data->>'phone' ILIKE ?)",
      '%' + search.replace(/[\\%_]/g, '\\$&') + '%',
    );
  for (const key of ['nationality', 'city', 'education', 'specialty']) {
    const value = params.get(key);
    if (value) add(`data->>'${key}' = ?`, value.slice(0, 150));
  }
  if (params.get('status')) add('status = ?', params.get('status'));
  const filter = where.length ? ' WHERE ' + where.join(' AND ') : '';
  const [{ total }] = await query<{ total: number }>(
    'SELECT COUNT(*)::int AS total FROM applications' + filter,
    values,
  );
  const pages = Math.max(1, Math.ceil(total / 12));
  const requested = Number(params.get('page') || 1);
  const page = Math.min(pages, Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1));
  const direction = params.get('sort') === 'oldest' ? 'ASC' : 'DESC';
  const rows = await query<ApplicationRecord>(
    `SELECT id,data,status,created_at,consented_at FROM applications${filter} ORDER BY created_at ${direction}, id ${direction} LIMIT 12 OFFSET $${values.length + 1}`,
    [...values, (page - 1) * 12],
  );
  const [stats] = await query<{
    total: number;
    today: number;
    iraq: number;
    syria: number;
    specialties: number;
  }>(
    `SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE (created_at AT TIME ZONE 'Asia/Baghdad')::date=(NOW() AT TIME ZONE 'Asia/Baghdad')::date)::int today,COUNT(*) FILTER(WHERE data->>'country'='العراق')::int iraq,COUNT(*) FILTER(WHERE data->>'country'='سوريا')::int syria,COUNT(DISTINCT CASE WHEN data->>'specialty'='أخرى' THEN data->>'otherSpecialty' ELSE data->>'specialty' END)::int specialties FROM applications`,
  );
  const cityRows = await query<{ city: string }>(
    "SELECT DISTINCT data->>'city' AS city FROM applications ORDER BY city",
  );
  return { rows, total, page, pages, stats, cities: cityRows.map((x) => x.city) };
}
