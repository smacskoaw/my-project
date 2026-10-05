import { labels } from '@/lib/constants';
import type { ApplicationData } from '@/lib/validation';
export function DataDetails({ data }: { data: ApplicationData }) {
  return (
    <dl className="details-grid">
      {Object.entries(labels)
        .filter(([key]) => key !== 'otherSpecialty' || data.specialty === 'أخرى')
        .map(([key, label]) => (
          <div key={key} className={['skills', 'notes'].includes(key) ? 'detail-wide' : ''}>
            <dt>{label}</dt>
            <dd dir={key === 'phone' ? 'ltr' : undefined}>
              {String(data[key as keyof ApplicationData] ?? '') || 'لم يُحدد'}
            </dd>
          </div>
        ))}
    </dl>
  );
}
