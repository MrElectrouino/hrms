import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const WIDTH = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type=hidden]), [tabindex]:not([tabindex="-1"])';

/**
 * A centred dialog for short tasks (a form, a confirmation). Use Drawer for long forms beside a list.
 * Closes with the X, the Escape key or a click outside, unless `busy` (something is being saved).
 * Dropdowns opened inside it float above it.
 */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  busy = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons, shown in a bar at the bottom. */
  footer?: React.ReactNode;
  size?: keyof typeof WIDTH;
  /** Blocks closing while true. */
  busy?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // focus the first field (or the dialog itself) so the keyboard works straight away
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]):not([type=checkbox]), textarea, select, button[aria-haspopup]');
      (first ?? panel.current)?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !busy) {
      // an open dropdown inside the dialog closes first
      if ((e.target as HTMLElement).closest('[role=listbox]')) return;
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab' && panel.current) {
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6" onKeyDown={onKeyDown}>
      <div className="fixed inset-0 bg-black/40" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`relative my-auto flex max-h-[calc(100vh-3rem)] w-full flex-col rounded-2xl bg-white shadow-xl outline-none ${WIDTH[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="-mr-2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
