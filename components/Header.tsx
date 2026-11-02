import Link from 'next/link';
import MobileSearch from '@/components/search/MobileSearch';
import SearchBar from '@/components/search/SearchBar';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  showSearch?: boolean;
  showIndex?: boolean;
  showAwards?: boolean;
  /** The home page shows the larger seal with the Institute's name. */
  variant?: 'page' | 'home';
}

export default function Header({
  breadcrumbs = [],
  showSearch = true,
  showIndex = true,
  showAwards = true,
  variant = 'page',
}: HeaderProps) {
  const home = variant === 'home';
  return (
    <header className="bg-vmi-red shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/" className="group flex shrink-0 items-center gap-3 text-white" aria-label={home ? undefined : 'VMI Virtual Memorial home'}>
            <span
              className={`flex items-center justify-center rounded-full border-white bg-vmi-gold font-bold text-vmi-red ${
                home ? 'h-11 w-11 border-2 text-sm sm:h-16 sm:w-16 sm:border-4 sm:text-xl' : 'h-11 w-11 border-2 text-sm'
              }`}
            >
              VMI
            </span>
            {home ? (
              <span className="hidden sm:block">
                <span className="block text-sm uppercase tracking-wide">Virginia Military Institute</span>
                <span className="block text-xs">Lexington, Virginia</span>
              </span>
            ) : (
              <span className="hidden font-display text-lg font-bold leading-tight transition-colors group-hover:text-vmi-gold lg:block">
                VMI Virtual Memorial
              </span>
            )}
          </Link>

          {showSearch && (
            <div className="hidden min-w-0 max-w-xl flex-1 md:block">
              <SearchBar shortcuts />
            </div>
          )}

          <nav aria-label="Main" className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            {showSearch && <MobileSearch className="md:hidden" />}
            {showAwards && (
              <Link
                href="/awards"
                aria-label="Awards for Heroism & Gallantry"
                className="rounded bg-[#FFD619] px-3 py-2 text-center text-sm font-bold leading-tight text-[#AE122A] shadow-md transition-colors hover:bg-white sm:px-4"
              >
                <span className="sm:hidden">Awards</span>
                <span className="hidden sm:inline">
                  Awards for<br />Heroism &amp; Gallantry
                </span>
              </Link>
            )}
            {showIndex && (
              <Link
                href="/memorial"
                aria-label="View Complete Index"
                className="rounded bg-[#FFD619] px-3 py-2 text-sm font-bold text-[#AE122A] shadow-md transition-colors hover:bg-white sm:px-6 sm:text-base"
              >
                <span className="sm:hidden">Index</span>
                <span className="hidden sm:inline">View Complete Index</span>
              </Link>
            )}
          </nav>
        </div>

        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mt-3 flex flex-wrap items-center gap-x-3 text-white">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                {item.href ? (
                  <Link href={item.href} className="text-[#FFD619] transition-colors hover:text-white">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <span className="ml-3 text-[#FFD619]">›</span>}
              </div>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
