import { describe, expect, it } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine } from '@/lib/search/engine';
import { type Chip, advancedHref, alumni, buildDropdown, chipKey, chipsToFilters, flattenRows } from '@/lib/search/rows';

const engine = createSearchEngine(data);
const groupKeys = (q: string, chips: Chip[] = []) => buildDropdown(engine, q, chips).groups.map(g => g.key);

describe('buildDropdown', () => {
  it('shows recent people and quick links for an empty bar', () => {
    const model = buildDropdown(engine, '', [], [402, 99999, 103]);
    expect(model.groups.map(g => g.key)).toEqual(['recent', 'links']);
    expect(model.groups[0].rows.map(r => r.id)).toEqual(['person:402', 'person:103']); // unknown id skipped
    expect(model.groups[1].rows.map(r => r.href)).toEqual(['/memorial', '/awards']);
    expect(model.footer.map(r => r.href)).toEqual(['/memorial/search']);
    expect(buildDropdown(engine, '  ', []).groups.map(g => g.key)).toEqual(['links']);
  });

  it('orders groups conflicts, awards, branches, units, class years, people', () => {
    expect(groupKeys('silver star')).toEqual(['awards', 'people']);
    expect(groupKeys('marines')).toEqual(['branches', 'units', 'people']);
    expect(groupKeys('1944')).toEqual(['conflicts', 'classYears', 'people']);
    expect(groupKeys('vietnam')).toEqual(['conflicts', 'people']);
  });

  it('links facet rows to their pages or to Advanced Search', () => {
    const rows = flattenRows(buildDropdown(engine, 'marines', []));
    const branch = rows.find(r => r.kind === 'branch')!;
    expect(branch.href).toBe('/memorial/search?branch=MARINES');
    const unit = rows.find(r => r.kind === 'unit')!;
    expect(unit.href).toMatch(/^\/memorial\/search\?unit=/);
    const award = flattenRows(buildDropdown(engine, 'silver star', [])).find(r => r.kind === 'award')!;
    expect(award.href).toBe('/awards/7');
    const conflict = flattenRows(buildDropdown(engine, 'vietnam', [])).find(r => r.kind === 'conflict')!;
    expect(conflict.href).toBe('/memorial/conflict/4');
    const year = flattenRows(buildDropdown(engine, "'66", [])).find(r => r.kind === 'classYear')!;
    expect(year.href).toBe('/memorial/search?class_year=1966');
  });

  it('caps people and adds a see-all row', () => {
    const model = buildDropdown(engine, 'silver star', []);
    const people = model.groups.find(g => g.key === 'people')!;
    expect(people.rows.filter(r => r.kind === 'person')).toHaveLength(6);
    expect(people.rows.at(-1)).toMatchObject({ id: 'see-all', label: 'See all 7 people →' });
    expect(people.note).toBe('7 found');
    expect(model.peopleCount).toBe(7);
    expect(people.rows.at(-1)!.href).toBe('/memorial/search?q=silver+star');
  });

  it('omits see-all when every person fits', () => {
    const people = buildDropdown(engine, 'chosin', []).groups.find(g => g.key === 'people')!;
    expect(people.rows.map(r => r.kind)).toEqual(['person', 'person']);
  });

  it('reports no matches', () => {
    const model = buildDropdown(engine, 'zzzzzz', []);
    expect(model.empty).toBe(true);
    expect(model.groups).toEqual([]);
    expect(flattenRows(model).map(r => r.id)).toEqual(['advanced']);
    expect(model.footer[0].href).toBe('/memorial/search?q=zzzzzz');
  });

  it('chips filter people and hide their own facet row', () => {
    const silver: Chip = { kind: 'award', value: '7', label: 'Silver Star' };
    const model = buildDropdown(engine, 'marines', [silver]);
    const people = model.groups.find(g => g.key === 'people')!;
    expect(new Set(people.rows.map(r => r.id))).toEqual(new Set(['person:402', 'person:902']));
    expect(model.footer[0].href).toBe('/memorial/search?q=marines&award=7');

    const vietnam: Chip = { kind: 'conflict', value: '4', label: 'Vietnam War' };
    const again = buildDropdown(engine, 'vietnam', [vietnam]);
    expect(again.groups.find(g => g.key === 'conflicts')).toBeUndefined();
  });

  it('chips alone list their people', () => {
    const chips: Chip[] = [
      { kind: 'branch', value: 'MARINES', label: 'U.S. Marine Corps' },
      { kind: 'conflict', value: '5', label: 'Korean War' },
    ];
    const model = buildDropdown(engine, '', chips);
    expect(model.groups.map(g => g.key)).toEqual(['people']);
    expect(model.groups[0].rows.map(r => r.id)).toEqual(['person:502']);
  });
});

describe('chips', () => {
  it('map to filters', () => {
    const filters = chipsToFilters([
      { kind: 'conflict', value: '4', label: '' },
      { kind: 'award', value: '7', label: '' },
      { kind: 'branch', value: 'MARINES', label: '' },
      { kind: 'unit', value: '7th Marines', label: '' },
      { kind: 'classYear', value: '1966', label: '' },
    ]);
    expect(filters).toMatchObject({
      conflicts: [4], awards: [7], branches: ['MARINES'], units: ['7th Marines'], classYears: [1966],
    });
    expect(chipKey({ kind: 'unit', value: '7th Marines', label: 'x' })).toBe('unit:7th Marines');
    expect(advancedHref('', [{ kind: 'classYear', value: '1966', label: '' }])).toBe('/memorial/search?class_year=1966');
  });
});

describe('alumni', () => {
  it('pluralizes', () => {
    expect(alumni(1)).toBe('1 alumnus');
    expect(alumni(0)).toBe('0 alumni');
    expect(alumni(27)).toBe('27 alumni');
  });
});
