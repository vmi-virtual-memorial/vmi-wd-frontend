'use client';

import { useEffect, useState } from 'react';
import SearchBar, { SearchIcon } from './SearchBar';

/** Small screens: a search button that opens the bar as a full-screen sheet. */
export default function MobileSearch({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the memorial"
        aria-haspopup="dialog"
        className={`rounded p-2 text-vmi-gold transition-colors hover:text-white ${className}`}
      >
        <SearchIcon className="h-6 w-6" />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Search the memorial" className="fixed inset-0 z-50 flex flex-col bg-white p-3">
          <SearchBar variant="sheet" onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
