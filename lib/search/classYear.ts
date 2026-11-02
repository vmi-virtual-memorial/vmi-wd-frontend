// Class years typed into search: "'66", "'56M", "1966", "1862M".
// The apostrophe form only ever means the 1900s (see lib/classYear.ts).

export interface ClassYearQuery {
  year: number;
  letter: string;
}

const FIRST_CLASS = 1839;

export function parseClassYear(text: string): ClassYearQuery | null {
  const match = /^(?:['’](\d{2})|(\d{4}))([a-z]{0,2})$/i.exec(text.trim());
  if (!match) return null;
  const year = match[1] !== undefined ? 1900 + Number(match[1]) : Number(match[2]);
  if (year < FIRST_CLASS || year > new Date().getFullYear() + 10) return null;
  return { year, letter: match[3].toUpperCase() };
}

/** Rewrite apostrophe years to four digits so they tokenize as one term: "'66m" -> "1966m". */
export function expandClassYears(query: string): string {
  return query.replace(/(^|\s)['’](\d{2})([a-z]{0,2})(?=\s|$)/gi, (_, lead: string, yy: string, letter: string) =>
    `${lead}19${yy}${letter}`,
  );
}
