'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPersonDetail, PersonDetail } from '@/lib/api';
import Header from '@/components/Header';

export default function PersonPage() {
  const params = useParams();
  const personId = parseInt(params.id as string);
  
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const personData = await getPersonDetail(personId);
        setPerson(personData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load person details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [personId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <p className="text-gray-600 text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-vmi-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-xl">{error || 'Person not found'}</p>
          <Link href="/" className="text-vmi-red hover:text-vmi-dark-red underline font-semibold">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const pdfUrl = person.pdf_url || '/api/memorial/persons/' + person.id + '/pdf/';

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header 
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: person.conflict_name, href: `/memorial/conflict/${person.conflict}` },
          { label: person.display_name }
        ]}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Person Header */}
        <div className="bg-vmi-light-gold border-2 border-vmi-gold rounded-lg p-8 mb-12 shadow-xl">
          <h1 className="text-4xl font-black text-vmi-red mb-6">
            {person.full_display_name || person.display_name}
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
            <div className="space-y-3">
              {person.class_year && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Class Year:</span> {person.class_year}
                </p>
              )}
              {person.rank && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Rank:</span> {person.rank}
                </p>
              )}
              {person.unit && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Unit:</span> {person.unit}
                </p>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-lg">
                <span className="font-bold text-gray-700">Conflict:</span> {person.conflict_name}
              </p>
              {person.date_of_death && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Date of Death:</span>{' '}
                  {new Date(person.date_of_death).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 text-center text-vmi-red">
            Memorial Document
          </h2>
          
          {person.pdf_key ? (
            <div className="relative">
              {pdfError ? (
                <div className="border-3 border-gray-400 border-dashed rounded-lg p-16 text-center bg-gray-50">
                  <p className="text-gray-700 mb-4 text-lg">
                    Unable to load PDF viewer. 
                  </p>
                  <a 
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-vmi-red text-white px-6 py-3 rounded hover:bg-vmi-dark-red transition-colors font-semibold"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              ) : (
                <div className="border-2 border-gray-400 rounded-lg overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                    className="w-full h-[800px]"
                    onError={() => setPdfError(true)}
                    title={`Memorial document for ${person.display_name}`}
                  />
                  <div className="p-6 bg-gray-100 text-center border-t-2 border-gray-400">
                    <a 
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-vmi-red text-white px-6 py-3 rounded hover:bg-vmi-dark-red transition-colors font-semibold"
                    >
                      Open PDF in Full Screen
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-3 border-gray-400 border-dashed rounded-lg p-16 text-center bg-gray-50">
              <p className="text-gray-700 text-lg">
                No memorial document available yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}