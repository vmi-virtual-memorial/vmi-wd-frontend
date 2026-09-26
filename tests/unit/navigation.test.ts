import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  installNavigationTracker,
  isHistoryNavigation,
  loadSession,
  readPositiveInt,
  readSearchParam,
  replaceSearchParams,
  saveSession,
  useScrollRestoration,
} from '@/lib/navigation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  window.history.replaceState(null, '', '/memorial/conflict/1');
  sessionStorage.clear();
});

describe('URL state', () => {
  it('reads params and positive ints', () => {
    window.history.replaceState(null, '', '/x?page=3&per=abc&neg=-2&sort=class_year');
    expect(readSearchParam('sort')).toBe('class_year');
    expect(readSearchParam('missing')).toBeNull();
    expect(readPositiveInt('page')).toBe(3);
    expect(readPositiveInt('per')).toBeNull();
    expect(readPositiveInt('neg')).toBeNull();
    expect(readPositiveInt('missing')).toBeNull();
  });

  it('replaces params without adding history entries', () => {
    const before = window.history.length;
    replaceSearchParams({ page: 2, per: null });
    expect(window.location.search).toBe('?page=2');
    replaceSearchParams({ page: 4, per: 50 });
    expect(window.location.search).toBe('?page=4&per=50');
    replaceSearchParams({ page: null, per: '' });
    expect(window.location.search).toBe('');
    expect(window.location.pathname).toBe('/memorial/conflict/1');
    expect(window.history.length).toBe(before);
  });

  it('preserves history state and skips no-op writes', () => {
    window.history.replaceState({ tree: 1 }, '', '/x?a=1');
    const spy = vi.spyOn(window.history, 'replaceState');
    replaceSearchParams({ a: 1 });
    expect(spy).not.toHaveBeenCalled();
    replaceSearchParams({ a: 2 });
    expect(spy).toHaveBeenCalledWith({ tree: 1 }, '', '/x?a=2');
    spy.mockRestore();
  });
});

describe('session storage', () => {
  it('round-trips JSON', () => {
    saveSession('k', [1, 2]);
    expect(loadSession<number[]>('k')).toEqual([1, 2]);
    expect(loadSession('absent')).toBeNull();
  });

  it('tolerates corrupt data and storage failures', () => {
    sessionStorage.setItem('bad', '{');
    expect(loadSession('bad')).toBeNull();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveSession('k', 1)).not.toThrow();
    spy.mockRestore();
  });
});

describe('navigation tracker', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installNavigationTracker();
  });
  afterEach(() => uninstall());

  it('installs once', () => {
    const second = installNavigationTracker();
    second();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isHistoryNavigation()).toBe(true);
  });

  it('flags popstate as history navigation and link clicks as fresh', () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(isHistoryNavigation()).toBe(true);

    const a = document.createElement('a');
    a.href = '/memorial';
    const inner = document.createElement('span');
    a.appendChild(inner);
    document.body.appendChild(a);
    inner.addEventListener('click', e => e.preventDefault());
    inner.click();
    expect(isHistoryNavigation()).toBe(false);

    window.dispatchEvent(new PopStateEvent('popstate'));
    document.body.click();
    expect(isHistoryNavigation()).toBe(true);
    a.remove();
  });
});

describe('useScrollRestoration', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let uninstall: () => void;

  function Page({ ready }: { ready: boolean }) {
    useScrollRestoration(ready);
    return null;
  }

  beforeEach(() => {
    uninstall = installNavigationTracker();
    container = document.createElement('div');
    root = createRoot(container);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    uninstall();
    vi.restoreAllMocks();
  });

  function render(ready: boolean) {
    act(() => root.render(createElement(Page, { ready })));
  }

  it('restores saved scroll only after ready on history navigation', () => {
    saveSession('scroll:/memorial/conflict/1', 1234);
    window.dispatchEvent(new PopStateEvent('popstate'));
    render(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
    render(true);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 1234);
  });

  it('does not restore on fresh navigation', () => {
    saveSession('scroll:/memorial/conflict/1', 1234);
    const link = document.body.appendChild(Object.assign(document.createElement('a'), { href: '/' }));
    link.addEventListener('click', e => e.preventDefault());
    link.click();
    link.remove();
    render(true);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('saves scroll for the current path and ignores scrolls after the URL changes', () => {
    render(true);
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(loadSession('scroll:/memorial/conflict/1')).toBe(500);

    window.history.pushState(null, '', '/memorial/person/9');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(loadSession('scroll:/memorial/conflict/1')).toBe(500);
    expect(loadSession('scroll:/memorial/person/9')).toBeNull();
  });
});
