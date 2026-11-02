import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECENT, clearRecentPeople, getRecentPeople, recordRecentPerson } from '@/lib/search/recent';

afterEach(() => {
  clearRecentPeople();
  vi.restoreAllMocks();
});

describe('recent people', () => {
  it('records most-recent first without duplicates', () => {
    recordRecentPerson(1);
    recordRecentPerson(2);
    recordRecentPerson(1);
    expect(getRecentPeople()).toEqual([1, 2]);
  });

  it('caps the list', () => {
    for (let i = 1; i <= MAX_RECENT + 3; i++) recordRecentPerson(i);
    expect(getRecentPeople()).toHaveLength(MAX_RECENT);
    expect(getRecentPeople()[0]).toBe(MAX_RECENT + 3);
  });

  it('ignores invalid ids and corrupt storage', () => {
    recordRecentPerson(0);
    recordRecentPerson(-1);
    recordRecentPerson(1.5);
    expect(getRecentPeople()).toEqual([]);
    localStorage.setItem('search:recent', '{not json');
    expect(getRecentPeople()).toEqual([]);
    localStorage.setItem('search:recent', JSON.stringify({ a: 1 }));
    expect(getRecentPeople()).toEqual([]);
    localStorage.setItem('search:recent', JSON.stringify([3, 'x', -2, 4]));
    expect(getRecentPeople()).toEqual([3, 4]);
  });

  it('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => recordRecentPerson(5)).not.toThrow();
    expect(() => clearRecentPeople()).not.toThrow();
  });
});
