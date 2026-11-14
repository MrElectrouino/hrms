import React from 'react';

/** A coloured status label. The colour comes from the status list in the configuration. */
export default function StatusBadge({ name, color, approved }: { name: string; color: string; approved?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium" style={{ borderColor: `${color}55`, backgroundColor: `${color}14`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
      {approved === false && <span className="text-[10px] opacity-70">· pending</span>}
    </span>
  );
}
