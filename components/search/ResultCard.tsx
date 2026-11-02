import Link from 'next/link';
import AwardIcon from '@/components/AwardIcon';
import DocumentIcon from '@/components/DocumentIcon';
import { formatClassYear } from '@/lib/classYear';
import { type PersonHit, type SearchEngine, personName } from '@/lib/search/engine';
import { snippet } from '@/lib/search/highlight';
import Highlight from './Highlight';

/** One Advanced Search result. */
export default function ResultCard({ hit, engine }: { hit: PersonHit; engine: SearchEngine }) {
  const { person: p, terms, fields } = hit;
  const conflict = engine.conflictById.get(p.conflict);
  const branch = engine.branchByCode.get(p.branch);
  const awards = p.awards.map(id => engine.awardById.get(id)?.name).filter(Boolean);
  const cod = p.death_description;
  const codText = (fields.includes('cod') && snippet(cod, terms, 220)) || cod;

  return (
    <Link
      href={`/memorial/person/${p.id}`}
      className="group block rounded-lg border-2 border-gray-200 p-5 transition-all duration-200 hover:border-vmi-gold hover:bg-vmi-light-gold hover:no-underline"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="min-w-0 md:col-span-2">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-gray-800 transition-colors group-hover:text-vmi-red">
            <span>
              <Highlight text={personName(p)} terms={terms} />
              {p.class_year && <span className="ml-1.5 font-normal text-gray-600">{formatClassYear(p.class_year, p.class_letter)}</span>}
            </span>
            {p.awards.length > 0 && <AwardIcon className="flex-shrink-0" title={`Awarded: ${awards.join(', ')}`} />}
            {p.has_document && <DocumentIcon className="flex-shrink-0" />}
          </h2>
          {p.rank && (
            <p className="text-gray-700">
              <Highlight text={p.rank} terms={terms} />
            </p>
          )}
          {p.unit && (
            <p className="text-sm italic text-gray-600">
              <Highlight text={p.unit} terms={terms} />
            </p>
          )}
          {awards.length > 0 && fields.includes('awards') && (
            <p className="text-sm text-gray-700">
              <Highlight text={awards.join(' · ')} terms={terms} />
            </p>
          )}
          {cod && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
              <Highlight text={codText} terms={terms} />
            </p>
          )}
        </div>
        <div className="md:text-right">
          {conflict && <p className="font-semibold text-gray-700">{conflict.name}</p>}
          {p.death_date_display && <p className="text-sm text-gray-600">{p.death_date_display}</p>}
          {branch && <p className="text-sm text-gray-600">{branch.name}</p>}
          <span className="mt-2 inline-block font-bold text-vmi-red group-hover:text-vmi-dark-red">View Details →</span>
        </div>
      </div>
    </Link>
  );
}
