import type { SearchEngine } from '@/lib/search/engine';
import { type SearchFilters, emptyFilters } from '@/lib/search/filters';

interface ActiveFilter {
  key: string;
  label: string;
  /** Filters with this one removed. */
  without: SearchFilters;
}

/** Every active filter as a removable label. */
export function activeFilters(filters: SearchFilters, engine: SearchEngine | null): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const f = filters;
  const add = (key: string, label: string, change: Partial<SearchFilters>) => out.push({ key, label, without: { ...f, ...change } });

  f.conflicts.forEach(id =>
    add(`conflict:${id}`, `Conflict: ${engine?.conflictById.get(id)?.name ?? id}`, { conflicts: f.conflicts.filter(x => x !== id) }),
  );
  f.branches.forEach(code =>
    add(`branch:${code}`, `Branch: ${engine?.branchByCode.get(code)?.name ?? code}`, { branches: f.branches.filter(x => x !== code) }),
  );
  if (f.anyAward) add('award:any', 'Any award', { anyAward: false });
  f.awards.forEach(id =>
    add(`award:${id}`, `Award: ${engine?.awardById.get(id)?.name ?? id}`, { awards: f.awards.filter(x => x !== id) }),
  );
  f.units.forEach(unit => add(`unit:${unit}`, `Unit: ${unit}`, { units: f.units.filter(x => x !== unit) }));
  if (f.rank.trim()) add('rank', `Rank: ${f.rank.trim()}`, { rank: '' });
  f.classYears.forEach(year => add(`class:${year}`, `Class of ${year}`, { classYears: f.classYears.filter(x => x !== year) }));
  if (f.classYearFrom !== null || f.classYearTo !== null) {
    add('class-range', `Class ${f.classYearFrom ?? '…'}–${f.classYearTo ?? '…'}`, { classYearFrom: null, classYearTo: null });
  }
  if (f.noDate) add('no-date', 'No date of death recorded', { noDate: false });
  else if (f.dateFrom || f.dateTo) add('died', `Died ${f.dateFrom || '…'} – ${f.dateTo || '…'}`, { dateFrom: '', dateTo: '' });
  if (f.hasDocument) add('document', 'Memorial document available', { hasDocument: false });
  return out;
}

export default function ActiveFilters({
  filters,
  engine,
  onChange,
}: {
  filters: SearchFilters;
  engine: SearchEngine | null;
  onChange: (filters: SearchFilters) => void;
}) {
  const active = activeFilters(filters, engine);
  if (!active.length) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
      {active.map(item => (
        <span key={item.key} className="inline-flex items-center gap-1 rounded-full bg-vmi-red py-1 pl-3 pr-1 text-sm text-white">
          {item.label}
          <button
            type="button"
            onClick={() => onChange(item.without)}
            aria-label={`Remove filter: ${item.label}`}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/20"
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(emptyFilters())} className="text-sm font-semibold text-vmi-red underline hover:text-vmi-dark-red">
        Clear all
      </button>
    </div>
  );
}
