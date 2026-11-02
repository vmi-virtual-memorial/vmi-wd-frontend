// Recently viewed people, shown when the search bar is focused with no query.

const KEY = 'search:recent';
export const MAX_RECENT = 6;

export function getRecentPeople(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((n): n is number => Number.isInteger(n) && n > 0).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordRecentPerson(id: number): void {
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    const next = [id, ...getRecentPeople().filter(x => x !== id)].slice(0, MAX_RECENT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: recents are best-effort
  }
}

export function clearRecentPeople(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
