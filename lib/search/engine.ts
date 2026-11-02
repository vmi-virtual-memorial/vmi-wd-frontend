// In-browser search over the memorial's search index.
//
// Two MiniSearch indexes: people (denormalized: names, class year, rank, branch,
// unit, conflict, award names, circumstances of death) and facets (conflicts,
// awards, branches, unit groupings). Queries are run word by word and ANDed, so
// "silver star vietnam" finds Vietnam-era Silver Star recipients with no syntax.
//
// Ranking rules (enforced by tests/unit/search/golden.test.ts):
//  - only the last word is prefix-matched (it is the one being typed);
//  - typo tolerance is a fallback, used only for a word with no exact/prefix
//    match, so real matches ("Normandy" in a narrative) beat fuzzy name matches;
//  - a contiguous phrase match in name/unit/award/conflict gets a bonus;
//  - circumstances-of-death matches count, but weigh least.
import MiniSearch, { type SearchResult } from 'minisearch';

import { formatClassYear } from '../classYear';
import { awardAliases, conflictAliases } from './aliases';
import { expandClassYears, parseClassYear } from './classYear';
import { type FilterDimension, type Scope, type SearchFilters, type SortKey, ALL_SCOPES, emptyFilters, matchesFilters } from './filters';
import { STOPWORDS, canonical, processTerm, termVariants, tokenize } from './normalize';
import type { IndexAward, IndexBranch, IndexConflict, IndexPerson, SearchIndexData } from './types';
import { type UnitFacet, buildUnitFacets } from './units';

// ---- query parsing -----------------------------------------------------------

interface Alternative {
  term: string;
  prefix: boolean;
}

export interface QueryWord {
  word: string;
  alternatives: Alternative[];
  fuzzy: number | false;
}

export interface ParsedQuery {
  text: string;
  words: QueryWord[];
  /** Canonical words, for phrase matching. */
  canonical: string[];
  classYear: { year: number; letter: string } | null;
  /** A bare four-digit year, for "conflicts during 1944". */
  year: number | null;
}

export function parseQuery(text: string): ParsedQuery {
  const expanded = expandClassYears(text.trim());
  let words = tokenize(expanded);
  const meaningful = words.filter(w => !STOPWORDS.has(w));
  if (meaningful.length) words = meaningful;

  const parsedWords = words.map((word, i): QueryWord => {
    const last = i === words.length - 1;
    // A lone digit is not prefix-matched: "world war 2" must not mean "world war 2nd ...".
    const prefix = last && !/^\d$/.test(word);
    const alternatives: Alternative[] = termVariants(word).map((term, j) => ({ term, prefix: prefix && j === 0 }));
    // A bare two-digit number may be an abbreviated class year ("65").
    if (/^\d{2}$/.test(word)) alternatives.push({ term: `19${word}`, prefix: false });
    const hasDigit = /\d/.test(word);
    const fuzzy = hasDigit ? false : word.length >= 8 ? 2 : word.length >= 5 ? 1 : false;
    return { word, alternatives, fuzzy };
  });

  const classYear = parseClassYear(expanded);
  // Only a bare four-digit year means "during"; "'66" is explicitly a class year.
  const yearMatch = /^\d{4}$/.test(text.trim()) ? Number(text.trim()) : null;
  return {
    text,
    words: parsedWords,
    canonical: words.map(canonical),
    classYear,
    year: yearMatch,
  };
}

// ---- matching ------------------------------------------------------------------

export interface Match {
  score: number;
  /** Index terms that matched (feed to highlight()). */
  terms: string[];
  /** Fields that matched. */
  fields: string[];
}

type Accumulator = Map<string | number, { score: number; terms: Set<string>; fields: Set<string> }>;

const SEARCH_WEIGHTS = { prefix: 0.5, fuzzy: 0.35 };
const IDENTITY = { tokenize: (s: string) => [s], processTerm: (s: string) => s };

function addResults(into: Accumulator, results: SearchResult[]) {
  for (const r of results) {
    const entry = into.get(r.id) ?? { score: 0, terms: new Set<string>(), fields: new Set<string>() };
    entry.score = Math.max(entry.score, r.score);
    r.terms.forEach(t => entry.terms.add(t));
    Object.values(r.match).forEach(fields => fields.forEach(f => entry.fields.add(f)));
    into.set(r.id, entry);
  }
}

function runQuery(
  index: MiniSearch,
  query: ParsedQuery,
  options: { fields?: string[]; boost?: Record<string, number> },
): Accumulator | null {
  if (!query.words.length) return null;
  let combined: Accumulator | null = null;
  for (const word of query.words) {
    const hits: Accumulator = new Map();
    for (const alt of word.alternatives) {
      addResults(hits, index.search(alt.term, { ...options, ...IDENTITY, prefix: alt.prefix, fuzzy: false, weights: SEARCH_WEIGHTS }));
    }
    if (hits.size === 0 && word.fuzzy) {
      const first = word.alternatives[0];
      addResults(hits, index.search(first.term, { ...options, ...IDENTITY, prefix: first.prefix, fuzzy: word.fuzzy, weights: SEARCH_WEIGHTS }));
    }
    if (combined === null) {
      combined = hits;
    } else {
      const next: Accumulator = new Map();
      for (const [id, a] of combined) {
        const b = hits.get(id);
        if (!b) continue;
        next.set(id, {
          score: a.score + b.score,
          terms: new Set([...a.terms, ...b.terms]),
          fields: new Set([...a.fields, ...b.fields]),
        });
      }
      combined = next;
    }
    if (combined.size === 0) break;
  }
  return combined;
}

/**
 * Phrase containment against a " word word " string. The needle starts on a word
 * boundary; whatever follows it is a space or the rest of the word being typed,
 * so the final query word may be a prefix.
 */
function containsPhrase(haystack: string, words: string[]): boolean {
  return words.length >= 2 && haystack.includes(` ${words.join(' ')}`);
}

const canonicalText = (text: string) => ` ${tokenize(text).map(canonical).join(' ')} `;

// ---- engine ------------------------------------------------------------------------

const PERSON_BOOST = { name: 4, last: 3, classYear: 3, rank: 1.5, branch: 2.5, unit: 2, conflict: 2, awards: 4, cod: 0.5 };
const SCOPE_FIELDS: Record<Scope, string[]> = {
  names: ['name', 'last', 'classYear'],
  service: ['rank', 'branch', 'unit', 'conflict', 'awards'],
  cod: ['cod'],
};
const PHRASE_BONUS = 1.75;
const UNIT_RELATIVE_CUTOFF = 0.5;

export const GROUP_LIMITS = { conflicts: 2, awards: 2, branches: 2, units: 3, classYears: 1, people: 6 };

export interface PersonHit extends Match {
  person: IndexPerson;
}

export interface FacetHit<T> extends Match {
  item: T;
}

export interface ClassYearHit {
  year: number;
  letter: string;
  label: string;
  count: number;
}

export interface FacetResults {
  conflicts: FacetHit<IndexConflict>[];
  awards: FacetHit<IndexAward>[];
  branches: FacetHit<IndexBranch>[];
  units: FacetHit<UnitFacet>[];
  classYears: ClassYearHit[];
}

export interface PeopleSearchOptions {
  filters?: SearchFilters;
  scopes?: Scope[];
  sort?: SortKey;
}

export interface FacetCounts {
  conflicts: Map<number, number>;
  branches: Map<string, number>;
  awards: Map<number, number>;
}

type FacetKind = 'conflict' | 'award' | 'branch' | 'unit';
interface FacetDoc {
  id: string;
  kind: FacetKind;
  label: string;
  aliases: string;
}

const byName = (a: IndexPerson, b: IndexPerson) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name) || a.id - b.id;

const SORTS: Record<Exclude<SortKey, 'relevance'>, (a: IndexPerson, b: IndexPerson) => number> = {
  name: byName,
  class_year: (a, b) => (a.class_year ?? 9999) - (b.class_year ?? 9999) || byName(a, b),
  date_of_death: (a, b) => (a.date_of_death ?? '9999').localeCompare(b.date_of_death ?? '9999') || byName(a, b),
};

// Allied aliases name specific nations and services ("french", "raf"); on a person
// they would make every allied soldier match every nation. The facet keeps them all.
const NATION_SPECIFIC_BRANCHES: Record<string, string[]> = { ALLIED: ['allied', 'foreign'] };

function personBranchAliases(branch: IndexBranch): string[] {
  return NATION_SPECIFIC_BRANCHES[branch.code] ?? branch.aliases;
}

export function personName(p: IndexPerson): string {
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(' ');
}

export function personTitle(p: IndexPerson): string {
  const year = formatClassYear(p.class_year, p.class_letter);
  return year ? `${personName(p)} ${year}` : personName(p);
}

export class SearchEngine {
  readonly data: SearchIndexData;
  readonly people: IndexPerson[];
  readonly personById = new Map<number, IndexPerson>();
  readonly conflictById = new Map<number, IndexConflict>();
  readonly awardById = new Map<number, IndexAward>();
  readonly branchByCode = new Map<string, IndexBranch>();
  readonly unitFacets: UnitFacet[];
  private readonly unitByKey = new Map<string, UnitFacet>();
  private readonly peopleIndex: MiniSearch;
  private readonly facetIndex: MiniSearch<FacetDoc>;
  private readonly phraseText = new Map<number, string[]>();

  constructor(data: SearchIndexData) {
    this.data = data;
    this.people = [...data.people].sort(byName);
    data.people.forEach(p => this.personById.set(p.id, p));
    data.conflicts.forEach(c => this.conflictById.set(c.id, c));
    data.awards.forEach(a => this.awardById.set(a.id, a));
    data.branches.forEach(b => this.branchByCode.set(b.code, b));

    this.peopleIndex = new MiniSearch({
      fields: Object.keys(PERSON_BOOST),
      tokenize,
      processTerm,
      searchOptions: { boost: PERSON_BOOST },
    });
    this.peopleIndex.addAll(
      data.people.map(p => {
        const conflict = this.conflictById.get(p.conflict);
        const branch = this.branchByCode.get(p.branch);
        const awards = p.awards.map(id => this.awardById.get(id)).filter((a): a is IndexAward => !!a);
        const doc = {
          id: p.id,
          name: personName(p),
          last: p.last_name,
          classYear: p.class_year ? `${p.class_year} ${p.class_year}${p.class_letter}` : '',
          rank: p.rank,
          branch: branch ? [branch.name, ...personBranchAliases(branch)].join(' ') : '',
          unit: p.unit,
          conflict: conflict ? [conflict.name, ...conflictAliases(conflict.name)].join(' ') : '',
          awards: awards.map(a => [a.name, ...awardAliases(a.name)].join(' ')).join(' | '),
          cod: p.death_description,
        };
        this.phraseText.set(p.id, [doc.name, doc.unit, doc.awards, conflict?.name ?? ''].map(canonicalText));
        return doc;
      }),
    );

    this.unitFacets = buildUnitFacets(data.people);
    this.unitFacets.forEach(u => this.unitByKey.set(u.key, u));
    this.facetIndex = new MiniSearch<FacetDoc>({
      fields: ['label', 'aliases'],
      tokenize,
      processTerm,
      searchOptions: { boost: { label: 2, aliases: 1 } },
    });
    this.facetIndex.addAll([
      ...data.conflicts.map(c => ({ id: `conflict:${c.id}`, kind: 'conflict' as const, label: c.name, aliases: conflictAliases(c.name).join(' ') })),
      ...data.awards.map(a => ({ id: `award:${a.id}`, kind: 'award' as const, label: a.name, aliases: awardAliases(a.name).join(' ') })),
      ...data.branches.map(b => ({ id: `branch:${b.code}`, kind: 'branch' as const, label: b.name, aliases: b.aliases.join(' ') })),
      ...this.unitFacets.map(u => ({ id: `unit:${u.key}`, kind: 'unit' as const, label: u.label, aliases: '' })),
    ]);
  }

  /** People matching the query (all people when the query is empty), filtered and sorted. */
  searchPeople(text: string, options: PeopleSearchOptions = {}): PersonHit[] {
    const query = parseQuery(text);
    const filters = options.filters ?? emptyFilters();
    const hits = this.matchPeople(query, options.scopes);
    const results: PersonHit[] = [];
    if (hits === null) {
      for (const person of this.people) {
        if (matchesFilters(person, filters)) results.push({ person, score: 0, terms: [], fields: [] });
      }
    } else {
      for (const [id, hit] of hits) {
        const person = this.personById.get(id as number)!;
        if (matchesFilters(person, filters)) results.push({ person, ...hit });
      }
    }
    const sort = options.sort ?? 'relevance';
    if (sort === 'relevance') results.sort((a, b) => b.score - a.score || byName(a.person, b.person));
    else results.sort((a, b) => SORTS[sort](a.person, b.person));
    return results;
  }

  /** Counts per conflict/branch/award among people matching the query and every other filter. */
  facetCounts(text: string, options: PeopleSearchOptions = {}): FacetCounts {
    const filters = options.filters ?? emptyFilters();
    const hits = this.matchPeople(parseQuery(text), options.scopes);
    const pool = hits === null ? this.people : [...hits.keys()].map(id => this.personById.get(id as number)!);
    const counts: FacetCounts = { conflicts: new Map(), branches: new Map(), awards: new Map() };
    const bump = <K>(map: Map<K, number>, key: K) => map.set(key, (map.get(key) ?? 0) + 1);
    const passes = (p: IndexPerson, ignore: FilterDimension) => matchesFilters(p, filters, ignore);
    for (const p of pool) {
      if (passes(p, 'conflicts')) bump(counts.conflicts, p.conflict);
      if (p.branch && passes(p, 'branches')) bump(counts.branches, p.branch);
      if (passes(p, 'awards')) p.awards.forEach(a => bump(counts.awards, a));
    }
    return counts;
  }

  /** Conflicts, awards, branches, unit groupings and class years matching the query. */
  searchFacets(text: string, limits: Partial<typeof GROUP_LIMITS> = GROUP_LIMITS): FacetResults {
    const query = parseQuery(text);
    const cap = { ...GROUP_LIMITS, ...limits };
    const results: FacetResults = { conflicts: [], awards: [], branches: [], units: [], classYears: [] };
    const hits = runQuery(this.facetIndex, query, {}) ?? new Map();

    const matched = [...hits].map(([id, hit]) => ({ id: id as string, ...hit, terms: [...hit.terms], fields: [...hit.fields] }));
    matched.sort((a, b) => b.score - a.score);
    for (const hit of matched) {
      const [kind, key] = [hit.id.slice(0, hit.id.indexOf(':')), hit.id.slice(hit.id.indexOf(':') + 1)];
      const match = { score: hit.score, terms: hit.terms, fields: hit.fields };
      if (kind === 'conflict') results.conflicts.push({ item: this.conflictById.get(Number(key))!, ...match });
      if (kind === 'award') results.awards.push({ item: this.awardById.get(Number(key))!, ...match });
      if (kind === 'branch') results.branches.push({ item: this.branchByCode.get(key)!, ...match });
      if (kind === 'unit') {
        const unit = this.unitByKey.get(key)!;
        // Prefer the tightest grouping that covers the query ("1st Battalion, 7th
        // Marines" over the same plus its division).
        const coverage = Math.min(1, query.words.length / key.split(' ').length);
        const phrase = containsPhrase(` ${key} `, query.canonical) ? PHRASE_BONUS : 1;
        results.units.push({ item: unit, ...match, score: match.score * Math.sqrt(coverage) * phrase });
      }
    }

    if (query.year !== null) {
      const year = query.year;
      for (const c of this.data.conflicts) {
        const end = c.end_year ?? new Date().getFullYear();
        if (c.start_year <= year && year <= end && !results.conflicts.some(h => h.item.id === c.id)) {
          results.conflicts.push({ item: c, score: 0, terms: [], fields: [] });
        }
      }
    }

    results.units = dedupeUnits(results.units.sort((a, b) => b.score - a.score || a.item.label.length - b.item.label.length));
    // Unit groupings are numerous; keep only those close to the best one.
    const bestUnit = results.units[0]?.score ?? 0;
    results.units = results.units.filter(h => h.score >= bestUnit * UNIT_RELATIVE_CUTOFF);

    if (query.classYear) {
      const { year, letter } = query.classYear;
      const count = this.people.filter(
        p => p.class_year === year && (!letter || p.class_letter.toUpperCase() === letter),
      ).length;
      if (count) results.classYears.push({ year, letter, label: `${year}${letter}`, count });
    }

    results.conflicts = results.conflicts.slice(0, cap.conflicts);
    results.awards = results.awards.slice(0, cap.awards);
    results.branches = results.branches.slice(0, cap.branches);
    results.units = results.units.slice(0, cap.units);
    results.classYears = results.classYears.slice(0, cap.classYears);
    return results;
  }

  private matchPeople(query: ParsedQuery, scopes: Scope[] = ALL_SCOPES): Map<string | number, Match> | null {
    const fields = scopes.length && scopes.length < ALL_SCOPES.length ? scopes.flatMap(s => SCOPE_FIELDS[s]) : undefined;
    const hits = runQuery(this.peopleIndex, query, { fields });
    if (hits === null) return null;
    const out = new Map<string | number, Match>();
    for (const [id, hit] of hits) {
      const phrase = this.phraseText.get(id as number)!.some(text => containsPhrase(text, query.canonical));
      out.set(id, { score: phrase ? hit.score * PHRASE_BONUS : hit.score, terms: [...hit.terms], fields: [...hit.fields] });
    }
    return out;
  }
}

/** Drop a unit grouping when a shorter one already listed covers exactly the same people. */
function dedupeUnits(hits: FacetHit<UnitFacet>[]): FacetHit<UnitFacet>[] {
  const kept: FacetHit<UnitFacet>[] = [];
  const sameMembers = (a: UnitFacet, b: UnitFacet) =>
    a.personIds.length === b.personIds.length && a.personIds.every(id => b.personIds.includes(id));
  for (const hit of hits) {
    const covered = kept.some(k => sameMembers(k.item, hit.item) && (hit.item.key.includes(k.item.key) || k.item.key.includes(hit.item.key)));
    if (!covered) kept.push(hit);
  }
  return kept;
}

export function createSearchEngine(data: SearchIndexData): SearchEngine {
  return new SearchEngine(data);
}
