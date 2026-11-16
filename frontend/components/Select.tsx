import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  /** Small grey text after the label (for example the branch). */
  hint?: string;
  disabled?: boolean;
}

interface BaseProps {
  id?: string;
  /** Classes for the closed control, so it can look like the inputs around it. */
  className?: string;
  disabled?: boolean;
  /** Blocks submitting a form while nothing is chosen. */
  required?: boolean;
  title?: string;
  'aria-label'?: string;
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /** Search box in the list. Default: shown when there are more than 7 options. */
  searchable?: boolean;
  /** Text above the control. */
  label?: string;
}

/** Choose one. Works like a native <select>: pass <option> children, or an `options` list. */
interface SingleProps extends BaseProps {
  multiple?: false;
  value?: string | number | null;
  /** Receives an event-like object, so `(e) => set(e.target.value)` works as before. */
  onChange?: (e: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
}

/** Choose several: stays open while ticking, with "tick all shown" and "clear". */
interface MultiProps extends BaseProps {
  multiple: true;
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: SelectOption[];
  /** Shown when nothing is ticked and that means "everything" (for example all branches). */
  allText?: string;
  /** Word after the count when more than two are ticked ("3 branches"). */
  noun?: string;
}

export type SelectProps = SingleProps | MultiProps;

const textOf = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
};

/** Reads <option> children (also inside fragments, arrays and .map results) into an options list. */
function optionsFromChildren(children: React.ReactNode, out: SelectOption[] = []): SelectOption[] {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    const props = c.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    if (c.type === React.Fragment) optionsFromChildren(props.children, out);
    else if (c.type === 'option') {
      const label = textOf(props.children);
      out.push({ value: props.value === undefined ? label : String(props.value), label, disabled: props.disabled });
    }
  });
  return out;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
);

const DEFAULT_TRIGGER =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50';

/**
 * The one dropdown for the whole application: choose one or several, with search.
 * Replaces the browser's own <select> so every list looks and behaves the same.
 */
export default function Select(props: SelectProps) {
  const { id, className, disabled, required, title, placeholder = 'Select…', label } = props;
  const multiple = props.multiple === true;
  const options = useMemo(
    () => (props.options ?? (multiple ? [] : optionsFromChildren((props as SingleProps).children))),
    // children change on every render; compare by content so the list is not rebuilt for nothing
    // eslint-disable-next-line react-hooks/exhaustive-deps
    multiple ? [props.options] : [props.options, JSON.stringify(optionsFromChildren((props as SingleProps).children))],
  );
  const selectedValues: string[] = multiple ? (props as MultiProps).values : [String((props as SingleProps).value ?? '')];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLInputElement>(null);

  const searchable = props.searchable ?? options.length > 7;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 240 && above > below;
    const width = Math.max(r.width, 192);
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - width - 8));
    setPos(up ? { left, width, bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(360, above) } : { left, width, top: r.bottom + 4, maxHeight: Math.min(360, below) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (trigger.current?.contains(t) || panel.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const first = options.findIndex((o) => selectedValues.includes(o.value));
    setActive(first >= 0 ? first : 0);
    // focus the search box, or the list so the keyboard works
    setTimeout(() => (searchBox.current ?? panel.current)?.focus(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };

  const chooseOne = (v: string) => {
    const p = props as SingleProps;
    p.onValueChange?.(v);
    p.onChange?.({ target: { value: v } });
    close();
  };
  const toggleMany = (v: string) => {
    const p = props as MultiProps;
    p.onValuesChange(selectedValues.includes(v) ? selectedValues.filter((x) => x !== v) : [...selectedValues, v]);
  };
  const allShownChosen = multiple && shown.length > 0 && shown.every((o) => selectedValues.includes(o.value));
  const toggleShown = () => {
    const p = props as MultiProps;
    p.onValuesChange(allShownChosen ? selectedValues.filter((v) => !shown.some((o) => o.value === v)) : [...new Set([...selectedValues, ...shown.map((o) => o.value)])]);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    // Escape closes only this list, not a dialog it is inside of (React events bubble through the portal)
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const o = shown[active];
      if (o && !o.disabled) (multiple ? toggleMany(o.value) : chooseOne(o.value));
    }
  };

  useEffect(() => {
    if (open) panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const summary = (() => {
    if (multiple) {
      const p = props as MultiProps;
      if (p.values.length === 0) return p.allText || placeholder;
      if (p.values.length <= 2) return p.values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ');
      return `${p.values.length} ${p.noun ?? 'selected'}`;
    }
    const v = selectedValues[0];
    return options.find((o) => o.value === v)?.label ?? (v || placeholder);
  })();
  const isPlaceholder = multiple ? (props as MultiProps).values.length === 0 : !selectedValues[0] || !options.some((o) => o.value === selectedValues[0] && o.label.trim() && !/^(…|\.\.\.|select…?)$/i.test(o.label.trim()));

  const cls = className ?? DEFAULT_TRIGGER;
  const display = /\b(block|w-|flex)/.test(cls) ? 'flex' : 'inline-flex';
  const hasValue = selectedValues.some((v) => v !== '');

  return (
    <div className={label ? 'relative' : 'contents'}>
      {label && <span className="text-xs font-medium text-gray-600">{label}</span>}
      <button
        ref={trigger}
        id={id}
        type="button"
        title={title}
        aria-label={props['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}
        className={`${cls} ${display} items-center justify-between gap-2 text-left ${label ? 'mt-1.5' : ''}`}
      >
        <span className={`min-w-0 truncate ${isPlaceholder ? 'text-gray-500' : ''}`}>{summary}</span>
        <Chevron open={open} />
      </button>
      {required && <input tabIndex={-1} aria-hidden="true" required value={hasValue ? 'x' : ''} onChange={() => {}} className="pointer-events-none absolute h-0 w-0 opacity-0" />}

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panel}
          tabIndex={-1}
          onKeyDown={onListKey}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight, zIndex: 80 }}
          className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-lg outline-none"
        >
          {searchable && (
            <div className="border-b border-gray-100 p-2">
              <input ref={searchBox} type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onListKey} placeholder="Search…" className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {multiple && (
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 text-xs">
              <button type="button" onClick={toggleShown} disabled={shown.length === 0} className="font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40">
                {allShownChosen ? 'Untick all shown' : `Tick all shown (${shown.length})`}
              </button>
              <button type="button" onClick={() => (props as MultiProps).onValuesChange([])} disabled={selectedValues.length === 0} className="font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40">Clear</button>
            </div>
          )}
          <ul role="listbox" aria-multiselectable={multiple || undefined} className="min-h-0 flex-1 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-3 text-gray-500">Nothing matches.</li>}
            {shown.map((o, i) => {
              const on = selectedValues.includes(o.value);
              return (
                <li key={`${o.value}-${i}`} role="option" aria-selected={on} data-index={i}>
                  {multiple ? (
                    <label className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-gray-800 ${i === active ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={on} onChange={() => toggleMany(o.value)} />
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint && <span className="shrink-0 text-xs text-gray-400">{o.hint}</span>}
                    </label>
                  ) : (
                    <button
                      type="button"
                      disabled={o.disabled}
                      onClick={() => chooseOne(o.value)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left disabled:opacity-40 ${i === active ? 'bg-gray-100' : ''} ${on ? 'font-medium text-blue-700' : 'text-gray-800'}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.label || ' '}</span>
                      {o.hint && <span className="shrink-0 text-xs text-gray-400">{o.hint}</span>}
                      {on && <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
