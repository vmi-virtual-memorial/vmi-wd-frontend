'use client';

import { useId, useMemo, useState } from 'react';
import type { FacetCounts, SearchEngine } from '@/lib/search/engine';
import { type Scope, type SearchFilters, type SearchState } from '@/lib/search/filters';

interface CheckOption<T> {
  value: T;
  label: string;
  count?: number;
}

function CheckList<T extends string | number>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: CheckOption<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  if (!options.length) return null;
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-bold text-gray-700">{legend}</legend>
      <div className="max-h-48 overflow-y-auto rounded border border-gray-300 p-2">
        {options.map(o => (
          <label key={String(o.value)} className="mb-1 flex cursor-pointer items-center justify-between gap-2 rounded px-1 hover:bg-gray-50">
            <span className="flex items-center">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
                className="mr-2 text-vmi-red focus:ring-vmi-gold"
              />
              <span className="text-sm">{o.label}</span>
            </span>
            {o.count !== undefined && <span className="text-xs text-gray-500">{o.count}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
const yearOrNull = (value: string) => {
  const n = Number(value);
  return value && Number.isInteger(n) ? n : null;
};

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'names', label: 'Names & class year' },
  { value: 'service', label: 'Service: rank, branch, unit, conflict, awards' },
  { value: 'cod', label: 'Circumstances of death' },
];

export default function FilterPanel({
  state,
  engine,
  counts,
  onQuery,
  onScopes,
  onFilters,
}: {
  state: SearchState;
  engine: SearchEngine | null;
  counts: FacetCounts | null;
  onQuery: (q: string) => void;
  onScopes: (scopes: Scope[]) => void;
  onFilters: (filters: SearchFilters) => void;
}) {
  const f = state.filters;
  const set = (change: Partial<SearchFilters>) => onFilters({ ...f, ...change });
  const [unitDraft, setUnitDraft] = useState('');
  const unitListId = useId();
  const unitSuggestions = useMemo(
    () => (engine && unitDraft.trim().length >= 2 ? engine.searchFacets(unitDraft, { units: 8 }).units.map(h => h.item.label) : []),
    [engine, unitDraft],
  );
  const addUnit = () => {
    const unit = unitDraft.trim();
    if (unit && !f.units.includes(unit)) set({ units: [...f.units, unit] });
    setUnitDraft('');
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="keywords" className="mb-2 block text-sm font-bold text-gray-700">
          Keywords
        </label>
        <input
          type="search"
          id="keywords"
          value={state.q}
          onChange={e => onQuery(e.target.value)}
          placeholder="Names, units, battles…"
          className="w-full rounded border border-gray-300 px-3 py-2 focus:border-vmi-gold focus:outline-none"
        />
        <fieldset className="mt-2">
          <legend className="sr-only">Search in</legend>
          {SCOPES.map(scope => {
            const checked = state.scopes.includes(scope.value);
            const last = checked && state.scopes.length === 1;
            return (
              <label key={scope.value} className={`flex items-center text-sm ${last ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={last}
                  onChange={() => onScopes(toggle(state.scopes, scope.value))}
                  className="mr-2 text-vmi-red focus:ring-vmi-gold"
                />
                {scope.label}
              </label>
            );
          })}
        </fieldset>
      </div>

      <label className="flex cursor-pointer items-center rounded p-2 hover:bg-gray-50">
        <input
          type="checkbox"
          checked={f.hasDocument}
          onChange={e => set({ hasDocument: e.target.checked })}
          className="mr-3 h-4 w-4 text-vmi-red focus:ring-vmi-gold"
        />
        <span className="text-sm font-bold text-gray-700">Memorial Document Available</span>
      </label>

      <CheckList
        legend="Conflict"
        options={(engine?.data.conflicts ?? []).map(c => ({ value: c.id, label: c.name, count: counts?.conflicts.get(c.id) ?? 0 }))}
        selected={f.conflicts}
        onToggle={id => set({ conflicts: toggle(f.conflicts, id) })}
      />

      <CheckList
        legend="Branch"
        options={(engine?.data.branches ?? []).map(b => ({ value: b.code, label: b.name, count: counts?.branches.get(b.code) ?? 0 }))}
        selected={f.branches}
        onToggle={code => set({ branches: toggle(f.branches, code) })}
      />

      {engine && (
        <fieldset>
          <legend className="mb-2 block text-sm font-bold text-gray-700">Awards</legend>
          <label className="mb-2 flex cursor-pointer items-center text-sm">
            <input
              type="checkbox"
              checked={f.anyAward}
              onChange={e => set({ anyAward: e.target.checked, awards: e.target.checked ? [] : f.awards })}
              className="mr-2 text-vmi-red focus:ring-vmi-gold"
            />
            Any award for heroism &amp; gallantry
          </label>
          {!f.anyAward && (
            <div className="max-h-48 overflow-y-auto rounded border border-gray-300 p-2">
              {engine.data.awards
                .filter(a => a.recipient_count > 0)
                .map(a => (
                  <label key={a.id} className="mb-1 flex cursor-pointer items-center justify-between gap-2 rounded px-1 hover:bg-gray-50">
                    <span className="flex items-center">
                      <input
                        type="checkbox"
                        checked={f.awards.includes(a.id)}
                        onChange={() => set({ awards: toggle(f.awards, a.id) })}
                        className="mr-2 text-vmi-red focus:ring-vmi-gold"
                      />
                      <span className="text-sm">{a.name}</span>
                    </span>
                    <span className="text-xs text-gray-500">{counts?.awards.get(a.id) ?? 0}</span>
                  </label>
                ))}
            </div>
          )}
        </fieldset>
      )}

      <div>
        <label htmlFor="unit-filter" className="mb-2 block text-sm font-bold text-gray-700">
          Unit
        </label>
        {f.units.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {f.units.map(unit => (
              <li key={unit} className="inline-flex items-center gap-1 rounded-full bg-gray-200 py-0.5 pl-2.5 pr-1 text-sm">
                {unit}
                <button
                  type="button"
                  aria-label={`Remove unit: ${unit}`}
                  onClick={() => set({ units: f.units.filter(u => u !== unit) })}
                  className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-gray-300"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            id="unit-filter"
            list={unitListId}
            value={unitDraft}
            onChange={e => setUnitDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUnit();
              }
            }}
            placeholder="e.g. 1st Battalion, 7th Marines"
            className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-vmi-gold focus:outline-none"
          />
          <button
            type="button"
            onClick={addUnit}
            disabled={!unitDraft.trim()}
            className="rounded bg-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <datalist id={unitListId}>
          {unitSuggestions.map(label => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="rank-filter" className="mb-2 block text-sm font-bold text-gray-700">
          Rank
        </label>
        <input
          id="rank-filter"
          value={f.rank}
          onChange={e => set({ rank: e.target.value })}
          placeholder="e.g. Captain"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-vmi-gold focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-gray-700">Class Year</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="Class year from"
            placeholder="From"
            min={1839}
            value={f.classYearFrom ?? ''}
            onChange={e => set({ classYearFrom: yearOrNull(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-vmi-gold focus:outline-none"
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            aria-label="Class year to"
            placeholder="To"
            min={1839}
            value={f.classYearTo ?? ''}
            onChange={e => set({ classYearTo: yearOrNull(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-vmi-gold focus:outline-none"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-gray-700">Date of Death</legend>
        <div className="space-y-2">
          <input
            type="date"
            aria-label="Died on or after"
            value={f.dateFrom}
            disabled={f.noDate}
            onChange={e => set({ dateFrom: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-vmi-gold focus:outline-none disabled:bg-gray-100"
          />
          <input
            type="date"
            aria-label="Died on or before"
            value={f.dateTo}
            disabled={f.noDate}
            onChange={e => set({ dateTo: e.target.value })}
            className="w-full rounded border border-gray-300 px-3 py-2 focus:border-vmi-gold focus:outline-none disabled:bg-gray-100"
          />
          <label className="flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={f.noDate}
              onChange={e => set({ noDate: e.target.checked })}
              className="mr-2 text-vmi-red focus:ring-vmi-gold"
            />
            <span className="text-sm">No date recorded</span>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
