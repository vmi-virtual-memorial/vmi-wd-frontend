'use client';

import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Pagination from '@/components/Pagination';
import {
  ALL_SCOPES,
  type SearchFilters,
  type SearchState,
  type SortKey,
  emptyFilters,
  hasActiveFilters,
  paramsFromState,
  stateFromParams,
} from '@/lib/search/filters';
import { replaceSearchParams, useScrollRestoration } from '@/lib/navigation';
import ActiveFilters from './ActiveFilters';
import FilterPanel from './FilterPanel';
import ResultCard from './ResultCard';
import { useSearchEngine } from './useSearchEngine';

const PER_PAGE_OPTIONS = [25, 50, 100];
const DEFAULT_PER_PAGE = 25;
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name', label: 'Name' },
  { value: 'class_year', label: 'Class year' },
  { value: 'date_of_death', label: 'Date of death' },
];

const positive = (value: string | null) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Advanced Search: the same in-browser engine as the header bar, with every
 * filter. The URL is the source of truth (shareable, survives back/forward);
 * edits update local state at once and are mirrored to the URL with
 * replaceState, and outside navigations (the header bar) re-sync the state.
 */
export default function AdvancedSearch() {
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();
  const [state, setState] = useState<SearchState>(() => stateFromParams(new URLSearchParams(urlKey)));
  const [page, setPage] = useState(() => positive(searchParams.get('page')) ?? 1);
  const [perPage, setPerPage] = useState(() => {
    const per = positive(searchParams.get('per'));
    return per && PER_PAGE_OPTIONS.includes(per) ? per : DEFAULT_PER_PAGE;
  });
  const [showFilters, setShowFilters] = useState(false);
  const written = useRef(urlKey);

  useEffect(() => {
    if (urlKey === written.current) return;
    written.current = urlKey;
    const params = new URLSearchParams(urlKey);
    setState(stateFromParams(params));
    setPage(positive(params.get('page')) ?? 1);
  }, [urlKey]);

  const commit = (next: SearchState, nextPage = 1, nextPerPage = perPage) => {
    setState(next);
    setPage(nextPage);
    setPerPage(nextPerPage);
    replaceSearchParams({
      ...paramsFromState(next),
      page: nextPage > 1 ? String(nextPage) : null,
      per: nextPerPage !== DEFAULT_PER_PAGE ? String(nextPerPage) : null,
    });
    written.current = window.location.search.replace(/^\?/, '');
  };
  const setFilters = (filters: SearchFilters) => commit({ ...state, filters });

  const { engine, failed, retry } = useSearchEngine(true);
  const query = useDeferredValue(state);
  const results = useMemo(
    () => engine?.searchPeople(query.q, { filters: query.filters, scopes: query.scopes, sort: query.sort }) ?? null,
    [engine, query],
  );
  const counts = useMemo(
    () => engine?.facetCounts(query.q, { filters: query.filters, scopes: query.scopes }) ?? null,
    [engine, query],
  );

  useScrollRestoration(results !== null);

  const total = results?.length ?? 0;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / perPage)));
  const visible = results?.slice((currentPage - 1) * perPage, currentPage * perPage) ?? [];
  const anything = !!state.q.trim() || hasActiveFilters(state.filters);
  const clearAll = () => commit({ ...state, q: '', filters: emptyFilters(), scopes: [...ALL_SCOPES] });

  const pagination = (
    <Pagination
      currentPage={currentPage}
      totalItems={total}
      itemsPerPage={perPage}
      itemsPerPageOptions={PER_PAGE_OPTIONS}
      onPageChange={p => {
        commit(state, p);
        window.scrollTo({ top: 0 });
      }}
      onItemsPerPageChange={per => commit(state, 1, per)}
    />
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <div className="rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-vmi-red">Search Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(s => !s)}
                aria-expanded={showFilters}
                aria-controls="filter-panel"
                className="text-sm font-semibold text-vmi-red underline lg:hidden"
              >
                {showFilters ? 'Hide' : 'Show'}
              </button>
            </div>
            <div id="filter-panel" className={showFilters ? '' : 'hidden lg:block'}>
              <FilterPanel
                state={state}
                engine={engine}
                counts={counts}
                onQuery={q => commit({ ...state, q })}
                onScopes={scopes => commit({ ...state, scopes })}
                onFilters={setFilters}
              />
              <button
                type="button"
                onClick={clearAll}
                className="mt-6 w-full rounded bg-gray-300 px-4 py-2 font-bold text-gray-700 transition-colors hover:bg-gray-400"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-3" aria-labelledby="results-heading">
          <div className="rounded-lg border-2 border-gray-300 bg-white p-6 shadow-xl">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 id="results-heading" className="mb-2 text-3xl font-bold text-vmi-red">
                  Memorial Search
                </h1>
                <p className="text-gray-600" aria-live="polite">
                  {results ? `Found ${total} ${total === 1 ? 'person' : 'people'}` : failed ? '' : 'Loading…'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Sort by
                <select
                  value={state.sort}
                  onChange={e => commit({ ...state, sort: e.target.value as SortKey })}
                  className="rounded border border-gray-300 px-2 py-1 focus:border-vmi-gold focus:outline-none"
                >
                  {SORTS.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <ActiveFilters filters={state.filters} engine={engine} onChange={setFilters} />

            {failed ? (
              <div className="py-12 text-center">
                <p className="text-lg text-gray-600">Search is unavailable right now.</p>
                <button type="button" onClick={retry} className="mt-4 font-semibold text-vmi-red underline hover:text-vmi-dark-red">
                  Try again
                </button>
              </div>
            ) : !results || !engine ? (
              <p className="py-12 text-center text-gray-600">Loading the memorial…</p>
            ) : total > 0 ? (
              <>
                {pagination}
                <div className="space-y-4">
                  {visible.map(hit => (
                    <ResultCard key={hit.person.id} hit={hit} engine={engine} />
                  ))}
                </div>
                {pagination}
              </>
            ) : (
              <div className="py-12 text-center">
                <p className="text-lg text-gray-600">No results found matching your criteria.</p>
                {anything && (
                  <button type="button" onClick={clearAll} className="mt-4 font-semibold text-vmi-red underline hover:text-vmi-dark-red">
                    Clear filters and try again
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
