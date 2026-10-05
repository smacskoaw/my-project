import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardResults } from '../src/lib/dashboard-results';
import { applicationSchema } from '../src/lib/validation';
test('admin filtering, Arabic phone search, paging and totals remain consistent', () => {
  const data = applicationSchema.parse({
    fullName: 'اختبار لوحة الإدارة',
    phone: '07701234567',
    nationality: 'عراقي',
    country: 'العراق',
    city: 'بغداد',
    age: 28,
    education: 'بكالوريوس',
    specialty: 'البرمجة',
    experience: 4,
    employed: 'لا',
  });
  const rows = Array.from({ length: 14 }, (_, i) => ({
    id: String(i).padStart(2, '0'),
    data,
    status: i % 2 ? 'جديد' : 'مقبول',
    created_at: '2026-01-01T00:00:00.000Z',
    consented_at: '2026-01-01T00:00:00.000Z',
  }));
  const second = dashboardResults(rows, { page: '2', sort: 'newest' });
  assert.equal(second.rows.length, 2);
  assert.equal(second.pages, 2);
  assert.equal(second.stats.total, 14);
  const result = dashboardResults(rows, { q: '٠٧٧٠١٢٣٤٥٦٧', status: 'مقبول', city: 'بغداد' });
  assert.equal(result.total, 7);
  assert.equal(result.stats.total, 14);
  assert.equal(result.rows[0].id, '12');
  assert.equal(dashboardResults(rows, { q: 'لوحة' }).total, 14);
  assert.equal(dashboardResults(rows, { city: 'دمشق' }).total, 0);
});
