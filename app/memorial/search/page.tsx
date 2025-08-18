'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchPeople, getSearchFilters, PersonSearchResult, SearchFilters } from '@/lib/api';
import Header from '@/components/Header';
import DocumentIcon from '@/components/DocumentIcon';

export default function MemorialSearchPage() {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassYears, setSelectedClassYears] = useState<number[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [noDate, setNoDate] = useState(false);
  
  // Results state
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<SearchFilters>({ conflicts: [], class_years: [] });

  // Load all people on mount and get filters
  useEffect(() => {
    async function initialize() {
      try {
        // Get filters
        const filterData = await getSearchFilters();
        setFilters(filterData);
        
        // Load all people initially
        const params = {
          q: '',
          class_year: '',
          conflict: '',
          date_from: '',
          date_to: '',
          no_date: false
        };
        
        const data = await searchPeople(params);
        setResults(data.results);
        setTotalCount(data.count);
        setHasSearched(true);
      } catch (err) {
        console.error('Failed to initialize:', err);
      }
    }
    
    initialize();
  }, []);

  const performSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      const params = {
        q: searchTerm,
        class_year: selectedClassYears.join(','),
        conflict: selectedConflicts.join(','),
        date_from: dateFrom,
        date_to: dateTo,
        no_date: noDate
      };
      
      const data = await searchPeople(params);
      setResults(data.results);
      setTotalCount(data.count);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const toggleClassYear = (year: number) => {
    setSelectedClassYears(prev =>
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const toggleConflict = (conflictId: number) => {
    setSelectedConflicts(prev =>
      prev.includes(conflictId)
        ? prev.filter(c => c !== conflictId)
        : [...prev, conflictId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClassYears([]);
    setSelectedConflicts([]);
    setDateFrom('');
    setDateTo('');
    setNoDate(false);
  };

  return (
    <div className="min-h-screen bg-vmi-cream">
      <Header 
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Memorial Index', href: '/memorial' },
          { label: 'Search Memorial' }
        ]}
        showSearch={false}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Search Form - Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-xl sticky top-6">
              <h2 className="text-2xl font-bold text-vmi-red mb-6">Search Filters</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Search */}
                <div>
                  <label htmlFor="search" className="block text-sm font-bold text-gray-700 mb-2">
                    Search by Name
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold"
                  />
                </div>

                {/* Class Year Filter */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Class Year
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                    {filters.class_years.map(year => (
                      <label key={year} className="flex items-center mb-1 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedClassYears.includes(year)}
                          onChange={() => toggleClassYear(year)}
                          className="mr-2 text-vmi-red focus:ring-vmi-gold"
                        />
                        <span className="text-sm">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conflict Filter */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Conflict
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2">
                    {filters.conflicts.map(conflict => (
                      <label key={conflict.id} className="flex items-center mb-1 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedConflicts.includes(conflict.id)}
                          onChange={() => toggleConflict(conflict.id)}
                          className="mr-2 text-vmi-red focus:ring-vmi-gold"
                        />
                        <span className="text-sm">{conflict.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Date of Death
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      disabled={noDate}
                      placeholder="From"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold disabled:bg-gray-100"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      disabled={noDate}
                      placeholder="To"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-vmi-gold disabled:bg-gray-100"
                    />
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noDate}
                        onChange={(e) => setNoDate(e.target.checked)}
                        className="mr-2 text-vmi-red focus:ring-vmi-gold"
                      />
                      <span className="text-sm">No date recorded</span>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    className="w-full bg-vmi-red text-white px-4 py-2 rounded font-bold hover:bg-vmi-dark-red transition-colors"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Results - Right Side */}
          <div className="lg:col-span-3">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-xl">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-vmi-red mb-2">Memorial Search</h1>
                {hasSearched && (
                  <p className="text-gray-600">
                    Found {totalCount} {totalCount === 1 ? 'person' : 'people'}
                  </p>
                )}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((person) => (
                    <Link
                      key={person.id}
                      href={`/memorial/person/${person.id}`}
                      className="block p-6 border-2 border-gray-200 rounded-lg hover:border-vmi-gold hover:bg-vmi-light-gold transition-all duration-200 group"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 group-hover:text-vmi-red transition-colors flex items-center gap-2">
                            {person.full_display_name ? 
                              person.full_display_name.replace(person.rank + ' ', '').replace(person.rank + ', ', '') 
                              : person.display_name}
                            {person.pdf_key && <DocumentIcon className="flex-shrink-0" />}
                          </h3>
                          {person.rank && (
                            <p className="text-gray-700">{person.rank}</p>
                          )}
                          {person.unit && (
                            <p className="text-gray-600 text-sm italic">{person.unit}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-700 font-semibold">{person.conflict_name}</p>
                          {/* THIS IS WHERE death_date_display IS USED in search results */}
                          {person.death_date_display && (
                            <p className="text-gray-600 text-sm">
                              {person.death_date_display}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-vmi-red group-hover:text-vmi-dark-red font-bold">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : hasSearched ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No results found matching your criteria.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-vmi-red hover:text-vmi-dark-red underline font-semibold"
                  >
                    Clear filters and try again
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">Use the filters to search the memorial database.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}