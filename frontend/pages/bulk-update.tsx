import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { BranchOption, getBranches } from '../lib/api';
import { BulkEmployee, BulkField, BulkResult, applyBulkUpdate, getBulkEmployees, getBulkFields } from '../lib/bulk-api';
import { fieldClass } from '../components/Drawer';

type Draft = { on: boolean; value: string; clear: boolean };

/** HR and System Admin: change the same fields for many employees at once. */
export default function BulkUpdatePage() {
  const { isAuthenticated } = useAuth();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchIds, setBranchIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<BulkEmployee[]>([]);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [fields, setFields] = useState<BulkField[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BulkResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getBranches().then((r) => setBranches(r.data)).catch(() => {});
    getBulkFields().then((r) => setFields(r.data)).catch((e: any) => setError(e.message || 'Could not load the fields'));
  }, [isAuthenticated]);

  // The employee list follows the branches and search (a short pause while typing).
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    const t = setTimeout(() => {
      getBulkEmployees(branchIds, search.trim())
        .then((r) => {
          setEmployees(r.data);
          // keep only the ticked people who are still in the list
          setChosen((prev) => new Set([...prev].filter((id) => r.data.some((e) => e.id === id))));
        })
        .catch((e: any) => setError(e.message || 'Could not load employees'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [isAuthenticated, branchIds, search]);

  const toggleBranch = (id: number) => setBranchIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const allShownChosen = employees.length > 0 && employees.every((e) => chosen.has(e.id));
  const toggleAll = () => setChosen(allShownChosen ? new Set() : new Set(employees.map((e) => e.id)));
  const toggleOne = (id: number) => setChosen((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const draft = (key: string): Draft => drafts[key] ?? { on: false, value: '', clear: false };
  const setDraft = (key: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [key]: { ...draft(key), ...patch } }));

  const changes = useMemo(
    () => fields.filter((f) => draft(f.key).on).map((f) => ({ field: f.key, value: draft(f.key).clear ? null : draft(f.key).value.trim() })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, drafts],
  );
  const missingValue = fields.find((f) => draft(f.key).on && !draft(f.key).clear && !draft(f.key).value.trim());
  const labelOf = (f: BulkField, value: string) => f.options.find((o) => o.value === value)?.label ?? value;

  const ask = () => {
    setError('');
    setResult(null);
    if (chosen.size === 0) return setError('Choose at least one employee');
    if (changes.length === 0) return setError('Tick at least one field to update');
    if (missingValue) return setError(`Give a value for ${missingValue.label}, or choose to clear it`);
    setConfirming(true);
  };

  const apply = async () => {
    setApplying(true);
    setError('');
    try {
      const r = await applyBulkUpdate([...chosen], changes);
      setResult(r.data);
      setConfirming(false);
      setChosen(new Set());
      setDrafts({});
      const list = await getBulkEmployees(branchIds, search.trim());
      setEmployees(list.data);
    } catch (e: any) {
      setConfirming(false);
      setError(e.message || 'Could not update');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk update</h2>
        <p className="mt-1 max-w-3xl text-gray-500">Choose the employees, tick the fields to change and give each its new value. Every chosen employee gets the same values. Only fields that suit a group are offered here; personal details, pay and dates are changed on the employee's own profile.</p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {result && (
        <div className={`rounded-lg border px-3.5 py-3 text-sm ${result.skipped.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-800'}`}>
          <p><b>{result.updated}</b> employee{result.updated === 1 ? '' : 's'} updated ({result.fields.join(', ')}).{result.skipped.length > 0 && ` ${result.skipped.length} skipped:`}</p>
          {result.skipped.length > 0 && <ul className="mt-1 list-disc pl-5">{result.skipped.map((s) => <li key={s.employeeId}>{s.code || `#${s.employeeId}`}: {s.reason}</li>)}</ul>}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">1. Choose employees</h3>
        <div className="mt-3 flex flex-wrap items-start gap-6">
          <div>
            <p className="text-xs font-medium text-gray-600">Branches <span className="font-normal text-gray-400">(none ticked = all)</span></p>
            <div className="mt-1.5 flex max-w-xl flex-wrap gap-2">
              {branches.map((b) => (
                <label key={b.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${branchIds.includes(b.id) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                  {b.name}
                </label>
              ))}
              {branches.length === 0 && <span className="text-sm text-gray-500">No branches yet.</span>}
            </div>
          </div>
          <label className="text-xs font-medium text-gray-600">Find
            <input type="search" placeholder="Name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1.5 block w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <div className="max-h-80 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-2.5"><input type="checkbox" aria-label="Choose everyone shown" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={allShownChosen} onChange={toggleAll} /></th>
                  <th className="px-4 py-2.5">Employee</th><th className="px-4 py-2.5">Branch</th><th className="px-4 py-2.5">Department</th><th className="px-4 py-2.5">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && employees.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>}
                {!loading && employees.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No employees match.</td></tr>}
                {employees.map((e) => (
                  <tr key={e.id} className={chosen.has(e.id) ? 'bg-blue-50/60' : ''}>
                    <td className="px-4 py-2"><input type="checkbox" aria-label={`Choose ${e.name}`} className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={chosen.has(e.id)} onChange={() => toggleOne(e.id)} /></td>
                    <td className="px-4 py-2 text-gray-900">{e.name} <span className="text-xs text-gray-400">{e.code}</span></td>
                    <td className="px-4 py-2 text-gray-700">{e.branchName ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{e.department ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{e.designation ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600"><b>{chosen.size}</b> chosen of {employees.length} shown{employees.length >= 1000 ? ' (the list is limited to the first 1,000: narrow it by branch or search)' : ''}.</p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">2. Choose what to change</h3>
        <div className="mt-3 divide-y divide-gray-100">
          {fields.map((f) => {
            const d = draft(f.key);
            return (
              <div key={f.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                <label className="flex w-60 cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600" checked={d.on} onChange={(e) => setDraft(f.key, { on: e.target.checked })} />
                  {f.label}
                </label>
                {d.on && !d.clear && (
                  f.type === 'text' ? (
                    <input className={`${fieldClass} !mt-0 max-w-xs`} maxLength={120} placeholder={`New ${f.label.toLowerCase()}`} value={d.value} onChange={(e) => setDraft(f.key, { value: e.target.value })} />
                  ) : (
                    <select className={`${fieldClass} !mt-0 max-w-xs`} value={d.value} onChange={(e) => setDraft(f.key, { value: e.target.value })}>
                      <option value="">Select…</option>
                      {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )
                )}
                {d.on && !f.required && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={d.clear} onChange={(e) => setDraft(f.key, { clear: e.target.checked })} /> Clear this field</label>
                )}
              </div>
            );
          })}
          {fields.length === 0 && <p className="py-4 text-sm text-gray-500">Loading fields…</p>}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-gray-500">{chosen.size} employee{chosen.size === 1 ? '' : 's'}, {changes.length} field{changes.length === 1 ? '' : 's'}</span>
        <button type="button" onClick={ask} disabled={applying} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">Review and update</button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !applying && setConfirming(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-base font-semibold text-gray-900">Update {chosen.size} employee{chosen.size === 1 ? '' : 's'}?</h4>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {fields.filter((f) => draft(f.key).on).map((f) => (
                <li key={f.key}><b>{f.label}</b> → {draft(f.key).clear ? <em>cleared</em> : labelOf(f, draft(f.key).value)}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500">The change is recorded in the audit log. Previous values are not kept, so this cannot be undone in one step.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={applying} onClick={() => setConfirming(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={applying} onClick={apply} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{applying ? 'Updating…' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
