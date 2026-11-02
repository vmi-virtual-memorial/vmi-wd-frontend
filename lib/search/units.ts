// Units are free text, smallest to largest: "Company C, 1st Battalion, 7th Marines,
// 1st Marine Division". Contiguous runs of comma segments ("1st Battalion, 7th
// Marines") are meaningful groupings people search for, so each run becomes a
// facet with the set of people who served in it.
import { canonical, fold, tokenize } from './normalize';

export interface UnitFacet {
  /** Canonical token sequence, e.g. "1st battalion 7th marines". */
  key: string;
  /** Display text as written in the data, e.g. "1st Battalion, 7th Marines". */
  label: string;
  personIds: number[];
}

const MAX_SEGMENTS = 3;

// Segments too generic to lead a label ("Company C, ..." of what?).
const GENERIC_LEAD = /^(company|co|battery|troop|headquarters|hq|detachment|platoon|flight|section|squad|to)\b|^\S+ (company|troop|battery)$/;
// Sub-units that mean nothing without their parent ("1st Battalion").
const BARE_SUBUNIT = /^\d+(st|nd|rd|th) (battalion|squadron)$/;

export function unitSegments(unit: string): string[] {
  return unit.split(',').map(s => s.trim().replace(/\s+/g, ' ')).filter(s => tokenize(s).length > 0);
}

/** Canonical token string of free text; units match when one contains the other. */
export function unitKey(text: string): string {
  return tokenize(text).map(canonical).join(' ');
}

/** Does this unit text contain the given unit key as a whole-word run? */
export function unitContains(unit: string, key: string): boolean {
  if (!key) return true;
  return ` ${unitKey(unit)} `.includes(` ${key} `);
}

export function buildUnitFacets(people: { id: number; unit: string }[]): UnitFacet[] {
  const facets = new Map<string, { label: string; ids: Set<number> }>();
  for (const person of people) {
    const segments = unitSegments(person.unit);
    const folded = segments.map(s => fold(s).replace(/["']/g, ''));
    const keys = segments.map(unitKey);
    for (let i = 0; i < segments.length; i++) {
      if (GENERIC_LEAD.test(folded[i])) continue;
      for (let j = i + 1; j <= Math.min(segments.length, i + MAX_SEGMENTS); j++) {
        if (j === i + 1 && BARE_SUBUNIT.test(keys[i])) continue;
        const key = keys.slice(i, j).join(' ');
        const entry = facets.get(key) ?? { label: segments.slice(i, j).join(', '), ids: new Set<number>() };
        entry.ids.add(person.id);
        facets.set(key, entry);
      }
    }
  }
  return [...facets].map(([key, { label, ids }]) => ({ key, label, personIds: [...ids] }));
}
