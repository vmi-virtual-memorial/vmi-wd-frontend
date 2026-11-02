import { Fragment, useMemo } from 'react';
import { highlight } from '@/lib/search/highlight';

/** Text with the words that matched the search marked. */
export default function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const segments = useMemo(() => highlight(text, terms), [text, terms]);
  return (
    <>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-vmi-light-gold text-inherit rounded-sm px-px">
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  );
}
