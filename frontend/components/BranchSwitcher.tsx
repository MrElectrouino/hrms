import React, { useEffect, useRef, useState } from 'react';
import { useBranch } from '../lib/branch';

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
    <path d="M14 10h5a1 1 0 0 1 1 1v10" />
    <path d="M2 21h20M8 8h2M8 12h2M8 16h2M17 14h.01M17 17h.01" />
  </svg>
);

const Chevron = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Header control that scopes lists to one branch, or to all the branches the account can use. */
export default function BranchSwitcher() {
  const { branches, restricted, selectedId, select } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (branches.length === 0) return null;

  const current = branches.find((b) => b.id === selectedId);
  const allLabel = restricted ? 'All my branches' : 'All branches';
  const label = current ? current.name : allLabel;
  // One branch and nothing to switch to: show it as a label.
  const single = branches.length === 1 && restricted;

  const item = (active: boolean) =>
    `flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 ${active ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'}`;

  return (
    <div ref={ref} className="relative" title="Branch">
      <button
        type="button"
        onClick={() => !single && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Branch: ${label}`}
        className={`flex h-[38px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm ${single ? 'cursor-default' : 'hover:bg-gray-50'}`}
      >
        <BuildingIcon className="h-[18px] w-[18px] text-blue-600" />
        <span className="max-w-[9rem] truncate">{label}</span>
        {!single && <Chevron className="h-3.5 w-3.5 text-gray-500" />}
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 z-40 mt-2 max-h-80 w-60 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {(!restricted || branches.length > 1) && (
            <li>
              <button type="button" role="option" aria-selected={selectedId === null} onClick={() => { select(null); setOpen(false); }} className={item(selectedId === null)}>
                {allLabel}
                {selectedId === null && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          )}
          {branches.map((b) => (
            <li key={b.id}>
              <button type="button" role="option" aria-selected={selectedId === b.id} onClick={() => { select(b.id); setOpen(false); }} className={item(selectedId === b.id)}>
                <span className="truncate">{b.name}</span>
                <span className="shrink-0 text-xs text-gray-400">{b.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
