'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SearchEngine } from '@/lib/search/engine';
import { loadSearchEngine, prefetchSearchEngine } from '@/lib/search/loader';

/**
 * The shared search engine. Prefetched when the browser is idle; loaded right
 * away once `needed` (the bar is focused, or a page depends on it).
 */
export function useSearchEngine(needed: boolean) {
  const [engine, setEngine] = useState<SearchEngine | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => prefetchSearchEngine(), []);

  useEffect(() => {
    if (!needed || engine) return;
    let cancelled = false;
    setFailed(false);
    loadSearchEngine().then(
      e => !cancelled && setEngine(e),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [needed, engine, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { engine, failed, retry };
}
