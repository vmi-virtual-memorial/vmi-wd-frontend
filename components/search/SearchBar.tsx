'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { getRecentPeople } from '@/lib/search/recent';
import { type Chip, type Row, CHIP_PREFIX, advancedHref, buildDropdown, chipKey, flattenRows } from '@/lib/search/rows';
import RowContent from './RowContent';
import { useSearchEngine } from './useSearchEngine';

interface SearchBarProps {
  /** 'inline' sits in the header; 'sheet' fills the mobile search dialog. */
  variant?: 'inline' | 'sheet';
  /** Register the ⌘K / Ctrl+K and "/" focus shortcuts (one instance per page). */
  shortcuts?: boolean;
  /** Called after navigating away, or on Esc in an empty sheet. */
  onClose?: () => void;
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function SearchIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function SearchBar({ variant = 'inline', shortcuts = false, onClose }: SearchBarProps) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = useCallback((i: number) => `${baseId}-option-${i}`, [baseId]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollActiveIntoView = useRef(false);

  const sheet = variant === 'sheet';
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<Chip[]>([]);
  const [open, setOpen] = useState(sheet);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<number[]>([]);
  const [modKey, setModKey] = useState('Ctrl ');
  const deferredQuery = useDeferredValue(query);
  const { engine, failed, retry } = useSearchEngine(open);

  const model = useMemo(
    () => (engine ? buildDropdown(engine, deferredQuery, chips, recent) : null),
    [engine, deferredQuery, chips, recent],
  );
  const fallbackFooter = useMemo<Row[]>(
    () => [{ kind: 'link', id: 'advanced', href: advancedHref(query, chips), terms: [], label: 'Advanced Search…' }],
    [query, chips],
  );
  const rows = useMemo(() => (model ? flattenRows(model) : fallbackFooter), [model, fallbackFooter]);
  const rowIndex = useMemo(() => new Map(rows.map((r, i) => [r.id, i])), [rows]);

  // New results: nothing is active until the visitor moves.
  useEffect(() => setActive(-1), [deferredQuery, chips]);

  useEffect(() => {
    if (!scrollActiveIntoView.current || active < 0) return;
    scrollActiveIntoView.current = false;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  }, [active, optionId]);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setModKey('⌘');
  }, []);

  useEffect(() => {
    if (sheet) {
      inputRef.current?.focus();
      setRecent(getRecentPeople());
    }
  }, [sheet]);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const finish = useCallback(() => {
    setQuery('');
    setChips([]);
    close();
    inputRef.current?.blur();
    onClose?.();
  }, [close, onClose]);

  const go = (href: string) => {
    router.push(href);
    finish();
  };

  const addChip = (chip: Chip) => {
    setChips(current => (current.some(c => chipKey(c) === chipKey(chip)) ? current : [...current, chip]));
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const removeChip = (chip: Chip) => {
    setChips(current => current.filter(c => chipKey(c) !== chipKey(chip)));
    inputRef.current?.focus();
  };

  const clear = () => {
    setQuery('');
    setChips([]);
    inputRef.current?.focus();
  };

  const openList = () => {
    if (!open) setRecent(getRecentPeople());
    setOpen(true);
  };

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open || sheet) return;
    const onPointerDown = (e: Event) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, sheet, close]);

  // ⌘K / Ctrl+K anywhere, or "/" when not typing, focuses the bar.
  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const combo = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
      if (!combo && !slash) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const count = rows.length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!open) return openList();
        scrollActiveIntoView.current = true;
        const down = e.key === 'ArrowDown';
        setActive(i => (down ? (i + 1) % count : i <= 0 ? count - 1 : i - 1));
        return;
      }
      case 'Enter': {
        if (e.nativeEvent.isComposing) return;
        e.preventDefault();
        const row = open ? rows[active] : undefined;
        if (row) go(row.href);
        else if (query.trim() || chips.length) go(advancedHref(query, chips));
        return;
      }
      case 'Tab': {
        const row = open ? rows[active] : undefined;
        if (row && 'chip' in row && !e.shiftKey) {
          e.preventDefault();
          addChip(row.chip);
        } else if (!sheet) {
          close();
        }
        return;
      }
      case 'Escape':
        e.preventDefault();
        if (open && !sheet) close();
        else if (query || chips.length) clear();
        else {
          inputRef.current?.blur();
          onClose?.();
        }
        return;
      case 'Backspace': {
        const input = e.currentTarget;
        if (!query && chips.length && input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault();
          setChips(current => current.slice(0, -1));
        }
        return;
      }
    }
  };

  const status = !open
    ? ''
    : failed
      ? 'Search is unavailable.'
      : !model
        ? 'Loading search…'
        : model.empty
          ? 'No matches.'
          : deferredQuery.trim() || chips.length
            ? `${model.peopleCount} ${model.peopleCount === 1 ? 'person' : 'people'} found.`
            : '';

  const renderOption = (row: Row) => {
    const i = rowIndex.get(row.id)!;
    const isActive = i === active;
    return (
      <li
        key={row.id}
        id={optionId(i)}
        role="option"
        aria-selected={isActive}
        onMouseMove={() => i !== active && setActive(i)}
        onMouseDown={e => e.preventDefault() /* keep focus in the input */}
        className={`group relative flex items-center border-l-4 ${isActive ? 'bg-vmi-light-gold border-vmi-red' : 'border-transparent'}`}
      >
        <Link href={row.href} tabIndex={-1} onClick={finish} className="block min-w-0 flex-1 px-4 py-2 hover:no-underline">
          <RowContent row={row} engine={engine} />
        </Link>
        {'chip' in row && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => addChip(row.chip)}
            aria-label={`Filter by ${row.chip.label}`}
            title="Filter the search by this (Tab)"
            className={`mr-3 shrink-0 rounded border border-vmi-red px-2 py-0.5 text-xs font-semibold text-vmi-red hover:bg-vmi-red hover:text-white ${isActive ? 'visible' : 'invisible group-hover:visible'}`}
          >
            + Filter
          </button>
        )}
      </li>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${sheet ? 'flex h-full flex-col' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 shadow-inner focus-within:ring-2 focus-within:ring-vmi-gold">
          <SearchIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
          {chips.map(chip => (
            <span key={chipKey(chip)} className="inline-flex max-w-full items-center gap-1 rounded-full bg-vmi-red py-0.5 pl-2.5 pr-1 text-sm text-white">
              <span className="truncate">
                <span className="text-white/75">{CHIP_PREFIX[chip.kind]}:</span> {chip.label}
              </span>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove filter: ${chip.label}`}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full hover:bg-white/20"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search the memorial"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder={chips.length ? 'Refine…' : 'Search names, units, awards, battles…'}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              openList();
            }}
            onFocus={openList}
            onClick={openList}
            onKeyDown={onKeyDown}
            className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none"
          />
          {query || chips.length ? (
            <button type="button" onClick={clear} aria-label="Clear search" className="px-1 text-gray-500 hover:text-vmi-red">
              ✕
            </button>
          ) : (
            shortcuts && (
              <kbd aria-hidden="true" className="hidden rounded border border-gray-300 px-1.5 text-xs text-gray-500 lg:inline">
                {modKey}K
              </kbd>
            )
          )}
        </div>
        {sheet && (
          <button type="button" onClick={onClose} className="px-1 py-2 font-semibold text-vmi-red">
            Cancel
          </button>
        )}
      </div>

      {open && (
        <div
          className={
            sheet
              ? 'mt-3 min-h-0 flex-1 overflow-y-auto'
              : 'absolute left-0 top-full z-50 mt-2 w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-2xl'
          }
        >
          <ul id={listboxId} role="listbox" aria-label="Search suggestions" className={sheet ? 'py-2' : 'max-h-[70vh] overflow-y-auto py-2'}>
            {!model && (
              <li role="presentation" className="px-4 py-3 text-gray-500">
                {failed ? (
                  <>
                    Search is unavailable right now.{' '}
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={retry} className="font-semibold text-vmi-red underline">
                      Try again
                    </button>
                  </>
                ) : (
                  'Loading search…'
                )}
              </li>
            )}
            {model?.empty && (
              <li role="presentation" className="px-4 py-3 text-gray-600">
                No matches for “{deferredQuery.trim()}”.
              </li>
            )}
            {model?.groups.map(group => (
              <li key={group.key} role="presentation">
                <div className="flex justify-between px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <span id={`${baseId}-group-${group.key}`}>{group.label}</span>
                  {group.note && <span className="font-normal normal-case tracking-normal">{group.note}</span>}
                </div>
                <ul role="group" aria-labelledby={`${baseId}-group-${group.key}`}>
                  {group.rows.map(renderOption)}
                </ul>
              </li>
            ))}
            <li role="presentation" aria-hidden="true" className="my-2 border-t border-gray-200" />
            {(model?.footer ?? fallbackFooter).map(renderOption)}
          </ul>
          {!sheet && (
            <div aria-hidden="true" className="hidden gap-4 border-t border-gray-100 bg-gray-50 px-4 py-1.5 text-xs text-gray-500 md:flex">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>Tab filter</span>
              <span>Esc close</span>
            </div>
          )}
        </div>
      )}
      <div aria-live="polite" className="sr-only">
        {status}
      </div>
    </div>
  );
}
