// Builds the live-search dropdown as data: groups of rows, a footer, and the
// chips (active facet filters). Kept free of React so grouping, caps, and chip
// behavior are unit-tested directly.
import { type ClassYearHit, GROUP_LIMITS, type PersonHit, type SearchEngine } from './engine';
import { type SearchFilters, emptyFilters, searchHref } from './filters';
import type { IndexAward, IndexBranch, IndexConflict, IndexPerson } from './types';
import type { UnitFacet } from './units';

export type ChipKind = 'conflict' | 'award' | 'branch' | 'unit' | 'classYear';

export interface Chip {
  kind: ChipKind;
  value: string;
  label: string;
}

export const chipKey = (chip: Chip) => `${chip.kind}:${chip.value}`;

export const CHIP_PREFIX: Record<ChipKind, string> = {
  conflict: 'Conflict',
  award: 'Award',
  branch: 'Branch',
  unit: 'Unit',
  classYear: 'Class',
};

export function chipsToFilters(chips: Chip[]): SearchFilters {
  const filters = emptyFilters();
  for (const chip of chips) {
    if (chip.kind === 'conflict') filters.conflicts.push(Number(chip.value));
    if (chip.kind === 'award') filters.awards.push(Number(chip.value));
    if (chip.kind === 'branch') filters.branches.push(chip.value);
    if (chip.kind === 'unit') filters.units.push(chip.value);
    if (chip.kind === 'classYear') filters.classYears.push(Number(chip.value));
  }
  return filters;
}

interface RowBase {
  id: string;
  href: string;
  terms: string[];
}

export type Row =
  | (RowBase & { kind: 'conflict'; item: IndexConflict; chip: Chip })
  | (RowBase & { kind: 'award'; item: IndexAward; chip: Chip })
  | (RowBase & { kind: 'branch'; item: IndexBranch; chip: Chip })
  | (RowBase & { kind: 'unit'; item: UnitFacet; chip: Chip })
  | (RowBase & { kind: 'classYear'; item: ClassYearHit; chip: Chip })
  | (RowBase & { kind: 'person'; item: PersonHit })
  | (RowBase & { kind: 'link'; label: string; detail?: string });

export interface RowGroup {
  key: string;
  label: string;
  rows: Row[];
  /** e.g. "27 found" */
  note?: string;
}

export interface DropdownModel {
  groups: RowGroup[];
  footer: Row[];
  /** People matching query + chips (not just those shown). */
  peopleCount: number;
  /** Nothing matched a non-empty query. */
  empty: boolean;
}

export const alumni = (n: number) => (n === 1 ? '1 alumnus' : `${n} alumni`);

const personHref = (id: number) => `/memorial/person/${id}`;

function personRow(hit: PersonHit): Row {
  return { kind: 'person', id: `person:${hit.person.id}`, href: personHref(hit.person.id), terms: hit.terms, item: hit };
}

export function advancedHref(query: string, chips: Chip[]): string {
  return searchHref({ q: query, filters: chipsToFilters(chips) });
}

export function buildDropdown(
  engine: SearchEngine,
  query: string,
  chips: Chip[],
  recent: number[] = [],
): DropdownModel {
  const q = query.trim();
  const filters = chipsToFilters(chips);
  const chipped = new Set(chips.map(chipKey));
  const groups: RowGroup[] = [];
  const advanced = advancedHref(q, chips);
  const footer: Row[] = [{ kind: 'link', id: 'advanced', href: advanced, terms: [], label: 'Advanced Search…' }];

  // Empty bar: recently viewed people and quick links.
  if (!q && chips.length === 0) {
    const recentPeople = recent
      .map(id => engine.personById.get(id))
      .filter((p): p is IndexPerson => !!p)
      .map(person => personRow({ person, score: 0, terms: [], fields: [] }));
    if (recentPeople.length) groups.push({ key: 'recent', label: 'Recently viewed', rows: recentPeople });
    groups.push({
      key: 'links',
      label: 'Browse',
      rows: [
        { kind: 'link', id: 'link:index', href: '/memorial', terms: [], label: 'Complete Index', detail: alumni(engine.people.length) },
        { kind: 'link', id: 'link:awards', href: '/awards', terms: [], label: 'Awards for Heroism & Gallantry' },
      ],
    });
    return { groups, footer, peopleCount: engine.people.length, empty: false };
  }

  if (q) {
    const facets = engine.searchFacets(q, {
      // Ask for one extra per group so chipped facets can be skipped without losing a row.
      conflicts: GROUP_LIMITS.conflicts + chips.length,
      awards: GROUP_LIMITS.awards + chips.length,
      branches: GROUP_LIMITS.branches + chips.length,
      units: GROUP_LIMITS.units + chips.length,
      classYears: GROUP_LIMITS.classYears + chips.length,
    });
    const pushGroup = (key: keyof typeof GROUP_LIMITS, label: string, rows: Row[]) => {
      const kept = rows.filter(r => !('chip' in r) || !chipped.has(chipKey(r.chip))).slice(0, GROUP_LIMITS[key]);
      if (kept.length) groups.push({ key, label, rows: kept });
    };

    pushGroup('conflicts', 'Conflicts', facets.conflicts.map((h): Row => ({
      kind: 'conflict', id: `conflict:${h.item.id}`, href: `/memorial/conflict/${h.item.id}`, terms: h.terms, item: h.item,
      chip: { kind: 'conflict', value: String(h.item.id), label: h.item.name },
    })));
    pushGroup('awards', 'Awards', facets.awards.map((h): Row => ({
      kind: 'award', id: `award:${h.item.id}`, href: `/awards/${h.item.id}`, terms: h.terms, item: h.item,
      chip: { kind: 'award', value: String(h.item.id), label: h.item.name },
    })));
    pushGroup('branches', 'Branches', facets.branches.map((h): Row => ({
      kind: 'branch', id: `branch:${h.item.code}`, href: searchHref({ filters: { branches: [h.item.code] } }),
      terms: h.terms, item: h.item, chip: { kind: 'branch', value: h.item.code, label: h.item.name },
    })));
    pushGroup('units', 'Units', facets.units.map((h): Row => ({
      kind: 'unit', id: `unit:${h.item.key}`, href: searchHref({ filters: { units: [h.item.label] } }),
      terms: h.terms, item: h.item, chip: { kind: 'unit', value: h.item.label, label: h.item.label },
    })));
    pushGroup('classYears', 'Class years', facets.classYears.map((h): Row => ({
      kind: 'classYear', id: `classYear:${h.label}`, href: searchHref({ filters: { classYears: [h.year] } }),
      terms: [], item: h, chip: { kind: 'classYear', value: String(h.year), label: `Class of ${h.label}` },
    })));
  }

  const people = engine.searchPeople(q, { filters });
  if (people.length) {
    const rows = people.slice(0, GROUP_LIMITS.people).map(personRow);
    if (people.length > rows.length) {
      rows.push({ kind: 'link', id: 'see-all', href: advanced, terms: [], label: `See all ${people.length} people →` });
    }
    groups.push({ key: 'people', label: 'People', rows, note: `${people.length} found` });
  }

  return { groups, footer, peopleCount: people.length, empty: groups.length === 0 };
}

/** All selectable rows in display order (the listbox options). */
export const flattenRows = (model: DropdownModel): Row[] => [...model.groups.flatMap(g => g.rows), ...model.footer];
