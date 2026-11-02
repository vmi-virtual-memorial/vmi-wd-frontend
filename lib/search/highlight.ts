// Mark the words of a display string that produced a match, and cut
// match-centered snippets out of long narratives.
import { termVariants, tokenizeWithOffsets } from './normalize';

export interface Segment {
  text: string;
  match: boolean;
}

/** Split text into segments; words whose index terms are in `terms` are marked. */
export function highlight(text: string, terms: Iterable<string>): Segment[] {
  const termSet = new Set(terms);
  if (!text) return [];
  if (termSet.size === 0) return [{ text, match: false }];
  const segments: Segment[] = [];
  let cursor = 0;
  for (const token of tokenizeWithOffsets(text)) {
    if (!termVariants(token.word).some(t => termSet.has(t))) continue;
    if (token.start > cursor) segments.push({ text: text.slice(cursor, token.start), match: false });
    segments.push({ text: text.slice(token.start, token.end), match: true });
    cursor = token.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

export function hasMatch(text: string, terms: Iterable<string>): boolean {
  return highlight(text, terms).some(s => s.match);
}

/**
 * About `width` characters of `text` around the first matched word, cut on word
 * boundaries with ellipses. Null when nothing in the text matched.
 */
export function snippet(text: string, terms: Iterable<string>, width = 140): string | null {
  const termSet = new Set(terms);
  const first = tokenizeWithOffsets(text).find(t => termVariants(t.word).some(v => termSet.has(v)));
  if (!first) return null;
  if (text.length <= width) return text;

  let start = Math.max(0, first.start - Math.floor(width / 3));
  let end = Math.min(text.length, start + width);
  start = Math.max(0, end - width);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space >= 0 && space < first.start ? space + 1 : start;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    end = space > first.end ? space : end;
  }
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}
