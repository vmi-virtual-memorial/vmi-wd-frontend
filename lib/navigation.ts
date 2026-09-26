import { useEffect, useRef, useState } from 'react';

// Navigation memory: lets pages restore their view state (pagination, filters,
// scroll position) when the user returns with the browser back/forward buttons.
//
// Pages render client-side after fetching, so the browser's native scroll
// restoration fires while the page is still "Loading..." and gets lost. Pages
// instead save their scroll position and restore it once their data renders.

let historyNavigation =
  typeof window !== 'undefined' &&
  (performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ===
    'back_forward';

let trackerInstalled = false;

// Installed once from the root layout. A popstate marks the next page mount as a
// history navigation; a link click marks it as a fresh navigation.
export function installNavigationTracker(): () => void {
  if (trackerInstalled) return () => {};
  trackerInstalled = true;
  const onPop = () => {
    historyNavigation = true;
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest?.('a[href]')) historyNavigation = false;
  };
  window.addEventListener('popstate', onPop);
  document.addEventListener('click', onClick, true);
  return () => {
    trackerInstalled = false;
    window.removeEventListener('popstate', onPop);
    document.removeEventListener('click', onClick, true);
  };
}

export function isHistoryNavigation(): boolean {
  return historyNavigation;
}

// Captured once per mount: true when this page was reached via back/forward.
export function useIsHistoryNavigation(): boolean {
  const [value] = useState(isHistoryNavigation);
  return value;
}

export function readSearchParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function readPositiveInt(name: string): number | null {
  const n = Number(readSearchParam(name));
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Replace (not push) the current entry's query so back returns to the same view.
// Params with empty/default values are dropped to keep URLs clean.
export function replaceSearchParams(params: Record<string, string | number | null | undefined>): void {
  if (typeof window === 'undefined') return;
  const search = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') search.delete(key);
    else search.set(key, String(value));
  }
  const query = search.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', url);
  }
}

export function loadSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function saveSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode, quota): memory is best-effort
  }
}

const scrollKey = (path: string) => `scroll:${path}`;

// Tracks window scroll for this path once `ready` (content rendered), and on
// back/forward restores the last saved position.
export function useScrollRestoration(ready: boolean): void {
  const isHistory = useIsHistoryNavigation();
  const restored = useRef(false);

  useEffect(() => {
    if (!ready) return;
    const path = window.location.pathname;
    const key = scrollKey(path);

    if (!restored.current) {
      restored.current = true;
      const saved = isHistory ? loadSession<number>(key) : null;
      if (saved !== null) window.scrollTo(0, saved);
    }

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Ignore scrolls after the URL has moved on (e.g. the next page scrolling to top).
        if (window.location.pathname === path) saveSession(key, window.scrollY);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ready, isHistory]);
}
