import { describe, expect, it } from 'vitest';
import { hasMatch, highlight, snippet } from '@/lib/search/highlight';

const marked = (text: string, terms: string[]) =>
  highlight(text, terms).filter(s => s.match).map(s => s.text);

describe('highlight', () => {
  it('marks words whose terms matched, keeping original text', () => {
    expect(highlight('Silver Star', ['silver', 'star'])).toEqual([
      { text: 'Silver', match: true },
      { text: ' ', match: false },
      { text: 'Star', match: true },
    ]);
    expect(marked('the Médaille Militaire', ['medaille'])).toEqual(['Médaille']);
  });

  it('matches through ordinal and abbreviation variants', () => {
    expect(marked('First North Carolina', ['1st'])).toEqual(['First']);
    expect(marked('1st Bn, 7th Marines', ['battalion', '7th'])).toEqual(['Bn', '7th']);
  });

  it('keeps surrounding punctuation unmarked', () => {
    const segments = highlight("Jackson's Battery.", ['jackson']);
    expect(segments.map(s => s.text).join('')).toBe("Jackson's Battery.");
    expect(segments[0]).toEqual({ text: 'Jackson', match: true });
  });

  it('handles empty input and no terms', () => {
    expect(highlight('', ['x'])).toEqual([]);
    expect(highlight('abc', [])).toEqual([{ text: 'abc', match: false }]);
    expect(hasMatch('abc', ['abc'])).toBe(true);
    expect(hasMatch('abc', ['x'])).toBe(false);
  });
});

describe('snippet', () => {
  const long =
    'He enlisted early and trained in Texas before shipping overseas with his unit in the spring. ' +
    'After months in reserve the division moved forward, and on the morning of the attack near Bastogne ' +
    'he led his squad across open ground under heavy fire before he was struck and killed instantly.';

  it('returns short text whole', () => {
    expect(snippet('Killed at Bastogne.', ['bastogne'])).toBe('Killed at Bastogne.');
  });

  it('centers on the first match with ellipses on word boundaries', () => {
    const s = snippet(long, ['bastogne'], 80)!;
    expect(s).toContain('Bastogne');
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s.length).toBeLessThanOrEqual(84);
    const inner = s.slice(1, -1);
    expect(long).toContain(inner);
    expect(long[long.indexOf(inner) - 1]).toBe(' ');
  });

  it('omits the leading ellipsis when the match is near the start', () => {
    const s = snippet(long, ['enlisted'], 60)!;
    expect(s.startsWith('He enlisted')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
  });

  it('omits the trailing ellipsis when the match is near the end', () => {
    const s = snippet(long, ['instantly'], 60)!;
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('instantly.')).toBe(true);
  });

  it('returns null without a match', () => {
    expect(snippet(long, ['normandy'])).toBeNull();
  });
});
