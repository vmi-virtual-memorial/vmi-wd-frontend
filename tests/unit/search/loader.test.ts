import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import data from '../../fixtures/search-index.json';
import { loadSearchEngine, prefetchSearchEngine, resetSearchEngine } from '@/lib/search/loader';

const ok = () => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => resetSearchEngine());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('loadSearchEngine', () => {
  it('fetches the index once and reuses the engine', async () => {
    const fetch = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(async () => ok());
    vi.stubGlobal('fetch', fetch);
    const [a, b] = await Promise.all([loadSearchEngine(), loadSearchEngine()]);
    expect(a).toBe(b);
    expect(await loadSearchEngine()).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toMatch(/\/memorial\/search-index\/$/);
    expect(a.people).toHaveLength(40);
  });

  it('allows a retry after a failure', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetch);
    await expect(loadSearchEngine()).rejects.toThrow('Failed to fetch search index');
    fetch.mockImplementation(async () => ok());
    await expect(loadSearchEngine()).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('prefetchSearchEngine', () => {
  it('loads on idle and swallows errors', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetch);
    let idle: (() => void) | undefined;
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idle = cb;
      return 1;
    });
    prefetchSearchEngine();
    expect(fetch).not.toHaveBeenCalled();
    idle!();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('falls back to a timer without requestIdleCallback, and is a no-op once loading', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ok());
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('requestIdleCallback', undefined);
    // jsdom's window may not have it; make sure the "in" check fails
    delete (window as unknown as Record<string, unknown>).requestIdleCallback;
    prefetchSearchEngine();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(1);
    prefetchSearchEngine();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
