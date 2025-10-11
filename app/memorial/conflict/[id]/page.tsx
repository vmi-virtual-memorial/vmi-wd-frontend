'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getConflicts, getPeopleByConflict, Conflict, PersonDetail } from '@/lib/api';
import Header from '@/components/Header';
import DocumentIcon from '@/components/DocumentIcon';

export default function ConflictPage() {
  const params = useParams();
  const conflictId = parseInt(params.id as string);
  
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [people, setPeople] = useState<PersonDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const conflicts = await getConflicts();
        const currentConflict = conflicts.find(c => c.id === conflictId);
        
        if (!currentConflict) {
          throw new Error('Conflict not found');
        }
        
        setConflict(currentConflict);
        const peopleData = await getPeopleByConflict(conflictId);
        setPeople(peopleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [conflictId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <p className="text-gray-600 text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !conflict) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-xl">{error || 'Conflict not found'}</p>
          <Link href="/" className="text-vmi-red hover:text-vmi-dark-red underline font-semibold">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header 
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: conflict.name }
        ]}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Conflict Header */}
        <div className="bg-vmi-light-gold border-2 border-vmi-gold rounded-lg p-8 mb-12 shadow-xl">
          <h1 className="text-4xl font-black text-vmi-red mb-4">
            {conflict.name}
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            {conflict.start_year === conflict.end_year
              ? conflict.start_year
              : `${conflict.start_year} – ${conflict.end_year || 'Present'}`}
          </p>
          {conflict.description && (
            <p className="text-gray-800 leading-relaxed mb-6">{conflict.description}</p>
          )}
          <div className="border-t-2 border-vmi-gold pt-6">
            <p className="text-2xl font-bold text-vmi-red">
              {conflict.casualty_count} VMI Alumni Gave Their Lives
            </p>
          </div>
        </div>

        {/* People List */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center text-vmi-red">
            Honor Roll
          </h2>
          
          {people.length === 0 ? (
            <p className="text-center text-gray-600 text-lg">No casualties recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/memorial/person/${person.id}`}
                  className="block p-6 border-2 border-gray-200 rounded-lg hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                >
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-vmi-red transition-colors mb-2 flex items-center gap-2">
                    {person.full_display_name ? 
                      person.full_display_name.replace(person.rank + ' ', '').replace(person.rank + ', ', '') 
                      : person.display_name.replace(person.rank + ' ', '').replace(person.rank + ', ', '')}
                    {person.pdf_key && <DocumentIcon className="flex-shrink-0" />}
                  </h3>
                  {person.rank && (
                    <p className="text-gray-700 font-semibold">{person.rank}</p>
                  )}
                  {person.unit && (
                    <p className="text-gray-600 text-sm italic">{person.unit}</p>
                  )}
                  {person.death_description && (
                    <p className="text-gray-600 text-sm italic mt-3 line-clamp-3">
                      {person.death_description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}