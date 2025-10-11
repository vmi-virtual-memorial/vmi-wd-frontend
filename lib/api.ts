// API configuration for the VMI Memorial frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// CSRF token management
let csrfToken: string | null = null;

// Helper function to get CSRF token from cookies
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

// Get CSRF token from API or cookie
async function getCSRFToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  
  // First try to get from cookie
  const cookieToken = getCookie('csrftoken');
  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }
  
  // If no cookie, get from API
  try {
    const response = await fetch(`${API_BASE_URL}/csrf/`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    }
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
  }
  
  return null;
}

export interface Contribution {
  id: number;
  content_type: 'text' | 'image' | 'both';
  content_text?: string;
  content_image?: string;
  submitted_at: string;
  contributor_display: string;
}

export interface ContributionSubmit {
  contributor_email: string;
  content_type: 'text' | 'image' | 'both';
  content_text?: string;
  content_image?: File;
}

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
  pdf_key?: string;
}

export interface PersonDetail extends Person {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  date_of_death: string | null;
  death_date_display?: string;
  death_description: string;
  conflict: number;
  conflict_name: string;
  pdf_key: string;
  pdf_url: string | null;
}

export interface PersonDetailWithContributions extends PersonDetail {
  contributions?: Contribution[];
}

export interface PersonSearchResult {
  id: number;
  display_name: string;
  full_display_name: string;
  class_year: number | null;
  rank: string;
  unit: string;
  date_of_death: string | null;
  death_date_display?: string;
  conflict_name: string;
  conflict_id: number;
  pdf_key?: string;
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
export async function getPeopleByConflict(conflictId: number): Promise<PersonDetail[]> {
  const response = await fetch(`${API_BASE_URL}/memorial/persons/?conflict=${conflictId}&paginate=false`);
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
export async function searchPeople(params: SearchParams): Promise<{ count: number; results: PersonDetail[] }> {
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

// Submit contribution with CSRF protection
export async function submitContribution(
  personId: number, 
  data: ContributionSubmit
): Promise<Contribution> {
  const formData = new FormData();
  formData.append('contributor_email', data.contributor_email);
  formData.append('content_type', data.content_type);
  
  if (data.content_text) {
    formData.append('content_text', data.content_text);
  }
  
  if (data.content_image) {
    formData.append('content_image', data.content_image);
  }
  
  // Get CSRF token
  const token = await getCSRFToken();
  
  const headers: HeadersInit = {};
  if (token) {
    headers['X-CSRFToken'] = token;
  }
  
  const response = await fetch(
    `${API_BASE_URL}/memorial/persons/${personId}/contributions/`,
    {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include', // Important for CSRF cookies
    }
  );
  
  if (!response.ok) {
    try {
      const error = await response.json();
      throw new Error(error.error || error.detail || 'Failed to submit contribution');
    } catch {
      throw new Error(`Failed to submit contribution: ${response.statusText}`);
    }
  }
  
  return response.json();
}

// Get approved contributions for a person
export async function getPersonContributions(personId: number): Promise<Contribution[]> {
  const response = await fetch(
    `${API_BASE_URL}/memorial/persons/${personId}/contributions/`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch contributions');
  }
  
  const data = await response.json();
  return data.results || [];
}