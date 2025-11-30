'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import DocumentIcon from '@/components/DocumentIcon';
import { getAwardDetail, AwardDetail, AwardRecipient } from '@/lib/api';

export default function AwardDetailPage() {
  const params = useParams();
  const awardId = Number(params.id);

  const [award, setAward] = useState<AwardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAward() {
      try {
        const data = await getAwardDetail(awardId);
        setAward(data);
      } catch (err) {
        setError('Failed to load award details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (awardId) {
      fetchAward();
    }
  }, [awardId]);

  // Helper to get image path
  const getImagePath = (filename: string) => {
    const extensions = ['.jpg', '.png', '.jpeg', '.gif'];
    for (const ext of extensions) {
      if (filename.toLowerCase().endsWith(ext)) {
        return `/${filename}`;
      }
    }
    return `/${filename}.jpg`;
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Awards', href: '/awards' },
    { label: award?.name || 'Loading...' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-vmi-cream">
        <Header breadcrumbs={breadcrumbs} showAwards={false} />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-center text-gray-600">Loading award details...</p>
        </main>
      </div>
    );
  }

  if (error || !award) {
    return (
      <div className="min-h-screen bg-vmi-cream">
        <Header breadcrumbs={breadcrumbs} showAwards={false} />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-center text-red-600">{error || 'Award not found'}</p>
          <div className="text-center mt-4">
            <Link href="/awards" className="text-vmi-red hover:underline">
              ← Back to Awards
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header breadcrumbs={breadcrumbs} showAwards={false} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Award Header Section */}
        <div className="bg-vmi-light-gold border-2 border-vmi-gold rounded-lg p-8 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Award Image */}
            <div className="relative w-32 h-44 flex-shrink-0">
              <Image
                src={getImagePath(award.image_filename)}
                alt={award.name}
                fill
                className="object-contain"
                sizes="128px"
                priority
              />
            </div>

            {/* Award Info */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black mb-4 text-vmi-red">
                {award.name}
              </h1>
              <p className="text-gray-700 text-lg mb-4">
                {award.short_description}
              </p>
              <p className="text-vmi-red font-bold text-xl">
                {award.recipient_count} VMI {award.recipient_count === 1 ? 'Recipient' : 'Recipients'}
                {award.total_awards_given > award.recipient_count && (
                  <span className="text-gray-600 font-normal text-base ml-2">
                    ({award.total_awards_given} total awards)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Long Description Section */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 mb-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-vmi-red">About This Award</h2>
          <div className="prose max-w-none text-gray-700 whitespace-pre-line">
            {award.long_description}
          </div>
        </div>

        {/* Recipients Section */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-vmi-red">
            VMI Alumni Recipients
          </h2>

          {award.recipients.length === 0 ? (
            <p className="text-center text-gray-600">
              No VMI recipients have been added yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {award.recipients.map((recipient: AwardRecipient) => (
                <Link
                  key={`${recipient.person_id}-${recipient.count}`}
                  href={`/memorial/person/${recipient.person_id}`}
                  className="block p-4 rounded-lg border-2 border-gray-200 hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 group-hover:text-vmi-red transition-colors">
                        {recipient.display_name}
                        {recipient.count > 1 && (
                          <span className="ml-2 text-sm text-vmi-gold font-normal">
                            (×{recipient.count})
                          </span>
                        )}
                      </h3>
                      {recipient.class_year && (
                        <p className="text-sm text-gray-600">
                          Class of {recipient.class_year}
                          {recipient.class_letter && ` (${recipient.class_letter})`}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">{recipient.conflict_name}</p>
                      {recipient.date_awarded && (
                        <p className="text-xs text-gray-400 mt-1">
                          Awarded: {new Date(recipient.date_awarded).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {recipient.pdf_key && (
                      <DocumentIcon className="ml-2 flex-shrink-0" />
                    )}
                  </div>
                  {recipient.citation && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2 italic">
                      &ldquo;{recipient.citation}&rdquo;
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/awards" className="text-vmi-red hover:underline font-semibold">
            ← Back to All Awards
          </Link>
        </div>
      </main>
    </div>
  );
}
