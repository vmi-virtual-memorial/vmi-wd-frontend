// Relevance regression suite: queries a visitor would type, against the synthetic
// fixture (tests/fixtures/search-index.json, generated from the backend's
// search_demo fixture). Each row pins what must (and must not) come back.
import { describe, expect, it } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine } from '@/lib/search/engine';

const engine = createSearchEngine(data);
const people = (q: string) => engine.searchPeople(q).map(h => h.person.id);
const top = (q: string, n: number) => people(q).slice(0, n);
const facets = (q: string) => engine.searchFacets(q);

const SILVER_STAR_RECIPIENTS = [101, 106, 401, 402, 403, 501, 902];
const MARINES = [103, 109, 402, 405, 502, 902];
const WWII = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const VIETNAM = [401, 402, 403, 404, 405, 406];

describe('awards', () => {
  it('"silver star" returns exactly the recipients, award first', () => {
    for (const q of ['silver star', 'Silver Star', 'SILVER STAR', 'silver sta']) {
      expect(new Set(people(q)), q).toEqual(new Set(SILVER_STAR_RECIPIENTS));
    }
    expect(facets('silver star').awards[0].item.name).toBe('Silver Star');
  });

  it('combines facets with plain words', () => {
    expect(new Set(people('silver star vietnam'))).toEqual(new Set([401, 402, 403]));
    expect(new Set(people('silver star marines'))).toEqual(new Set([402, 902]));
  });

  it('folds accents and finds partial award names', () => {
    expect(people('medaille')).toEqual([201]);
    expect(people('Médaille')).toEqual([201]);
    expect(facets('medaille').awards[0].item.name).toBe('Médaille Militaire');
    expect(new Set(people('croix'))).toEqual(new Set([201, 203]));
  });

  it('knows award abbreviations', () => {
    expect(facets('moh').awards.map(h => h.item.name)).toContain('Medal of Honor (Navy)');
    expect(facets('dsc').awards[0].item.name).toBe('Distinguished Service Cross');
    expect(people('moh')).toEqual([104]);
  });

  it('finds awards only mentioned in the narrative', () => {
    expect(new Set(people('bronze star'))).toEqual(new Set([405, 901]));
    expect(facets('bronze star').awards).toEqual([]);
  });
});

describe('branches and units', () => {
  it('"marines" finds the branch, Marine units and their people', () => {
    const ids = people('marines');
    for (const id of MARINES) expect(ids).toContain(id);
    expect(ids).toContain(205); // Navy corpsman serving with the 6th Marines
    expect(facets('marines').branches[0].item.code).toBe('MARINES');
    expect(facets('marines').units.map(h => h.item.label)).toContain('7th Marines');
  });

  it('branch aliases', () => {
    expect(facets('confederate').branches[0].item.code).toBe('CSA');
    expect(new Set(people('confederate'))).toEqual(new Set([301, 302, 303, 306, 1101]));
    expect(facets('usmc').branches[0].item.code).toBe('MARINES');
    expect(facets('air force').branches[0].item.code).toBe('AIR_FORCE');
  });

  it('a battalion query ranks that battalion first', () => {
    for (const q of ['1st battalion 7th marines', '1st bn 7th marines', 'first battalion seventh marines']) {
      expect(new Set(top(q, 3)), q).toEqual(new Set([103, 402, 902]));
      expect(facets(q).units[0].item.label, q).toBe('1st Battalion, 7th Marines');
      expect(facets(q).units[0].item.personIds).toHaveLength(3);
    }
    // 3rd Bn, 7th Marines (in the 1st Marine Division) shares every word but ranks after.
    const ids = people('1st battalion 7th marines');
    if (ids.includes(502)) expect(ids.indexOf(502)).toBeGreaterThan(2);
  });

  it('ordinal words match numerals both ways', () => {
    expect(people('first north carolina')).toEqual([305]);
    expect(people('1st north carolina')).toEqual([305]);
    expect(people('24th battalion')).toEqual([204]); // data says "Twenty-fourth Battalion"
  });

  it('squadrons and named units', () => {
    expect(people('lafayette')).toEqual([201]);
    expect(people('lafayette escadrille')).toEqual([201]);
    expect(people('557th')).toEqual([404]);
    expect(facets('557th').units[0].item.label).toBe('557th Tactical Fighter Squadron');
  });
});

describe('conflicts', () => {
  it('conflict names and aliases', () => {
    expect(facets('vietnam').conflicts[0].item.name).toBe('Vietnam War');
    expect(new Set(people('vietnam'))).toEqual(new Set(VIETNAM));
    for (const q of ['ww2', 'wwii', 'world war 2', 'world war ii']) {
      expect(facets(q).conflicts[0].item.name, q).toBe('World War II');
      expect(new Set(people(q)), q).toEqual(new Set(WWII));
    }
    expect(facets('ww1').conflicts[0].item.name).toBe('World War I');
    expect(facets('gwot').conflicts[0].item.name).toBe('Global War on Terror');
  });

  it('a bare year suggests conflicts during it and the class year', () => {
    const f = facets('1944');
    expect(f.conflicts.map(h => h.item.name)).toContain('World War II');
    expect(f.classYears[0]).toMatchObject({ year: 1944, count: 1 });
  });

  it('new market', () => {
    const f = facets('new market');
    expect(f.conflicts[0].item.name).toBe('Battle of New Market');
    expect(f.branches[0].item.code).toBe('CADET');
    expect(new Set(top('new market', 2))).toEqual(new Set([1001, 1002]));
  });
});

describe('names, class years and typos', () => {
  it('surname matches beat given-name and unit matches', () => {
    expect(top('jackson', 3)).toEqual([103, 302, 303]);
  });

  it('typos fall back to fuzzy matching', () => {
    expect(people('jakson')[0]).toBe(103);
    expect(people('rowen')[0]).toBe(201);
    expect(people('gettysbrug')).toEqual([302]);
  });

  it('real narrative matches beat fuzzy name matches', () => {
    expect(people('normandy')).toEqual([101]); // not Norman Tate
  });

  it('class years in every written form', () => {
    expect(people("'66")).toEqual([401]);
    expect(facets("'66").classYears[0]).toMatchObject({ year: 1966, count: 1 });
    expect(facets("'66").conflicts).toEqual([]); // apostrophe = class year, not "during"
    expect(people('1862m')).toEqual([305]);
    expect(facets('1862M').classYears[0]).toMatchObject({ label: '1862M', count: 1 });
    expect(facets('1863ms').classYears[0]).toMatchObject({ label: '1863MS', count: 1 });
    expect(facets('1999').classYears).toEqual([]);
    expect(people('66')).toContain(401);
  });

  it('prefix-matches the word being typed only', () => {
    expect(people('whit')).toEqual(expect.arrayContaining([104, 304, 402]));
    expect(people('whit calvin')).toEqual([]); // "whit" is complete once followed by another word
  });
});

describe('circumstances of death', () => {
  it('finds places and events', () => {
    expect(people('bastogne')).toEqual([106]);
    expect(people('gettysburg')).toEqual([302]);
    expect(people('battle of the bulge')).toEqual([106]);
    expect(people('hue')).toEqual([401]);
    expect(new Set(people('chosin'))).toEqual(new Set([501, 502]));
  });

  it('ranks narrative-only matches below field matches', () => {
    // 401 has "Silver Star" in the narrative AND the award; 101 only the award.
    const ids = people('silver star');
    expect(ids[0]).toBe(401);
    // 205's only Marine connection is the unit; Marine-branch people come first.
    const marines = people('marines');
    expect(marines.indexOf(205)).toBeGreaterThan(marines.indexOf(103));
  });
});

describe('edge cases', () => {
  it('empty and whitespace queries list everyone by name', () => {
    expect(people('')).toHaveLength(40);
    expect(people('   ')[0]).toBe(301); // Abernathy
    const f = facets('');
    expect([f.conflicts, f.awards, f.branches, f.units, f.classYears].every(g => g.length === 0)).toBe(true);
  });

  it('stopword-only and punctuation-only queries do not crash', () => {
    expect(() => people('the')).not.toThrow();
    expect(people('!!!')).toHaveLength(40);
  });

  it('no results', () => {
    expect(people('zzzzzz')).toEqual([]);
    expect(facets('zzzzzz').units).toEqual([]);
  });
});
