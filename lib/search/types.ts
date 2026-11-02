// Shape of GET /api/memorial/search-index/ (vmi-wd-backend memorial/search_index.py).

export interface IndexConflict {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
  casualty_count: number;
}

export interface IndexAward {
  id: number;
  name: string;
  image_filename: string;
  recipient_count: number;
  total_awards_given: number;
}

export interface IndexBranch {
  code: string;
  name: string;
  aliases: string[];
  count: number;
}

export interface IndexPerson {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  rank: string;
  unit: string;
  /** Effective branch code ('' when unknown). */
  branch: string;
  class_year: number | null;
  class_letter: string;
  conflict: number;
  /** ISO date. */
  date_of_death: string | null;
  death_date_display: string | null;
  death_description: string;
  has_document: boolean;
  /** Award ids, in award display order. */
  awards: number[];
}

export interface SearchIndexData {
  version: number;
  conflicts: IndexConflict[];
  awards: IndexAward[];
  branches: IndexBranch[];
  people: IndexPerson[];
}
