import { describe, expect, it } from 'vitest';
import { expandClassYears, parseClassYear } from '@/lib/search/classYear';

describe('parseClassYear', () => {
  it('reads apostrophe years as the 1900s', () => {
    expect(parseClassYear("'66")).toEqual({ year: 1966, letter: '' });
    // Typographic apostrophe (U+2019, what phones autocorrect to) works too...
    expect(parseClassYear('\u201956m')).toEqual({ year: 1956, letter: 'M' });
    // ...but an opening quote (U+2018) is not an apostrophe.
    expect(parseClassYear('\u201866')).toBeNull();
  });

  it('reads four-digit years with letters', () => {
    expect(parseClassYear('1862M')).toEqual({ year: 1862, letter: 'M' });
    expect(parseClassYear(' 1956ms ')).toEqual({ year: 1956, letter: 'MS' });
    expect(parseClassYear('2004')).toEqual({ year: 2004, letter: '' });
  });

  it('rejects other text and impossible years', () => {
    expect(parseClassYear('66')).toBeNull();
    expect(parseClassYear('1700')).toBeNull();
    expect(parseClassYear('2999')).toBeNull();
    expect(parseClassYear("'66 smith")).toBeNull();
    expect(parseClassYear('1966msx')).toBeNull();
  });
});

describe('expandClassYears', () => {
  it('rewrites apostrophe years anywhere in the query', () => {
    expect(expandClassYears("smith '66")).toBe('smith 1966');
    expect(expandClassYears("'56M jones")).toBe('1956M jones');
    expect(expandClassYears("o'neil")).toBe("o'neil");
  });
});
