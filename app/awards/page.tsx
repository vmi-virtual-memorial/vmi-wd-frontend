'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import { getAwards, Award } from '@/lib/api';

export default function AwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAwards() {
      try {
        const data = await getAwards();
        setAwards(data);
      } catch (err) {
        setError('Failed to load awards');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAwards();
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Awards for Heroism and Gallantry' }
  ];

  // Helper to get image extension
  const getImagePath = (filename: string) => {
    // Check for common extensions in public folder
    const extensions = ['.jpg', '.png', '.jpeg', '.gif'];
    for (const ext of extensions) {
      // The filename in the DB might already include extension or not
      if (filename.toLowerCase().endsWith(ext)) {
        return `/${filename}`;
      }
    }
    // Default to .jpg if no extension
    return `/${filename}.jpg`;
  };

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header breadcrumbs={breadcrumbs} showAwards={false} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Title Section */}
        <div className="bg-vmi-light-gold border-2 border-vmi-gold rounded-lg p-8 mb-12 shadow-xl">
          <h1 className="text-4xl font-black text-center mb-4 text-vmi-red">
            Awards for Heroism and Gallantry
          </h1>
          <p className="text-center text-gray-700 max-w-3xl mx-auto">
            Those Alumni who &ldquo;Gave All&rdquo; on this memorial website who were also recognized for valor and heroism in combat are listed on this page with a link to their profile.
            These awards honor extraordinary acts of bravery and selfless service in defense of our country.
          </p>
        </div>

        {/* Awards Grid */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center text-vmi-red">
            Military Decorations
          </h2>

          {loading && (
            <p className="text-center text-gray-600">Loading awards...</p>
          )}

          {error && (
            <p className="text-center text-red-600">{error}</p>
          )}

          {!loading && !error && awards.length === 0 && (
            <p className="text-center text-gray-600">
              No awards found. Please add some through the admin panel.
            </p>
          )}

          {!loading && !error && awards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {awards.map((award) => (
                <Link
                  key={award.id}
                  href={`/awards/${award.id}`}
                  className="block p-6 rounded-lg border-2 border-gray-200 hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Award Image */}
                    <div className="relative w-24 h-32 mb-4">
                      <Image
                        src={getImagePath(award.image_filename)}
                        alt={award.name}
                        fill
                        className="object-contain"
                        sizes="96px"
                      />
                    </div>

                    {/* Award Info */}
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-vmi-red transition-colors mb-2">
                      {award.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {award.short_description}
                    </p>
                    <p className="text-vmi-red font-bold">
                      {award.recipient_count} VMI {award.recipient_count === 1 ? 'Recipient' : 'Recipients'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
