'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import DocumentIcon from '@/components/DocumentIcon';
import { PersonDetail } from '@/lib/api';

interface ConflictWithCasualties {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
  description: string;
  casualty_count: number;
  casualties: PersonDetail[];
}

export default function MemorialIndexPage() {
  const [conflicts, setConflicts] = useState<ConflictWithCasualties[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedConflicts, setExpandedConflicts] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiUrl}/memorial/index/`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch memorial index');
        }
        
        const data = await response.json();
        setConflicts(data);
        
        // By default, expand conflicts with casualties
        const defaultExpanded = new Set<number>(
          data.filter((c: ConflictWithCasualties) => c.casualty_count > 0).map((c: ConflictWithCasualties) => c.id)
        );
        setExpandedConflicts(defaultExpanded);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const toggleConflict = (conflictId: number) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(conflictId)) {
      newExpanded.delete(conflictId);
    } else {
      newExpanded.add(conflictId);
    }
    setExpandedConflicts(newExpanded);
  };

  const toggleAll = () => {
    if (expandedConflicts.size === conflicts.length) {
      setExpandedConflicts(new Set<number>());
    } else {
      setExpandedConflicts(new Set<number>(conflicts.map(c => c.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <p className="text-gray-600 text-xl">Loading memorial index...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-xl">{error}</p>
          <Link href="/" className="text-vmi-red hover:text-vmi-dark-red underline font-semibold">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalCasualties = conflicts.reduce((sum, conflict) => sum + conflict.casualty_count, 0);

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header 
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Complete Memorial Index' }
        ]}
        showSearch={true}
        showIndex={false}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Index Header */}
        <div className="bg-vmi-light-gold border-2 border-vmi-gold rounded-lg p-8 mb-12 shadow-xl">
          <h1 className="text-4xl font-black text-vmi-red mb-4">
            VMI Memorial Index
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Complete listing of all VMI alumni who made the ultimate sacrifice in service to their country.
          </p>
          <div className="flex flex-wrap gap-6 text-lg">
            <div>
              <span className="font-bold text-gray-700">Total Conflicts:</span>{' '}
              <span className="text-vmi-red font-bold">{conflicts.length}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">Total Lives Given:</span>{' '}
              <span className="text-vmi-red font-bold">{totalCasualties}</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={toggleAll}
              className="bg-vmi-red text-white px-6 py-2 rounded hover:bg-vmi-dark-red transition-colors font-semibold"
            >
              {expandedConflicts.size === conflicts.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        {/* Conflicts and Casualties */}
        <div className="space-y-8">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden">
              {/* Conflict Header */}
              <div 
                className="p-6 bg-gray-50 border-b-2 border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleConflict(conflict.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-vmi-red mb-1">
                      {conflict.name}
                    </h2>
                    <p className="text-gray-600">
                      {conflict.start_year === conflict.end_year
                        ? conflict.start_year
                        : `${conflict.start_year} – ${conflict.end_year || 'Present'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-3xl font-black text-vmi-red">{conflict.casualty_count}</p>
                      <p className="text-sm text-gray-600 uppercase tracking-wide">Casualties</p>
                    </div>
                    <div className="text-2xl text-gray-400">
                      {expandedConflicts.has(conflict.id) ? '−' : '+'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Casualties List */}
              {expandedConflicts.has(conflict.id) && conflict.casualty_count > 0 && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conflict.casualties.map((person) => (
                      <Link
                        key={person.id}
                        href={`/memorial/person/${person.id}`}
                        className="block p-4 border border-gray-200 rounded hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                      >
                        <h3 className="font-bold text-gray-800 group-hover:text-vmi-red transition-colors flex items-center gap-2">
                          {person.rank
                            ? person.display_name.replace(person.rank + ' ', '').replace(person.rank + ', ', '')
                            : person.display_name}
                          {person.pdf_key && <DocumentIcon className="flex-shrink-0" />}
                        </h3>
                        {person.rank && (
                          <p className="text-gray-700 text-sm">{person.rank}</p>
                        )}
                        {person.unit && (
                          <p className="text-gray-600 text-sm italic">{person.unit}</p>
                        )}
                        {person.death_description && (
                          <p className="text-gray-600 text-sm italic mt-2 line-clamp-2">
                            {person.death_description}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No casualties message */}
              {expandedConflicts.has(conflict.id) && conflict.casualty_count === 0 && (
                <div className="p-6 text-center text-gray-600">
                  <p>No casualties recorded for this conflict.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}