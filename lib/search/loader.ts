// Loads the search index once per page session and builds the engine. The
// engine module (and MiniSearch with it) is code-split and only fetched when
// search is first used or the browser is idle.
import { getSearchIndex } from '../api';
import type { SearchEngine } from './engine';

let pending: Promise<SearchEngine> | null = null;

export function loadSearchEngine(): Promise<SearchEngine> {
  if (!pending) {
    pending = Promise.all([getSearchIndex(), import('./engine')])
      .then(([data, { createSearchEngine }]) => createSearchEngine(data))
      .catch(error => {
        pending = null; // allow a retry on next use
        throw error;
      });
  }
  return pending;
}

/** Warm the engine when the browser is idle; errors surface on real use. */
export function prefetchSearchEngine(): void {
  if (typeof window === 'undefined' || pending) return;
  const start = () => void loadSearchEngine().catch(() => {});
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 });
  else setTimeout(start, 1500);
}

/** Test hook. */
export function resetSearchEngine(): void {
  pending = null;
}
