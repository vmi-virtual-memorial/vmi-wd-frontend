import Image from 'next/image';
import AwardIcon from '@/components/AwardIcon';
import DocumentIcon from '@/components/DocumentIcon';
import { awardImagePath } from '@/lib/awardImage';
import { formatClassYear } from '@/lib/classYear';
import { type SearchEngine, personName } from '@/lib/search/engine';
import { snippet } from '@/lib/search/highlight';
import { type Row, alumni } from '@/lib/search/rows';
import Highlight from './Highlight';

const years = (start: number, end: number | null) => (start === end ? `${start}` : `${start}–${end ?? 'present'}`);

const Count = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm text-gray-500 whitespace-nowrap">{children}</span>
);

/** The visible content of one dropdown row. Only person rows need the engine (for names of related records). */
export default function RowContent({ row, engine }: { row: Row; engine: SearchEngine | null }) {
  switch (row.kind) {
    case 'conflict':
      return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold text-gray-900">
            <Highlight text={row.item.name} terms={row.terms} />
          </span>
          <Count>
            {years(row.item.start_year, row.item.end_year)} · {alumni(row.item.casualty_count)}
          </Count>
        </div>
      );

    case 'award':
      return (
        <div className="flex items-center gap-3">
          <span className="relative w-7 h-9 flex-shrink-0">
            <Image src={awardImagePath(row.item.image_filename)} alt="" fill sizes="28px" className="object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-gray-900">
              <Highlight text={row.item.name} terms={row.terms} />
            </span>
            <span className="block text-sm text-vmi-red">
              {row.item.recipient_count
                ? `${alumni(row.item.recipient_count)} ${row.item.recipient_count === 1 ? 'has' : 'have'} been awarded →`
                : 'No alumni recipients recorded yet →'}
            </span>
          </span>
        </div>
      );

    case 'branch':
    case 'unit':
    case 'classYear': {
      const label = row.kind === 'branch' ? row.item.name : row.kind === 'unit' ? row.item.label : `Class of ${row.item.label}`;
      const count = row.kind === 'branch' ? row.item.count : row.kind === 'unit' ? row.item.personIds.length : row.item.count;
      return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold text-gray-900 min-w-0">
            <Highlight text={label} terms={row.terms} />
          </span>
          <Count>{alumni(count)} →</Count>
        </div>
      );
    }

    case 'person': {
      const { person: p, terms, fields } = row.item;
      const conflict = engine?.conflictById.get(p.conflict);
      const branch = engine?.branchByCode.get(p.branch);
      const details = [p.rank || branch?.name, conflict?.name, p.death_date_display && `d. ${p.death_date_display}`].filter(Boolean);
      // A matched unit explains the hit best; otherwise show the narrative, centered on its match.
      const unitMatched = fields.includes('unit');
      const cod = p.death_description;
      const codSnippet = fields.includes('cod') ? snippet(cod, terms) : null;
      return (
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <span className="truncate">
              <Highlight text={personName(p)} terms={terms} />
              {p.class_year && <span className="ml-1.5 font-normal text-gray-500">{formatClassYear(p.class_year, p.class_letter)}</span>}
            </span>
            {p.awards.length > 0 && (
              <>
                <AwardIcon className="flex-shrink-0" />
                <span className="sr-only">Award recipient.</span>
              </>
            )}
            {p.has_document && (
              <>
                <DocumentIcon className="flex-shrink-0" />
                <span className="sr-only">Memorial document available.</span>
              </>
            )}
          </div>
          {details.length > 0 && (
            <div className="text-sm text-gray-600 truncate">
              <Highlight text={details.join(' · ')} terms={terms} />
            </div>
          )}
          {unitMatched ? (
            <div className="text-sm text-gray-600 italic truncate">
              <Highlight text={p.unit} terms={terms} />
            </div>
          ) : (
            cod && (
              <div className="hidden sm:block text-sm text-gray-500 italic truncate">
                <Highlight text={codSnippet ?? cod} terms={codSnippet ? terms : []} />
              </div>
            )
          )}
        </div>
      );
    }

    case 'link':
      return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold text-vmi-red">{row.label}</span>
          {row.detail && <Count>{row.detail}</Count>}
        </div>
      );
  }
}
