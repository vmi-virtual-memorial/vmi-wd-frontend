// API configuration for the VMI Memorial frontend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
}

export interface PersonDetail extends Person {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  date_of_death: string | null;
  conflict: number;
  conflict_name: string;
  pdf_key: string;
  pdf_url: string | null;
}

// Fetch all conflicts
export async function getConflicts(): Promise<Conflict[]> {
  const response = await fetch(`${API_BASE_URL}/api/memorial/conflicts/`);
  if (!response.ok) {
    throw new Error('Failed to fetch conflicts');
  }
  const data = await response.json();
  return data.results || data;
}

// Fetch people by conflict
export async function getPeopleByConflict(conflictId: number): Promise<Person[]> {
  const response = await fetch(`${API_BASE_URL}/api/memorial/persons/?conflict=${conflictId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch people');
  }
  const data = await response.json();
  return data.results || data;
}

// Fetch person details
export async function getPersonDetail(personId: number): Promise<PersonDetail> {
  const response = await fetch(`${API_BASE_URL}/api/memorial/persons/${personId}/`);
  if (!response.ok) {
    throw new Error('Failed to fetch person details');
  }
  return response.json();
}