'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPersonDetail, PersonDetailWithContributions } from '@/lib/api';
import Header from '@/components/Header';
import ContributionForm from '@/components/ContributionForm';
import ContributionDisplay from '@/components/ContributionDisplay';

export default function PersonPage() {
  const params = useParams();
  const personId = parseInt(params.id as string);
  
  const [person, setPerson] = useState<PersonDetailWithContributions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

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

  useEffect(() => {
    async function fetchPdfUrl() {
      if (person && person.pdf_key && !pdfUrl) {
        setLoadingPdf(true);
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          setPdfUrl(`${apiUrl}/memorial/persons/${person.id}/pdf/`);
        } catch (err) {
          console.error('Failed to set PDF URL:', err);
          setPdfError(true);
        } finally {
          setLoadingPdf(false);
        }
      }
    }

    fetchPdfUrl();
  }, [person, pdfUrl]);

  const handleContributionSuccess = async () => {
    // Reload person data to get updated contributions
    try {
      const personData = await getPersonDetail(personId);
      setPerson(personData);
    } catch (err) {
      console.error('Failed to reload person data:', err);
    }
  };

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

  const displayName = (() => {
    const name = person.full_display_name || person.display_name;
    if (person.rank && person.full_display_name) {
      return name.replace(person.rank + ' ', '').replace(person.rank + ', ', '');
    }
    return person.full_display_name ? name : person.display_name;
  })();

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
          <h1 className="text-4xl font-black text-vmi-red mb-2 flex items-center gap-2">
            {displayName}
            {person.pdf_key && (
              <span title="Memorial document available" className="inline-block align-middle">
                {/* Simple document icon SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-file-text">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="9" y2="9" />
                </svg>
              </span>
            )}
          </h1>
          
          {/* Rank and Unit subtitle */}
          {(person.rank || person.unit) && (
            <div className="mb-6">
              {person.rank && (
                <p className="text-xl font-bold text-gray-700">{person.rank}</p>
              )}
              {person.unit && (
                <p className="text-lg text-gray-600 italic">{person.unit}</p>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
            <div className="space-y-3">
              {person.class_year && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Class Year:</span> {person.class_year}
                </p>
              )}
              <p className="text-lg">
                <span className="font-bold text-gray-700">Conflict:</span> {person.conflict_name}
              </p>
            </div>
            <div className="space-y-3">
              {person.death_date_display && (
                <p className="text-lg">
                  <span className="font-bold text-gray-700">Date of Death:</span>{' '}
                  {person.death_date_display}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Death Description Section */}
        {person.death_description && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-8 mb-12 shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-vmi-red">
              Circumstances of Death
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed italic">
              {person.death_description}
            </p>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center text-vmi-red">
            Memorial Portrait
          </h2>
          
          {person.pdf_key ? (
            <div className="relative">
              {loadingPdf ? (
                <div className="border-3 border-gray-400 border-dashed rounded-lg p-16 text-center bg-gray-50">
                  <p className="text-gray-700 text-lg">Loading PDF...</p>
                </div>
              ) : pdfError ? (
                <div className="border-3 border-gray-400 border-dashed rounded-lg p-16 text-center bg-gray-50">
                  <p className="text-gray-700 mb-4 text-lg">
                    Unable to load PDF viewer. 
                  </p>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-vmi-red text-white px-6 py-3 rounded hover:bg-vmi-dark-red hover:text-white transition-colors font-semibold"
                    >
                      Open PDF in New Tab
                    </a>
                  )}
                </div>
              ) : pdfUrl ? (
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
                      className="inline-block bg-vmi-red text-white px-6 py-3 rounded hover:bg-vmi-dark-red hover:text-white transition-colors font-semibold"
                    >
                      Open PDF in Full Screen
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border-3 border-gray-400 border-dashed rounded-lg p-16 text-center bg-gray-50">
              <p className="text-gray-700 text-lg">
                No memorial document available yet.
              </p>
            </div>
          )}
        </div>

        {/* Community Contributions Section */}
        <ContributionForm 
          personId={person.id} 
          personName={displayName}
          onSuccess={handleContributionSuccess}
        />
        
        {/* Display Approved Contributions */}
        {person.contributions && person.contributions.length > 0 && (
          <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl mt-8">
            <ContributionDisplay contributions={person.contributions} />
          </div>
        )}
      </main>
    </div>
  );
}