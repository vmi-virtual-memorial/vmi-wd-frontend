// Shared filter model for search-bar chips and the Advanced Search page, and its
// URL form (kept compatible with the original search page's parameters).
import type { IndexPerson } from './types';
import { unitContains, unitKey } from './units';

export type Scope = 'names' | 'service' | 'cod';
export const ALL_SCOPES: Scope[] = ['names', 'service', 'cod'];
export type SortKey = 'relevance' | 'name' | 'class_year' | 'date_of_death';

export interface SearchFilters {
  conflicts: number[];
  branches: string[];
  awards: number[];
  anyAward: boolean;
  /** Unit text (labels or typed); a person matches if their unit contains any of them. */
  units: string[];
  classYears: number[];
  classYearFrom: number | null;
  classYearTo: number | null;
  dateFrom: string;
  dateTo: string;
  noDate: boolean;
  hasDocument: boolean;
  rank: string;
}

export const emptyFilters = (): SearchFilters => ({
  conflicts: [], branches: [], awards: [], anyAward: false, units: [], classYears: [],
  classYearFrom: null, classYearTo: null, dateFrom: '', dateTo: '', noDate: false, hasDocument: false, rank: '',
});

export function hasActiveFilters(f: SearchFilters): boolean {
  return (
    f.conflicts.length > 0 || f.branches.length > 0 || f.awards.length > 0 || f.anyAward || f.units.length > 0 ||
    f.classYears.length > 0 || f.classYearFrom !== null || f.classYearTo !== null || !!f.dateFrom || !!f.dateTo ||
    f.noDate || f.hasDocument || !!f.rank.trim()
  );
}

export type FilterDimension = 'conflicts' | 'branches' | 'awards' | 'units' | 'classYears' | 'other';

/** True when the person passes every filter, optionally ignoring one dimension (for facet counts). */
export function matchesFilters(p: IndexPerson, f: SearchFilters, ignore?: FilterDimension): boolean {
  if (ignore !== 'conflicts' && f.conflicts.length && !f.conflicts.includes(p.conflict)) return false;
  if (ignore !== 'branches' && f.branches.length && !f.branches.includes(p.branch)) return false;
  if (ignore !== 'awards') {
    if (f.anyAward && p.awards.length === 0) return false;
    if (f.awards.length && !f.awards.some(a => p.awards.includes(a))) return false;
  }
  if (ignore !== 'units' && f.units.length && !f.units.some(u => unitContains(p.unit, unitKey(u)))) return false;
  if (ignore !== 'classYears') {
    if (f.classYears.length && (p.class_year === null || !f.classYears.includes(p.class_year))) return false;
    if (f.classYearFrom !== null && (p.class_year === null || p.class_year < f.classYearFrom)) return false;
    if (f.classYearTo !== null && (p.class_year === null || p.class_year > f.classYearTo)) return false;
  }
  if (f.hasDocument && !p.has_document) return false;
  if (f.noDate) {
    if (p.date_of_death) return false;
  } else {
    if (f.dateFrom && (!p.date_of_death || p.date_of_death < f.dateFrom)) return false;
    if (f.dateTo && (!p.date_of_death || p.date_of_death > f.dateTo)) return false;
  }
  if (f.rank.trim() && !unitContains(p.rank, unitKey(f.rank))) return false;
  return true;
}

// ---- URL form ---------------------------------------------------------------

const ids = (value: string | null) =>
  (value || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
const year = (value: string | null) => {
  const n = Number(value);
  return value && Number.isInteger(n) && n > 0 ? n : null;
};
const isoDate = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');
const UNIT_SEPARATOR = '|';

export interface SearchState {
  q: string;
  filters: SearchFilters;
  scopes: Scope[];
  sort: SortKey;
}

export function stateFromParams(params: URLSearchParams): SearchState {
  const award = params.get('award');
  const scopes = (params.get('in') || '').split(',').filter((s): s is Scope => ALL_SCOPES.includes(s as Scope));
  const sort = params.get('sort') as SortKey | null;
  return {
    q: params.get('q') || '',
    filters: {
      conflicts: ids(params.get('conflict')),
      branches: (params.get('branch') || '').split(',').filter(Boolean),
      awards: award === 'any' ? [] : ids(award),
      anyAward: award === 'any',
      units: (params.get('unit') || '').split(UNIT_SEPARATOR).map(s => s.trim()).filter(Boolean),
      classYears: ids(params.get('class_year')),
      classYearFrom: year(params.get('class_year_from')),
      classYearTo: year(params.get('class_year_to')),
      dateFrom: isoDate(params.get('date_from')),
      dateTo: isoDate(params.get('date_to')),
      noDate: params.get('no_date') === 'true',
      hasDocument: params.get('has_document') === 'true',
      rank: params.get('rank') || '',
    },
    scopes: scopes.length ? scopes : [...ALL_SCOPES],
    sort: sort && ['relevance', 'name', 'class_year', 'date_of_death'].includes(sort) ? sort : 'relevance',
  };
}

/** Params for replaceSearchParams/links; defaults become null so they drop out of the URL. */
export function paramsFromState(state: SearchState): Record<string, string | null> {
  const f = state.filters;
  const join = (xs: (string | number)[]) => (xs.length ? xs.join(',') : null);
  const allScopes = ALL_SCOPES.every(s => state.scopes.includes(s));
  return {
    q: state.q.trim() || null,
    conflict: join(f.conflicts),
    branch: join(f.branches),
    award: f.anyAward ? 'any' : join(f.awards),
    unit: f.units.length ? f.units.join(UNIT_SEPARATOR) : null,
    class_year: join(f.classYears),
    class_year_from: f.classYearFrom === null ? null : String(f.classYearFrom),
    class_year_to: f.classYearTo === null ? null : String(f.classYearTo),
    date_from: f.dateFrom || null,
    date_to: f.dateTo || null,
    no_date: f.noDate ? 'true' : null,
    has_document: f.hasDocument ? 'true' : null,
    rank: f.rank.trim() || null,
    in: allScopes ? null : state.scopes.join(','),
    sort: state.sort === 'relevance' ? null : state.sort,
  };
}

export interface SearchLink {
  q?: string;
  filters?: Partial<SearchFilters>;
  scopes?: Scope[];
  sort?: SortKey;
}

export function searchHref(state: SearchLink): string {
  const params = paramsFromState({
    q: state.q ?? '',
    filters: { ...emptyFilters(), ...state.filters },
    scopes: state.scopes ?? [...ALL_SCOPES],
    sort: state.sort ?? 'relevance',
  });
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => e[1] !== null),
  ).toString();
  return `/memorial/search${query ? `?${query}` : ''}`;
}
