import { describe, expect, it } from 'vitest';
import { buildUnitFacets, unitContains, unitKey, unitSegments } from '@/lib/search/units';

const people = [
  { id: 1, unit: 'Company C, 1st Battalion, 7th Marines, 1st Marine Division' },
  { id: 2, unit: 'Company A, 1st Bn, 7th Marines, 1st Marine Division' },
  { id: 3, unit: 'Company H, 3rd Battalion, 7th Marines, 1st Marine Division' },
  { id: 4, unit: 'Fox Company, 506th Parachute Infantry Regiment, 101st Airborne Division' },
  { id: 5, unit: 'D Troop, 1st Squadron, 4th Cavalry, 1st Infantry Division' },
  { id: 6, unit: '' },
  { id: 7, unit: 'First North Carolina Infantry Regiment' },
];

describe('unitSegments', () => {
  it('splits on commas and trims', () => {
    expect(unitSegments(' Company C ,  1st   Battalion,,7th Marines ')).toEqual(['Company C', '1st Battalion', '7th Marines']);
    expect(unitSegments('')).toEqual([]);
  });
});

describe('unitKey / unitContains', () => {
  it('canonicalizes abbreviations and ordinals', () => {
    expect(unitKey('1st Bn, 7th Marines')).toBe('1st battalion 7th marines');
    expect(unitKey('First North Carolina')).toBe('1st north carolina');
  });

  it('matches whole-word runs only', () => {
    const unit = 'Company C, 1st Battalion, 7th Marines, 1st Marine Division';
    expect(unitContains(unit, unitKey('1st Battalion, 7th Marines'))).toBe(true);
    expect(unitContains(unit, unitKey('1st bn 7th marines'))).toBe(true);
    expect(unitContains(unit, unitKey('7th Marine'))).toBe(false);
    expect(unitContains('Company H, 3rd Battalion, 7th Marines', unitKey('1st Battalion, 7th Marines'))).toBe(false);
    expect(unitContains(unit, '')).toBe(true);
  });
});

describe('buildUnitFacets', () => {
  const facets = new Map(buildUnitFacets(people).map(f => [f.key, f]));

  it('groups contiguous segment runs and counts members across spellings', () => {
    expect(facets.get('1st battalion 7th marines')?.personIds.sort()).toEqual([1, 2]);
    expect(facets.get('7th marines')?.personIds.sort()).toEqual([1, 2, 3]);
    expect(facets.get('1st marine division')?.personIds.sort()).toEqual([1, 2, 3]);
    expect(facets.get('7th marines 1st marine division')?.personIds.sort()).toEqual([1, 2, 3]);
  });

  it('keeps the first spelling as the label', () => {
    expect(facets.get('1st battalion 7th marines')?.label).toBe('1st Battalion, 7th Marines');
    expect(facets.get('1st north carolina infantry regiment')?.label).toBe('First North Carolina Infantry Regiment');
  });

  it('never leads with a generic sub-unit', () => {
    for (const key of facets.keys()) {
      expect(key).not.toMatch(/^(company|fox company|d troop)\b/);
    }
  });

  it('skips bare battalion/squadron labels but keeps them inside longer runs', () => {
    expect(facets.has('1st battalion')).toBe(false);
    expect(facets.has('1st squadron')).toBe(false);
    expect(facets.has('1st squadron 4th cavalry')).toBe(true);
  });

  it('caps runs at three segments', () => {
    expect(facets.has('1st battalion 7th marines 1st marine division')).toBe(true);
    for (const facet of facets.values()) expect(facet.label.split(',').length).toBeLessThanOrEqual(3);
  });

  it('ignores empty units', () => {
    for (const facet of facets.values()) expect(facet.personIds).not.toContain(6);
  });
});
