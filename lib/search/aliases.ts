// Extra words visitors type for conflicts and awards. Matched against names so
// they survive renames and new records; branch aliases come from the backend.
import { fold } from './normalize';

// Avoid ordinal words ("second world war"): they index as 1st/2nd and pollute unit queries.
const CONFLICT_ALIASES: [RegExp, string[]][] = [
  [/world war ii\b/, ['ww2', 'wwii', 'world war 2', 'world war two']],
  [/world war i\b/, ['ww1', 'wwi', 'world war 1', 'world war one', 'great war']],
  // No place names (Iraq, Afghanistan): every GWOT casualty would match both. CoD covers places.
  [/global war on terror/, ['gwot', 'war on terror']],
  [/gulf war|desert storm/, ['gulf war', 'persian gulf', 'desert storm', 'desert shield']],
  [/vietnam/, ['nam', 'southeast asia']],
  [/korea/, ['korea']],
  [/civil war/, ['war between the states']],
  [/mexican/, ['mexican war']],
  [/spanish.american|phil+ip+ine/, ['spanish american war', 'philippine', 'philippines', 'philippine insurrection']],
  [/new market/, ['new market cadets', 'field of lost shoes']],
  [/ms cadets/, ['mississippi cadets']],
];

const AWARD_ALIASES: [RegExp, string[]][] = [
  [/medal of honor/, ['moh', 'cmh', 'congressional medal of honor']],
  [/distinguished service cross/, ['dsc']],
  [/navy cross/, ['navy cross']],
  [/air force cross/, ['afc']],
  [/silver star/, ['silver star medal']],
  [/croix de guerre/, ['french croix de guerre', 'war cross']],
  [/medaille militaire/, ['military medal']],
  [/victoria cross/, ['vc']],
  [/distinguished service order/, ['dso']],
];

function aliasesFor(name: string, rules: [RegExp, string[]][]): string[] {
  const folded = fold(name);
  return rules.filter(([pattern]) => pattern.test(folded)).flatMap(([, aliases]) => aliases);
}

export const conflictAliases = (name: string) => aliasesFor(name, CONFLICT_ALIASES);
export const awardAliases = (name: string) => aliasesFor(name, AWARD_ALIASES);
