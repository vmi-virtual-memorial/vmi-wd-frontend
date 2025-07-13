import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  breadcrumbs: BreadcrumbItem[];
  showSearch?: boolean;
  showIndex?: boolean;
}

export default function Header({ breadcrumbs, showSearch = true, showIndex = true }: HeaderProps) {
  return (
    <header className="bg-[#AE122A] shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center space-x-3 text-white flex-wrap">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                {item.href ? (
                  <Link 
                    href={item.href} 
                    className="text-[#FFD619] hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold">{item.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="text-[#FFD619] ml-3">›</span>
                )}
              </div>
            ))}
          </nav>

          {/* Right Navigation */}
          {(showSearch || showIndex) && (
            <div className="flex items-center space-x-4">
              {showSearch && (
                <Link 
                  href="/memorial/search" 
                  className="text-[#FFD619] hover:text-white transition-colors font-semibold"
                >
                  Search Memorial
                </Link>
              )}
              {showIndex && (
                <Link 
                  href="/memorial" 
                  className="bg-[#FFD619] text-[#AE122A] px-6 py-2 rounded font-bold hover:bg-white transition-colors shadow-md"
                >
                  View Complete Index
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}