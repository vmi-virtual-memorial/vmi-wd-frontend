import { describe, expect, it } from 'vitest';
import { formatClassYear } from '@/lib/classYear';

describe('formatClassYear', () => {
  it('abbreviates 1900s years', () => {
    expect(formatClassYear(1942)).toBe("'42");
    expect(formatClassYear(1900)).toBe("'00");
    expect(formatClassYear(1905)).toBe("'05");
    expect(formatClassYear(1999)).toBe("'99");
  });

  it('shows other centuries in full', () => {
    expect(formatClassYear(1842)).toBe('1842');
    expect(formatClassYear(1899)).toBe('1899');
    expect(formatClassYear(2000)).toBe('2000');
    expect(formatClassYear(2005)).toBe('2005');
  });

  it('appends one- or two-letter suffixes', () => {
    expect(formatClassYear(1956, 'M')).toBe("'56M");
    expect(formatClassYear(1956, 'MS')).toBe("'56MS");
    expect(formatClassYear(1862, 'MS')).toBe('1862MS');
  });

  it('returns empty for missing years', () => {
    expect(formatClassYear(undefined)).toBe('');
    expect(formatClassYear(null, 'M')).toBe('');
  });
});
