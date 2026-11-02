// Performance budget at production scale (~600 people; the memorial grows slowly).
// Generous thresholds so CI noise never flakes, while still catching regressions
// of an order of magnitude.
import { describe, expect, it } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine } from '@/lib/search/engine';
import type { SearchIndexData } from '@/lib/search/types';

function scaled(copies: number): SearchIndexData {
  const people = [];
  for (let c = 0; c < copies; c++) {
    for (const p of data.people) people.push({ ...p, id: p.id + c * 100_000, last_name: `${p.last_name}${c}` });
  }
  return { ...data, people };
}

const QUERIES = ['silver star', 'marines', '1st battalion 7th marines', 'normandy', 'jakson', 'ww2', "'66", 'killed', 'c'];

describe('performance', () => {
  const big = scaled(15); // 600 people
  let engine: ReturnType<typeof createSearchEngine>;

  it('builds the index quickly', () => {
    const start = performance.now();
    engine = createSearchEngine(big);
    expect(engine.people).toHaveLength(600);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('answers each keystroke well within a frame', () => {
    // Simulate typing each query character by character.
    const keystrokes = QUERIES.flatMap(q => [...q].map((_, i) => q.slice(0, i + 1)));
    const start = performance.now();
    for (const q of keystrokes) {
      engine.searchFacets(q);
      engine.searchPeople(q);
    }
    const perKeystroke = (performance.now() - start) / keystrokes.length;
    expect(perKeystroke).toBeLessThan(16);
  });
});
