import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import data from '../../fixtures/search-index.json';
import { createSearchEngine } from '@/lib/search/engine';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    void fill; // next/image-only prop
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(rest as object)} />;
  },
}));

const engine = createSearchEngine(data);
const loader = vi.hoisted(() => ({
  loadSearchEngine: vi.fn(),
  prefetchSearchEngine: vi.fn(),
}));
vi.mock('@/lib/search/loader', () => loader);

import MobileSearch from '@/components/search/MobileSearch';
import SearchBar from '@/components/search/SearchBar';
import { recordRecentPerson } from '@/lib/search/recent';

const input = () => screen.getByRole('combobox', { name: 'Search the memorial' });
const options = () => screen.getAllByRole('option');
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

async function typeInBar(text: string) {
  const user = userEvent.setup();
  render(<SearchBar shortcuts />);
  await user.click(input());
  if (text) await user.keyboard(text);
  await screen.findByRole('listbox');
  if (text) await waitFor(() => expect(screen.queryByText('Loading search…')).not.toBeInTheDocument());
  return user;
}

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  loader.loadSearchEngine.mockReset().mockResolvedValue(engine);
});

describe('SearchBar', () => {
  it('opens on focus with browse links and the Advanced Search footer', async () => {
    await typeInBar('');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(input()).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    await screen.findByText('Complete Index');
    const advanced = screen.getByRole('option', { name: /Advanced Search…/ });
    expect(advanced).toHaveAttribute('aria-selected', 'false');
    expect(within(screen.getByRole('listbox')).queryAllByRole('link')).toEqual([]); // no nested interactive content
    await userEvent.click(advanced);
    expect(push).toHaveBeenCalledWith('/memorial/search');
  });

  it('shows recently viewed people', async () => {
    recordRecentPerson(103);
    await typeInBar('');
    const recent = await screen.findByRole('group', { name: 'Recently viewed' });
    expect(within(recent).getByText('Calvin Ross Jackson Jr.')).toBeInTheDocument();
  });

  it('groups live results with counts and highlights', async () => {
    await typeInBar('silver star');
    const awards = screen.getByRole('group', { name: 'Awards' });
    expect(within(awards).getByText('7 alumni have been awarded →')).toBeInTheDocument();
    const people = screen.getByRole('group', { name: 'People' });
    expect(within(people).getAllByRole('option')).toHaveLength(7); // 6 people + see all
    expect(within(people).getByText('See all 7 people →')).toBeInTheDocument();
    expect(screen.getByText('7 found')).toBeInTheDocument();
    expect(within(awards).getAllByText(/silver|star/i, { selector: 'mark' })).toHaveLength(2);
    expect(screen.getByText('7 people found.')).toHaveClass('sr-only');
  });

  it('shows a person row with details, icons, and a narrative snippet', async () => {
    await typeInBar('bastogne');
    const row = screen.getByRole('option', { name: /Charles Dunmore Fitch/ });
    expect(within(row).getByText("'44")).toBeInTheDocument();
    expect(within(row).getByText(/Private First Class USA · World War II · d\. December 24, 1944/)).toBeInTheDocument();
    expect(within(row).getByText('Bastogne', { selector: 'mark' })).toBeInTheDocument();
    expect(within(row).getByText('Award recipient.')).toBeInTheDocument();
  });

  it('shows the unit when that is what matched', async () => {
    await typeInBar('lafayette');
    const row = screen.getByRole('option', { name: /George Wendell Rowan/ });
    expect(within(row).getByText('Lafayette', { selector: 'mark' }).parentElement).toHaveTextContent('N 124 Lafayette Escadrille');
  });

  it('says when nothing matches', async () => {
    await typeInBar('zzzzzz');
    expect(screen.getByText('No matches for “zzzzzz”.')).toBeInTheDocument();
    expect(options()).toHaveLength(1);
  });

  it('moves the active row with arrow keys, wrapping both ways', async () => {
    const user = await typeInBar('vietnam');
    expect(input()).not.toHaveAttribute('aria-activedescendant');
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toBe(options()[0]);
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(activeOption()).toBe(options().at(-1));
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toBe(options()[0]);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(activeOption()).toBe(options().at(-2));
  });

  it('follows the mouse and lets the keyboard continue from there', async () => {
    const user = await typeInBar('vietnam');
    await user.hover(options()[2]);
    expect(activeOption()).toBe(options()[2]);
    expect(options()[2]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toBe(options()[3]);
  });

  it('Enter opens the active row', async () => {
    const user = await typeInBar('vietnam');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/memorial/conflict/4');
    expect(input()).toHaveValue('');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter with nothing active goes to Advanced Search with the query', async () => {
    const user = await typeInBar('silver star');
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/memorial/search?q=silver+star');
  });

  it('Escape closes, then clears, then leaves the field', async () => {
    const user = await typeInBar('marines');
    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('marines');
    await user.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    await user.keyboard('{Escape}');
    expect(input()).not.toHaveFocus();
  });

  it('ArrowDown reopens a closed list', async () => {
    const user = await typeInBar('marines');
    await user.keyboard('{Escape}{ArrowDown}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  it('Tab turns the active facet into a chip; Backspace removes it', async () => {
    const user = await typeInBar('silver star');
    await user.keyboard('{ArrowDown}{Tab}');
    expect(screen.getByText('Silver Star', { selector: 'span' }).parentElement).toHaveTextContent('Award: Silver Star');
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    await user.keyboard('marines');
    const people = await screen.findByRole('group', { name: 'People' });
    expect(within(people).getAllByRole('option')).toHaveLength(2);
    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/memorial/search?q=marines&award=7');
  });

  it('Backspace on an empty field removes the last chip', async () => {
    const user = await typeInBar('vietnam');
    await user.keyboard('{ArrowDown}{Tab}');
    expect(screen.getByRole('button', { name: 'Remove filter: Vietnam War' })).toBeInTheDocument();
    await user.keyboard('{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove filter: Vietnam War' })).not.toBeInTheDocument();
  });

  it('Tab on a person row just leaves the bar', async () => {
    const user = await typeInBar('bastogne');
    await user.keyboard('{ArrowDown}{Tab}');
    expect(screen.queryByRole('button', { name: /Remove filter/ })).not.toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('the + Filter affordance and chip remove button work with the mouse', async () => {
    const user = await typeInBar('marines');
    const branch = screen.getByRole('option', { name: /U.S. Marine Corps/ });
    expect(branch).toHaveAccessibleDescription('Press Tab to add as a search filter.');
    await user.click(screen.getByTestId('filter-branch:MARINES'));
    expect(push).not.toHaveBeenCalled();
    const remove = screen.getByRole('button', { name: 'Remove filter: U.S. Marine Corps' });
    expect(screen.getByRole('group', { name: 'People' })).toBeInTheDocument();
    await user.click(remove);
    expect(screen.queryByRole('button', { name: /Remove filter/ })).not.toBeInTheDocument();
  });

  it('does not add the same chip twice', async () => {
    const user = await typeInBar('marines');
    await user.click(screen.getByTestId('filter-branch:MARINES'));
    await user.keyboard('marine corps');
    await screen.findByRole('group', { name: 'People' });
    expect(screen.queryByRole('group', { name: 'Branches' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove filter/ })).toHaveLength(1);
  });

  it('clicking a row navigates and finishes the search', async () => {
    const user = await typeInBar('vietnam');
    await user.click(screen.getByRole('option', { name: /^Vietnam War/ }));
    expect(push).toHaveBeenCalledWith('/memorial/conflict/4');
    expect(input()).toHaveValue('');
  });

  it('modifier and middle clicks open the row in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const user = await typeInBar('vietnam');
    const row = screen.getByRole('option', { name: /^Vietnam War/ });
    await user.keyboard('{Control>}');
    await user.click(row);
    await user.keyboard('{/Control}');
    await user.pointer({ keys: '[MouseMiddle]', target: row });
    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith('/memorial/conflict/4', '_blank', 'noopener');
    expect(push).not.toHaveBeenCalled();
    expect(input()).toHaveValue('vietnam');
    open.mockRestore();
  });

  it('clear button empties query and chips', async () => {
    const user = await typeInBar('vietnam');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('closes when clicking elsewhere', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchBar />
        <button>elsewhere</button>
      </>,
    );
    await user.click(input());
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('focus shortcuts: Ctrl+K anywhere, "/" when not typing', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SearchBar shortcuts />
        <input aria-label="other" />
      </>,
    );
    await user.keyboard('{Control>}k{/Control}');
    expect(input()).toHaveFocus();
    await user.click(screen.getByLabelText('other'));
    await user.keyboard('/');
    expect(screen.getByLabelText('other')).toHaveFocus();
    expect(screen.getByLabelText('other')).toHaveValue('/');
    await user.click(document.body);
    await user.keyboard('/');
    expect(input()).toHaveFocus();
  });

  it('no shortcuts unless asked', async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.keyboard('{Control>}k{/Control}');
    expect(input()).not.toHaveFocus();
  });

  it('shows loading, then a retry when the index fails', async () => {
    let fail: (e: Error) => void = () => {};
    loader.loadSearchEngine.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
    const user = userEvent.setup();
    render(<SearchBar />);
    await user.click(input());
    expect(screen.getByText('Loading search…', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Advanced Search/ })).toBeInTheDocument();
    await act(async () => fail(new Error('down')));
    expect(await screen.findByText(/Search is unavailable right now/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Complete Index');
  });

  it('Enter on an empty bar does nothing', async () => {
    const user = await typeInBar('');
    await user.keyboard('{Enter}');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('MobileSearch', () => {
  it('opens a full-screen sheet and closes on Cancel or Escape', async () => {
    const user = userEvent.setup();
    render(<MobileSearch />);
    await user.click(screen.getByRole('button', { name: 'Search the memorial' }));
    const dialog = screen.getByRole('dialog', { name: 'Search the memorial' });
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(within(dialog).getByRole('combobox')).toHaveFocus());
    expect(within(dialog).getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('vietnam');
    await user.keyboard('{Escape}'); // clears first
    expect(within(dialog).getByRole('combobox')).toHaveValue('');
    await user.keyboard('{Escape}'); // then closes
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Search the memorial' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes after choosing a result', async () => {
    const user = userEvent.setup();
    render(<MobileSearch />);
    await user.click(screen.getByRole('button', { name: 'Search the memorial' }));
    await user.keyboard('vietnam');
    await screen.findByRole('group', { name: 'Conflicts' });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/memorial/conflict/4');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
