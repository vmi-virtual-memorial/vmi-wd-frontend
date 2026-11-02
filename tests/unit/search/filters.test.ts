import { describe, expect, it } from 'vitest';
import {
  type SearchFilters,
  emptyFilters,
  hasActiveFilters,
  matchesFilters,
  paramsFromState,
  searchHref,
  stateFromParams,
} from '@/lib/search/filters';
import type { IndexPerson } from '@/lib/search/types';

const person = (overrides: Partial<IndexPerson> = {}): IndexPerson => ({
  id: 1, first_name: 'John', middle_name: '', last_name: 'Doe', suffix: '', rank: 'Captain USMC',
  unit: 'Company C, 1st Battalion, 7th Marines', branch: 'MARINES', class_year: 1966, class_letter: '',
  conflict: 4, date_of_death: '1968-03-01', death_date_display: 'March 1968', death_description: '',
  has_document: true, awards: [7], ...overrides,
});

const filters = (overrides: Partial<SearchFilters>) => ({ ...emptyFilters(), ...overrides });

describe('matchesFilters', () => {
  const p = person();

  it('passes with no filters', () => {
    expect(matchesFilters(p, emptyFilters())).toBe(true);
    expect(hasActiveFilters(emptyFilters())).toBe(false);
  });

  it('ORs within a dimension and ANDs across them', () => {
    expect(matchesFilters(p, filters({ conflicts: [1, 4] }))).toBe(true);
    expect(matchesFilters(p, filters({ conflicts: [1] }))).toBe(false);
    expect(matchesFilters(p, filters({ conflicts: [4], branches: ['ARMY'] }))).toBe(false);
    expect(matchesFilters(p, filters({ branches: ['ARMY', 'MARINES'] }))).toBe(true);
  });

  it('filters awards by id or any', () => {
    expect(matchesFilters(p, filters({ awards: [4, 7] }))).toBe(true);
    expect(matchesFilters(p, filters({ awards: [4] }))).toBe(false);
    expect(matchesFilters(p, filters({ anyAward: true }))).toBe(true);
    expect(matchesFilters(person({ awards: [] }), filters({ anyAward: true }))).toBe(false);
  });

  it('matches units and ranks by whole-word containment', () => {
    expect(matchesFilters(p, filters({ units: ['1st Bn, 7th Marines'] }))).toBe(true);
    expect(matchesFilters(p, filters({ units: ['3rd Battalion, 7th Marines', '7th Marines'] }))).toBe(true);
    expect(matchesFilters(p, filters({ units: ['3rd Battalion'] }))).toBe(false);
    expect(matchesFilters(p, filters({ rank: 'captain' }))).toBe(true);
    expect(matchesFilters(p, filters({ rank: 'major' }))).toBe(false);
  });

  it('filters class years exactly and by range', () => {
    expect(matchesFilters(p, filters({ classYears: [1966] }))).toBe(true);
    expect(matchesFilters(p, filters({ classYears: [1965] }))).toBe(false);
    expect(matchesFilters(p, filters({ classYearFrom: 1960, classYearTo: 1966 }))).toBe(true);
    expect(matchesFilters(p, filters({ classYearFrom: 1967 }))).toBe(false);
    expect(matchesFilters(p, filters({ classYearTo: 1965 }))).toBe(false);
    expect(matchesFilters(person({ class_year: null }), filters({ classYearFrom: 1900 }))).toBe(false);
  });

  it('filters dates, missing dates and documents', () => {
    expect(matchesFilters(p, filters({ dateFrom: '1968-01-01', dateTo: '1968-12-31' }))).toBe(true);
    expect(matchesFilters(p, filters({ dateFrom: '1969-01-01' }))).toBe(false);
    expect(matchesFilters(p, filters({ dateTo: '1967-12-31' }))).toBe(false);
    expect(matchesFilters(p, filters({ noDate: true }))).toBe(false);
    expect(matchesFilters(person({ date_of_death: null }), filters({ noDate: true, dateFrom: '1900-01-01' }))).toBe(true);
    expect(matchesFilters(person({ date_of_death: null }), filters({ dateFrom: '1900-01-01' }))).toBe(false);
    expect(matchesFilters(person({ has_document: false }), filters({ hasDocument: true }))).toBe(false);
  });

  it('can ignore one dimension for facet counts', () => {
    const f = filters({ conflicts: [1], branches: ['ARMY'] });
    expect(matchesFilters(p, f, 'conflicts')).toBe(false);
    expect(matchesFilters(p, filters({ conflicts: [1] }), 'conflicts')).toBe(true);
    expect(matchesFilters(p, filters({ branches: ['ARMY'] }), 'branches')).toBe(true);
    expect(matchesFilters(p, filters({ awards: [4] }), 'awards')).toBe(true);
    expect(matchesFilters(p, filters({ units: ['x'] }), 'units')).toBe(true);
    expect(matchesFilters(p, filters({ classYears: [1] }), 'classYears')).toBe(true);
  });
});

describe('URL state', () => {
  it('reads the legacy search page parameters', () => {
    const state = stateFromParams(new URLSearchParams('q=doe&class_year=1966,x,1967&conflict=4&date_from=1968-01-01&date_to=bad&no_date=true&has_document=true'));
    expect(state.q).toBe('doe');
    expect(state.filters.classYears).toEqual([1966, 1967]);
    expect(state.filters.conflicts).toEqual([4]);
    expect(state.filters.dateFrom).toBe('1968-01-01');
    expect(state.filters.dateTo).toBe('');
    expect(state.filters.noDate).toBe(true);
    expect(state.filters.hasDocument).toBe(true);
    expect(state.scopes).toEqual(['names', 'service', 'cod']);
    expect(state.sort).toBe('relevance');
  });

  it('round-trips every filter', () => {
    const state = {
      q: 'silver star',
      filters: filters({
        conflicts: [4, 5], branches: ['MARINES'], awards: [7], units: ['1st Battalion, 7th Marines', '7th Cavalry'],
        classYears: [1966], classYearFrom: 1960, classYearTo: 1970, dateFrom: '1966-01-01', dateTo: '1970-12-31',
        noDate: false, hasDocument: true, rank: 'captain',
      }),
      scopes: ['names' as const, 'cod' as const],
      sort: 'class_year' as const,
    };
    const params = new URLSearchParams(
      Object.entries(paramsFromState(state)).filter((e): e is [string, string] => e[1] !== null),
    );
    expect(stateFromParams(params)).toEqual(state);
  });

  it('encodes "any award" and drops defaults', () => {
    const params = paramsFromState({ q: ' ', filters: filters({ anyAward: true }), scopes: ['names', 'service', 'cod'], sort: 'relevance' });
    expect(params.award).toBe('any');
    expect(params.q).toBeNull();
    expect(params.in).toBeNull();
    expect(params.sort).toBeNull();
    expect(stateFromParams(new URLSearchParams('award=any')).filters.anyAward).toBe(true);
  });

  it('ignores unknown scopes and sorts', () => {
    const state = stateFromParams(new URLSearchParams('in=bogus&sort=bogus'));
    expect(state.scopes).toEqual(['names', 'service', 'cod']);
    expect(state.sort).toBe('relevance');
  });

  it('builds Advanced Search links', () => {
    expect(searchHref({})).toBe('/memorial/search');
    expect(searchHref({ q: 'silver star' })).toBe('/memorial/search?q=silver+star');
    expect(searchHref({ filters: { branches: ['MARINES'] } })).toBe('/memorial/search?branch=MARINES');
    expect(searchHref({ filters: { units: ['1st Battalion, 7th Marines'] } })).toBe(
      '/memorial/search?unit=1st+Battalion%2C+7th+Marines',
    );
  });
});
