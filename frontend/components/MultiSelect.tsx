import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiOption {
  value: string;
  label: string;
  /** Small grey text after the label (for example the branch). */
  hint?: string;
}

/**
 * A dropdown where several options can be ticked. Has a search box, "select all shown" and "clear",
 * closes on a click outside or Escape. The chosen values are reported as a list of option values.
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select…',
  allText = 'All',
  noun = 'selected',
  searchable = true,
  disabled = false,
}: {
  label: string;
  options: MultiOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Shown when nothing is ticked and that means "everything" (for example all branches). Omit when nothing means nothing. */
  allText?: string;
  noun?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const chosen = useMemo(() => new Set(selected), [selected]);
  const allShownChosen = shown.length > 0 && shown.every((o) => chosen.has(o.value));

  const toggle = (v: string) => onChange(chosen.has(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const toggleShown = () => {
    if (allShownChosen) onChange(selected.filter((v) => !shown.some((o) => o.value === v)));
    else onChange([...new Set([...selected, ...shown.map((o) => o.value)])]);
  };

  const summary =
    selected.length === 0
      ? allText || placeholder
      : selected.length <= 2
        ? selected.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')
        : `${selected.length} ${noun}`;

  return (
    <div className="relative" ref={box}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-gray-500' : ''}`}>{summary}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[16rem] rounded-xl border border-gray-200 bg-white shadow-lg">
          {searchable && (
            <div className="border-b border-gray-100 p-2">
              <input autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 text-xs">
            <button type="button" onClick={toggleShown} disabled={shown.length === 0} className="font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40">
              {allShownChosen ? 'Untick all shown' : `Tick all shown (${shown.length})`}
            </button>
            <button type="button" onClick={() => onChange([])} disabled={selected.length === 0} className="font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40">Clear</button>
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-64 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">Nothing matches.</li>}
            {shown.map((o) => (
              <li key={o.value} role="option" aria-selected={chosen.has(o.value)}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs text-gray-400">{o.hint}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
