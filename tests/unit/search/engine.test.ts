import { describe, expect, it } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine, parseQuery, personName, personTitle } from '@/lib/search/engine';
import { emptyFilters } from '@/lib/search/filters';
import type { SearchIndexData } from '@/lib/search/types';

const engine = createSearchEngine(data);
const ids = (hits: { person: { id: number } }[]) => hits.map(h => h.person.id);

describe('parseQuery', () => {
  it('prefix-matches only the last word and adds canonical alternatives', () => {
    const q = parseQuery('First bn');
    expect(q.words.map(w => w.alternatives)).toEqual([
      [{ term: 'first', prefix: false }, { term: '1st', prefix: false }],
      [{ term: 'bn', prefix: true }, { term: 'battalion', prefix: false }],
    ]);
    expect(q.canonical).toEqual(['1st', 'battalion']);
  });

  it('drops stopwords unless nothing else is left', () => {
    expect(parseQuery('battle of the bulge').words.map(w => w.word)).toEqual(['battle', 'bulge']);
    expect(parseQuery('the').words.map(w => w.word)).toEqual(['the']);
  });

  it('sets fuzziness by length and never for numbers', () => {
    const fuzz = (q: string) => parseQuery(q).words[0].fuzzy;
    expect(fuzz('doe')).toBe(false);
    expect(fuzz('jakson')).toBe(1);
    expect(fuzz('gettysbrug')).toBe(2);
    expect(fuzz('19666')).toBe(false);
  });

  it('detects class years and bare years', () => {
    expect(parseQuery("'66").classYear).toEqual({ year: 1966, letter: '' });
    expect(parseQuery("'66").year).toBeNull();
    expect(parseQuery('1944').year).toBe(1944);
    expect(parseQuery('65').words[0].alternatives).toContainEqual({ term: '1965', prefix: false });
  });
});

describe('searchPeople', () => {
  it('applies filters to query results and to the empty query', () => {
    const marines = { ...emptyFilters(), branches: ['MARINES'] };
    expect(engine.searchPeople('', { filters: marines })).toHaveLength(6);
    expect(new Set(ids(engine.searchPeople('silver star', { filters: marines })))).toEqual(new Set([402, 902]));
    const unit = { ...emptyFilters(), units: ['1st Battalion, 7th Marines'] };
    expect(new Set(ids(engine.searchPeople('', { filters: unit })))).toEqual(new Set([103, 402, 902]));
  });

  it('sorts by name, class year and date of death', () => {
    const byYear = ids(engine.searchPeople('', { sort: 'class_year' }));
    expect(byYear[0]).toBe(601); // class of 1842
    expect(byYear.at(-1)).toBe(903); // class of 2007
    const byDeath = engine.searchPeople('', { sort: 'date_of_death' });
    expect(byDeath[0].person.id).toBe(601); // 1847
    expect(byDeath.at(-1)!.person.date_of_death).toBeNull(); // undated last
    const byName = engine.searchPeople('silver star', { sort: 'name' }).map(h => h.person.last_name);
    expect(byName).toEqual([...byName].sort());
  });

  it('restricts fields by scope', () => {
    expect(ids(engine.searchPeople('gettysburg', { scopes: ['names'] }))).toEqual([]);
    expect(ids(engine.searchPeople('gettysburg', { scopes: ['cod'] }))).toEqual([302]);
    expect(ids(engine.searchPeople('jackson', { scopes: ['names'] }))).toEqual([103, 302]);
    expect(ids(engine.searchPeople('jackson', { scopes: ['service'] }))).toEqual([303]);
    expect(engine.searchPeople('jackson', { scopes: [] })).toHaveLength(3); // empty = all
  });

  it('reports the matched terms and fields for highlighting', () => {
    const [hit] = engine.searchPeople('bastog');
    expect(hit.terms).toEqual(['bastogne']);
    expect(hit.fields).toEqual(['cod']);
    const [award] = engine.searchPeople('medaille');
    expect(award.fields).toContain('awards');
  });
});

describe('facetCounts', () => {
  it('counts each dimension ignoring its own filter', () => {
    const filters = { ...emptyFilters(), conflicts: [4], branches: ['MARINES'] };
    const counts = engine.facetCounts('', { filters });
    // Conflict counts ignore the conflict filter but respect the branch filter.
    expect(counts.conflicts.get(4)).toBe(2);
    expect(counts.conflicts.get(1)).toBe(2);
    // Branch counts ignore the branch filter but respect the conflict filter.
    expect(counts.branches.get('MARINES')).toBe(2);
    expect(counts.branches.get('ARMY')).toBe(3);
    // Award counts respect both.
    expect(counts.awards.get(7)).toBe(1);
  });

  it('counts within query results', () => {
    const counts = engine.facetCounts('silver star');
    expect(counts.awards.get(7)).toBe(7);
    expect(counts.conflicts.get(4)).toBe(3);
  });
});

describe('searchFacets', () => {
  it('caps each group', () => {
    const f = engine.searchFacets('7th', { units: 1 });
    expect(f.units).toHaveLength(1);
    expect(engine.searchFacets('war').conflicts.length).toBeLessThanOrEqual(2);
  });

  it('collapses unit groupings with identical members', () => {
    const labels = engine.searchFacets('lafayette').units.map(h => h.item.label);
    expect(labels).toEqual(['N 124 Lafayette Escadrille']);
  });
});

describe('display helpers', () => {
  const doe = engine.personById.get(103)!;
  it('formats names and class years', () => {
    expect(personName(doe)).toBe('Calvin Ross Jackson Jr.');
    expect(personTitle(doe)).toBe("Calvin Ross Jackson Jr. '41");
    expect(personTitle(engine.personById.get(305)!)).toBe('Peyton Ames Loring 1862M');
    expect(personTitle({ ...doe, class_year: null })).toBe('Calvin Ross Jackson Jr.');
  });
});

describe('robustness', () => {
  it('handles people with missing references and an empty index', () => {
    const orphan: SearchIndexData = {
      ...data,
      people: [{ ...data.people[0], id: 9999, conflict: 999, branch: 'NOPE', awards: [999] }],
    };
    const e = createSearchEngine(orphan);
    expect(ids(e.searchPeople(data.people[0].last_name))).toEqual([9999]);
    const empty = createSearchEngine({ version: 1, conflicts: [], awards: [], branches: [], people: [] });
    expect(empty.searchPeople('anything')).toEqual([]);
    expect(empty.searchFacets('anything').units).toEqual([]);
  });
});
