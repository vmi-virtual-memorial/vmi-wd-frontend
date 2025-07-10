'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getConflicts, Conflict } from '@/lib/api';
import Image from 'next/image';

export default function Home() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConflicts() {
      try {
        const data = await getConflicts();
        setConflicts(data);
      } catch (err) {
        setError('Failed to load conflicts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchConflicts();
  }, []);

  return (
    <div className="min-h-screen bg-vmi-cream">
      {/* Header */}
      <header className="bg-vmi-red shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* VMI Seal placeholder - replace with actual image */}
            <div className="w-16 h-16 bg-vmi-gold rounded-full flex items-center justify-center text-vmi-red font-bold text-xl border-4 border-white">
              VMI
            </div>
            <div className="text-white">
              <div className="text-sm uppercase tracking-wide">Virginia Military Institute</div>
              <div className="text-xs">Lexington, Virginia</div>
            </div>
          </div>
          <Link href="/memorial" className="text-vmi-gold hover:text-white transition-colors font-semibold">
            Memorial Index
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Title */}
        <h1 className="text-5xl font-black text-center mb-16 text-vmi-red">
          VMI Virtual Memorial
        </h1>

        {/* Welcome Card */}
        <div className="bg-white border-2 border-vmi-gold rounded-lg p-10 mb-16 shadow-xl">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xl text-gray-800 mb-8 leading-relaxed">
              Since 1839, the Virginia Military Institute has produced leaders of character who have served their country in peace and at war.
              From the Mexican War to the War on Terrorism, VMI cadets and alumni have answered the call to service.
            </p>

            <p className="text-xl text-gray-800 mb-8 leading-relaxed">
              This virtual memorial lists the names of VMI Alumni who died on the Field of Honor.
              Their class year is shown with their names.
              Links for those highlighted provide more information on their story and how they &quot;Gave All.&quot;
            </p>

            {/* Placeholder for statue image */}
            <div className="relative w-full h-[600px] mb-6 rounded-lg overflow-hidden border-4 border-white shadow-inner">
              <Image
                src="/vmi-memorial-statue.jpg"
                alt="VMI Memorial Statue - Virginia Mourning Her Dead"
                fill
                className="object-cover object-top"
                priority
              />
            </div>
            <p className="text-2xl text-vmi-red font-bold italic">
              &quot;In Pace Paratus&quot;
            </p>
            <p className="text-lg text-gray-700">
              Prepared in Peace
            </p>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-10 shadow-xl">
          <h2 className="text-3xl font-bold mb-8 text-center text-vmi-red">
            Browse by Conflict
          </h2>

          {loading && (
            <p className="text-center text-gray-600">Loading conflicts...</p>
          )}

          {error && (
            <p className="text-center text-red-600">{error}</p>
          )}

          {!loading && !error && conflicts.length === 0 && (
            <p className="text-center text-gray-600">No conflicts found. Please add some through the admin panel.</p>
          )}

          {!loading && !error && conflicts.length > 0 && (
            <ul className="space-y-4">
              {conflicts.map((conflict) => (
                <li key={conflict.id}>
                  <Link
                    href={`/memorial/conflict/${conflict.id}`}
                    className="block p-6 rounded-lg border-2 border-gray-200 hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-vmi-red transition-colors">
                          {conflict.name}
                        </h3>
                        <p className="text-gray-600">
                          {conflict.start_year} – {conflict.end_year || 'Present'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-black text-vmi-red">
                          {conflict.casualty_count}
                        </p>
                        <p className="text-sm text-gray-600 uppercase tracking-wide">Casualties</p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} matthew forrester wolffe, Richard Colwell Wolffe Jr.
          </p>
        </div>
      </footer>
    </div>
  );
}