// Class year display: the apostrophe short form ('42) is reserved for the 1900s;
// any other century is shown in full (1842) to avoid ambiguity.
export function formatClassYear(year?: number | null, letter?: string | null): string {
  if (!year) return '';
  const suffix = letter || '';
  if (year >= 1900 && year <= 1999) {
    return `'${String(year % 100).padStart(2, '0')}${suffix}`;
  }
  return `${year}${suffix}`;
}
