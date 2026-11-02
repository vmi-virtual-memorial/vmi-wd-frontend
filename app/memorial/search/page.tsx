'use client';

import { Suspense } from 'react';
import Header from '@/components/Header';
import AdvancedSearch from '@/components/search/AdvancedSearch';

export default function MemorialSearchPage() {
  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Memorial Index', href: '/memorial' },
          { label: 'Advanced Search' },
        ]}
      />
      {/* useSearchParams needs a Suspense boundary for static rendering */}
      <Suspense fallback={<p className="py-12 text-center text-gray-600">Loading…</p>}>
        <AdvancedSearch />
      </Suspense>
    </div>
  );
}
