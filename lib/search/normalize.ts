// Text normalization shared by indexing, querying and highlighting, so a word in
// the data and the same word typed by a visitor always reduce to the same terms.

const DIACRITICS = /[̀-ͯ]/g;

/** Lowercase and strip accents: "Médaille" -> "medaille". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}

const UNIT_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
const TEEN_ORDINALS = [
  'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth',
  'eighteenth', 'nineteenth',
];
const TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const TENS_ORDINALS = ['twentieth', 'thirtieth', 'fortieth', 'fiftieth', 'sixtieth', 'seventieth', 'eightieth', 'ninetieth'];

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

const ORDINAL_WORDS: Record<string, string> = {};
UNIT_ORDINALS.forEach((w, i) => (ORDINAL_WORDS[w] = ordinalSuffix(i + 1)));
TEEN_ORDINALS.forEach((w, i) => (ORDINAL_WORDS[w] = ordinalSuffix(i + 10)));
TENS_ORDINALS.forEach((w, i) => (ORDINAL_WORDS[w] = ordinalSuffix((i + 2) * 10)));

const COMPOUND_ORDINAL = new RegExp(`\\b(${TENS.join('|')})[\\s-]+(${UNIT_ORDINALS.join('|')})\\b`, 'g');

// Military abbreviations as they appear in unit/rank text, mapped to the full word.
export const ABBREVIATIONS: Record<string, string> = {
  bn: 'battalion', btn: 'battalion', bns: 'battalion',
  regt: 'regiment', rgt: 'regiment',
  div: 'division',
  sqdn: 'squadron', sqn: 'squadron',
  co: 'company', coy: 'company',
  bty: 'battery', btry: 'battery',
  inf: 'infantry',
  cav: 'cavalry',
  arty: 'artillery',
  hq: 'headquarters', hqs: 'headquarters',
  bde: 'brigade', brig: 'brigade',
  grp: 'group', gp: 'group',
  abn: 'airborne',
  lt: 'lieutenant', lieut: 'lieutenant',
  capt: 'captain', cpt: 'captain',
  sgt: 'sergeant',
  cpl: 'corporal',
  pvt: 'private',
  col: 'colonel',
  maj: 'major',
  gen: 'general',
  adm: 'admiral',
  cmdr: 'commander', cdr: 'commander',
};

// Only words that carry no meaning in this corpus; domain words ("killed",
// "action") are kept and simply score low through IDF.
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'in', 'on', 'at', 'by', 'for', 'to', 'with', 'from', 'as', 'was', 'were',
  'is', 'his', 'her', 'he', 'she', 'it', 'its', 'that', 'this', 'which', 'who', 'had', 'has', 'be', 'been',
]);

const WORD = /[\p{L}\p{M}\p{N}]+/gu; // \p{M}: combining accents in decomposed text

export interface Token {
  /** Folded word as it appears (accents stripped, lowercase). */
  word: string;
  /** Offset of the word in the original string. */
  start: number;
  end: number;
}

/**
 * Split text into folded words with offsets into the original string. Folding
 * is done per character run so offsets stay valid for highlighting even when
 * NFD decomposition changes string length.
 */
export function tokenizeWithOffsets(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(WORD)) {
    const raw = match[0];
    tokens.push({ word: fold(raw), start: match.index!, end: match.index! + raw.length });
  }
  return tokens;
}

/** Tokenizer used for indexing and querying: folded words, compound ordinals collapsed. */
export function tokenize(text: string): string[] {
  const folded = fold(text).replace(COMPOUND_ORDINAL, (_, tens: string, unit: string) => {
    // Replace the pair outright: keeping "fourth" would also index a spurious "4th".
    return ordinalSuffix((TENS.indexOf(tens) + 2) * 10 + UNIT_ORDINALS.indexOf(unit) + 1);
  });
  return folded.match(WORD) ?? [];
}

/**
 * Every index term a single (already folded) word stands for: itself, plus its
 * canonical form for ordinal words ("first" -> "1st") and abbreviations
 * ("bn" -> "battalion").
 */
export function termVariants(word: string): string[] {
  const canonical = ORDINAL_WORDS[word] ?? ABBREVIATIONS[word];
  return canonical ? [word, canonical] : [word];
}

/** MiniSearch processTerm: stopwords dropped from prose fields only. */
export function processTerm(term: string, fieldName?: string): string[] | null {
  const word = fold(term);
  if (fieldName === 'cod' && STOPWORDS.has(word)) return null;
  return termVariants(word);
}

/** Canonical single form of a word, used for phrase comparison. */
export function canonical(word: string): string {
  const variants = termVariants(word);
  return variants[variants.length - 1];
}
