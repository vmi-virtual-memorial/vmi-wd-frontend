import { describe, expect, it } from 'vitest';
import { canonical, fold, processTerm, termVariants, tokenize, tokenizeWithOffsets } from '@/lib/search/normalize';

describe('fold', () => {
  it('lowercases and strips accents', () => {
    expect(fold('Médaille Militaire')).toBe('medaille militaire');
    expect(fold('Hué')).toBe('hue');
    expect(fold('ÀÉÎÕÜ')).toBe('aeiou');
  });
});

describe('tokenize', () => {
  it('splits on punctuation and folds', () => {
    expect(tokenize("Company \"L,\" 58th Infantry, A.E.F.")).toEqual(['company', 'l', '58th', 'infantry', 'a', 'e', 'f']);
    expect(tokenize("Jackson's Battery")).toEqual(['jackson', 's', 'battery']);
    expect(tokenize('')).toEqual([]);
  });

  it('collapses compound ordinal words into one number', () => {
    expect(tokenize('Twenty-fourth Battalion')).toEqual(['24th', 'battalion']);
    expect(tokenize('thirty first')).toEqual(['31st']);
    expect(tokenize('Twenty-second Regiment')).toEqual(['22nd', 'regiment']);
    expect(tokenize('ninety third')).toEqual(['93rd']);
  });
});

describe('tokenizeWithOffsets', () => {
  it('keeps offsets into the original text, even with accents', () => {
    const text = 'la Médaille, Hué';
    const tokens = tokenizeWithOffsets(text);
    expect(tokens.map(t => t.word)).toEqual(['la', 'medaille', 'hue']);
    expect(tokens.map(t => text.slice(t.start, t.end))).toEqual(['la', 'Médaille', 'Hué']);
  });

  it('handles decomposed input', () => {
    const text = 'Médaille';
    const [token] = tokenizeWithOffsets(text);
    expect(token.word).toBe('medaille');
    expect(text.slice(token.start, token.end)).toBe(text);
  });
});

describe('termVariants / canonical', () => {
  it('maps ordinal words to numerals', () => {
    expect(termVariants('first')).toEqual(['first', '1st']);
    expect(termVariants('second')).toEqual(['second', '2nd']);
    expect(termVariants('third')).toEqual(['third', '3rd']);
    expect(termVariants('eleventh')).toEqual(['eleventh', '11th']);
    expect(termVariants('twelfth')).toEqual(['twelfth', '12th']);
    expect(termVariants('twentieth')).toEqual(['twentieth', '20th']);
    expect(canonical('first')).toBe('1st');
  });

  it('expands military abbreviations', () => {
    expect(termVariants('bn')).toEqual(['bn', 'battalion']);
    expect(termVariants('regt')).toEqual(['regt', 'regiment']);
    expect(termVariants('sqdn')).toEqual(['sqdn', 'squadron']);
    expect(canonical('co')).toBe('company');
  });

  it('leaves other words alone', () => {
    expect(termVariants('marines')).toEqual(['marines']);
    expect(canonical('1st')).toBe('1st');
  });
});

describe('processTerm', () => {
  it('drops stopwords only from the circumstances field', () => {
    expect(processTerm('the', 'cod')).toBeNull();
    expect(processTerm('The', 'name')).toEqual(['the']);
    expect(processTerm('Killed', 'cod')).toEqual(['killed']);
  });

  it('folds and expands', () => {
    expect(processTerm('First', 'unit')).toEqual(['first', '1st']);
    expect(processTerm('Médaille')).toEqual(['medaille']);
  });
});
