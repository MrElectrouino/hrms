import React from 'react';
import { BranchOption } from '../lib/api';

/** Which branches an account may work in: all of them, or a chosen few. */
export default function BranchAccessPicker({
  branches,
  allBranches,
  branchIds,
  onChange,
}: {
  branches: BranchOption[];
  allBranches: boolean;
  branchIds: number[];
  onChange: (next: { allBranches: boolean; branchIds: number[] }) => void;
}) {
  const active = branches;
  const toggle = (id: number) =>
    onChange({ allBranches: false, branchIds: branchIds.includes(id) ? branchIds.filter((x) => x !== id) : [...branchIds, id] });

  return (
    <fieldset className="rounded-lg border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">Branch access</legend>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={allBranches}
          onChange={(e) => onChange({ allBranches: e.target.checked, branchIds: e.target.checked ? [] : branchIds })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        All branches
      </label>
      {!allBranches && (
        <div className="mt-2 max-h-44 space-y-1 overflow-auto pl-1">
          {active.length === 0 && <p className="text-xs text-gray-500">No branches yet. Add them in Masters → Parameters → Branch.</p>}
          {active.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={branchIds.includes(b.id)}
                onChange={() => toggle(b.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {b.name} <span className="text-xs text-gray-400">{b.code}</span>
            </label>
          ))}
          {branchIds.length === 0 && active.length > 0 && <p className="pt-1 text-xs text-amber-700">Pick at least one branch.</p>}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">The account can only see and change employees and documents in these branches. System Admins always see every branch.</p>
    </fieldset>
  );
}
