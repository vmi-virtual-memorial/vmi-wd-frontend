// API configuration for the VMI Memorial frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// const API_BASE_URL = 'https://web-production-6002.up.railway.app/api';


export interface Conflict {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
  description: string;
  casualty_count: number;
  order: number;
}

export interface Person {
  id: number;
  display_name: string;
  rank: string;
  unit: string;
  class_year?: number;
  full_display_name?: string;
  death_description?: string;
}

export interface PersonDetail extends Person {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  date_of_death: string | null;
  death_description: string;
  conflict: number;
  conflict_name: string;
  pdf_key: string;
  pdf_url: string | null;
}

export interface PersonSearchResult {
  id: number;
  display_name: string;
  full_display_name: string;
  class_year: number | null;
  rank: string;
  unit: string;
  date_of_death: string | null;
  conflict_name: string;
  conflict_id: number;
}

export interface SearchFilters {
  conflicts: Conflict[];
  class_years: number[];
}

export interface SearchParams {
  q?: string;
  class_year?: string;
  conflict?: string;
  date_from?: string;
  date_to?: string;
  no_date?: boolean;
}

// Fetch all conflicts
export async function getConflicts(): Promise<Conflict[]> {
  const response = await fetch(`${API_BASE_URL}/memorial/conflicts/`);
  if (!response.ok) {
    throw new Error('Failed to fetch conflicts');
  }
  const data = await response.json();
  return data.results || data;
}

// Fetch people by conflict
export async function getPeopleByConflict(conflictId: number): Promise<Person[]> {
  const response = await fetch(`${API_BASE_URL}/memorial/persons/?conflict=${conflictId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch people');
  }
  const data = await response.json();
  return data.results || data;
}

// Fetch person details
export async function getPersonDetail(personId: number): Promise<PersonDetail> {
  const response = await fetch(`${API_BASE_URL}/memorial/persons/${personId}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch person details');
  }
  return response.json();
}

// Fetch memorial index (all conflicts with casualties)
export async function getMemorialIndex(): Promise<Conflict[]> {
  const response = await fetch(`${API_BASE_URL}/memorial/index/`);
  if (!response.ok) {
    throw new Error('Failed to fetch memorial index');
  }
  return response.json();
}

// Search people with filters
export async function searchPeople(params: SearchParams): Promise<{ count: number; results: PersonSearchResult[] }> {
  const queryParams = new URLSearchParams();
  
  if (params.q) queryParams.append('q', params.q);
  if (params.class_year) queryParams.append('class_year', params.class_year);
  if (params.conflict) queryParams.append('conflict', params.conflict);
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  if (params.no_date !== undefined) queryParams.append('no_date', params.no_date.toString());
  
  const response = await fetch(`${API_BASE_URL}/memorial/persons/search/?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to search people');
  }
  return response.json();
}

// Get available search filters
export async function getSearchFilters(): Promise<SearchFilters> {
  const response = await fetch(`${API_BASE_URL}/memorial/search-filters/`);
  if (!response.ok) {
    throw new Error('Failed to fetch search filters');
  }
  return response.json();
}