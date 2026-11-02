import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine } from '@/lib/search/engine';
import { emptyFilters } from '@/lib/search/filters';

let params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push: vi.fn() }),
}));

const engine = createSearchEngine(data);
const loader = vi.hoisted(() => ({ loadSearchEngine: vi.fn(), prefetchSearchEngine: vi.fn() }));
vi.mock('@/lib/search/loader', () => loader);

import { activeFilters } from '@/components/search/ActiveFilters';
import AdvancedSearch from '@/components/search/AdvancedSearch';

const found = () => screen.getByText(/^Found \d+ (person|people)$/).textContent;
const resultNames = () => screen.queryAllByRole('heading', { level: 3 }).map(h => h.textContent);
const url = () => new URLSearchParams(window.location.search);

async function renderAt(query = '') {
  params = new URLSearchParams(query);
  window.history.replaceState(null, '', `/memorial/search${query ? `?${query}` : ''}`);
  const user = userEvent.setup();
  const view = render(<AdvancedSearch />);
  await screen.findByText(/^Found/);
  return { user, ...view };
}

const fieldset = (name: string) => screen.getByRole('group', { name });

beforeEach(() => {
  loader.loadSearchEngine.mockReset().mockResolvedValue(engine);
  sessionStorage.clear();
});

describe('AdvancedSearch', () => {
  it('lists everyone without a query, paginated', async () => {
    await renderAt();
    expect(found()).toBe('Found 40 people');
    expect(resultNames()).toHaveLength(25);
    expect(resultNames()[0]).toMatch(/^John Mercer Abernathy/);
  });

  it('reads the query and filters from the URL', async () => {
    await renderAt('q=silver+star&branch=MARINES');
    expect(found()).toBe('Found 2 people');
    expect(screen.getByLabelText('Keywords')).toHaveValue('silver star');
    expect(within(fieldset('Branch')).getByRole('checkbox', { name: /U.S. Marine Corps/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Remove filter: Branch: U.S. Marine Corps' })).toBeInTheDocument();
  });

  it('updates live as you type and mirrors to the URL', async () => {
    const { user } = await renderAt();
    await user.type(screen.getByLabelText('Keywords'), 'bastogne');
    await waitFor(() => expect(found()).toBe('Found 1 person'));
    expect(url().get('q')).toBe('bastogne');
    expect(screen.getByText('Bastogne', { selector: 'mark' })).toBeInTheDocument();
  });

  it('facet checkboxes filter and show counts that ignore their own dimension', async () => {
    const { user } = await renderAt();
    await user.click(within(fieldset('Conflict')).getByRole('checkbox', { name: /Vietnam War/ }));
    expect(found()).toBe('Found 6 people');
    expect(url().get('conflict')).toBe('4');
    // Other conflicts still show their own totals while Vietnam is selected.
    const ww2 = within(fieldset('Conflict')).getByText('World War II').closest('label')!;
    expect(ww2).toHaveTextContent('10');
    await user.click(within(fieldset('Branch')).getByRole('checkbox', { name: /U.S. Marine Corps/ }));
    expect(found()).toBe('Found 2 people');
    await user.click(screen.getByRole('button', { name: 'Remove filter: Conflict: Vietnam War' }));
    expect(found()).toBe('Found 6 people');
    expect(url().get('conflict')).toBeNull();
  });

  it('award filters', async () => {
    const { user } = await renderAt();
    await user.click(within(fieldset('Awards')).getByRole('checkbox', { name: /Croix de Guerre/ }));
    expect(found()).toBe('Found 2 people');
    await user.click(within(fieldset('Awards')).getByRole('checkbox', { name: /Any award/ }));
    expect(found()).toBe('Found 14 people');
    expect(url().get('award')).toBe('any');
    expect(within(fieldset('Awards')).queryByRole('checkbox', { name: /Croix de Guerre/ })).not.toBeInTheDocument();
  });

  it('search scopes, never all off', async () => {
    const { user } = await renderAt('q=jackson');
    expect(found()).toBe('Found 3 people');
    await user.click(screen.getByRole('checkbox', { name: 'Names & class year' }));
    expect(found()).toBe('Found 1 person');
    expect(url().get('in')).toBe('service,cod');
    await user.click(screen.getByRole('checkbox', { name: /^Service/ }));
    expect(screen.getByRole('checkbox', { name: 'Circumstances of death' })).toBeDisabled();
  });

  it('unit filter with suggestions', async () => {
    const { user } = await renderAt();
    const unit = screen.getByLabelText('Unit');
    await user.type(unit, '1st bn 7th marines');
    expect(document.querySelector(`#${CSS.escape(unit.getAttribute('list')!)} option`)).toHaveAttribute(
      'value',
      '1st Battalion, 7th Marines',
    );
    await user.keyboard('{Enter}');
    expect(found()).toBe('Found 3 people');
    expect(unit).toHaveValue('');
    expect(url().get('unit')).toBe('1st bn 7th marines');
    await user.click(screen.getByRole('button', { name: 'Remove unit: 1st bn 7th marines' }));
    expect(found()).toBe('Found 40 people');
    await user.type(unit, '4th Cavalry');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(found()).toBe('Found 1 person');
  });

  it('rank, class year range, dates and documents', async () => {
    const { user } = await renderAt();
    await user.type(screen.getByLabelText('Rank'), 'colonel');
    expect(found()).toBe('Found 3 people');
    await user.clear(screen.getByLabelText('Rank'));
    await user.type(screen.getByLabelText('Class year from'), '1960');
    await user.type(screen.getByLabelText('Class year to'), '1966');
    expect(found()).toBe('Found 5 people'); // classes of '62–'66
    expect(screen.getByText('Class 1960–1966')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove filter: Class 1960–1966' }));
    await user.type(screen.getByLabelText('Died on or after'), '1968-01-01');
    await user.type(screen.getByLabelText('Died on or before'), '1968-12-31');
    expect(found()).toBe('Found 2 people');
    await user.click(screen.getByRole('checkbox', { name: 'No date recorded' }));
    expect(found()).toBe('Found 1 person');
    expect(screen.getByLabelText('Died on or after')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    await user.click(screen.getByRole('checkbox', { name: 'Memorial Document Available' }));
    expect(found()).toBe('Found 10 people');
  });

  it('sorts', async () => {
    const { user } = await renderAt();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'class_year');
    expect(resultNames()[0]).toMatch(/^Thomas Bell Sanford/);
    expect(url().get('sort')).toBe('class_year');
  });

  it('pages through results and keeps the page in the URL', async () => {
    const { user } = await renderAt();
    await user.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    expect(resultNames()).toHaveLength(15);
    expect(url().get('page')).toBe('2');
    await user.selectOptions(screen.getAllByRole('combobox', { name: /per page/i })[0], '50');
    expect(resultNames()).toHaveLength(40);
    expect(url().get('per')).toBe('50');
    expect(url().get('page')).toBeNull();
  });

  it('re-syncs when the URL changes from outside (the header bar)', async () => {
    const { rerender } = await renderAt('q=vietnam');
    expect(found()).toBe('Found 6 people');
    params = new URLSearchParams('award=7&page=1');
    rerender(<AdvancedSearch />);
    await waitFor(() => expect(found()).toBe('Found 7 people'));
    expect(screen.getByLabelText('Keywords')).toHaveValue('');
  });

  it('no results, and clearing everything', async () => {
    const { user } = await renderAt('q=zzzzzz&branch=MARINES');
    expect(screen.getByText('No results found matching your criteria.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters and try again' }));
    expect(found()).toBe('Found 40 people');
    expect(window.location.search).toBe('');
  });

  it('Clear Filters resets scopes too', async () => {
    const { user } = await renderAt('q=jackson&in=cod');
    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.getByRole('checkbox', { name: 'Names & class year' })).toBeChecked();
    expect(found()).toBe('Found 40 people');
  });

  it('shows failure with a retry', async () => {
    loader.loadSearchEngine.mockReset().mockRejectedValueOnce(new Error('down')).mockResolvedValue(engine);
    params = new URLSearchParams();
    const user = userEvent.setup();
    render(<AdvancedSearch />);
    expect(await screen.findByText('Search is unavailable right now.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Found 40 people')).toBeInTheDocument();
  });

  it('shows loading before the engine arrives', async () => {
    let resolve: (e: typeof engine) => void = () => {};
    loader.loadSearchEngine.mockReset().mockReturnValue(new Promise(r => (resolve = r)));
    params = new URLSearchParams();
    render(<AdvancedSearch />);
    expect(screen.getByText('Loading the memorial…')).toBeInTheDocument();
    await act(async () => resolve(engine));
    expect(await screen.findByText('Found 40 people')).toBeInTheDocument();
  });

  it('toggles the filter panel on small screens', async () => {
    const { user } = await renderAt();
    const toggle = screen.getByRole('button', { name: 'Show' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('activeFilters', () => {
  it('labels every kind of filter and removes just that one', () => {
    const filters = {
      ...emptyFilters(),
      conflicts: [4], branches: ['MARINES'], awards: [7], anyAward: true, units: ['7th Marines'], rank: ' captain ',
      classYears: [1966], classYearFrom: 1960, classYearTo: null, dateTo: '1970-01-01', hasDocument: true,
    };
    const items = activeFilters(filters, engine);
    expect(items.map(i => i.label)).toEqual([
      'Conflict: Vietnam War', 'Branch: U.S. Marine Corps', 'Any award', 'Award: Silver Star', 'Unit: 7th Marines',
      'Rank: captain', 'Class of 1966', 'Class 1960–…', 'Died … – 1970-01-01', 'Memorial document available',
    ]);
    expect(items[0].without.conflicts).toEqual([]);
    expect(items[0].without.branches).toEqual(['MARINES']);
    expect(activeFilters({ ...emptyFilters(), noDate: true, dateFrom: 'x' }, null).map(i => i.label)).toEqual([
      'No date of death recorded',
    ]);
    expect(activeFilters({ ...emptyFilters(), conflicts: [99], branches: ['X'], awards: [98] }, null).map(i => i.label)).toEqual([
      'Conflict: 99', 'Branch: X', 'Award: 98',
    ]);
  });
});
