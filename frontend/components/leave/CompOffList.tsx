import React, { useEffect, useMemo, useState } from 'react';
import { CompOffRow, getCompOff } from '../../lib/leave-api';
import Select from '../Select';

const STATE: Record<CompOffRow['state'], { text: string; tone: string }> = {
  ACTIVE: { text: 'Active', tone: 'border-green-200 bg-green-50 text-green-700' },
  EXPIRING: { text: 'Expiring soon', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  USED: { text: 'Used', tone: 'border-gray-200 bg-gray-100 text-gray-600' },
  EXPIRED: { text: 'Expired', tone: 'border-red-200 bg-red-50 text-red-700' },
};

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

function expiryText(r: CompOffRow) {
  if (!r.expiresOn) return 'Never expires';
  if (r.state === 'EXPIRED') return `Expired ${r.expiresOn}`;
  if (r.state === 'USED') return `Would expire ${r.expiresOn}`;
  const left = r.daysLeft === 0 ? 'today' : r.daysLeft === 1 ? 'tomorrow' : `in ${r.daysLeft} days`;
  return `${r.expiresOn} (${left})`;
}

/**
 * Comp off credits with what became of each: still usable and when it runs out, used, or lost to expiry.
 * `scope` "me" is the person's own list; "team" is the people the viewer manages.
 */
export default function CompOffList({ scope, hideWhenEmpty = false }: { scope: 'me' | 'team'; hideWhenEmpty?: boolean }) {
  const [rows, setRows] = useState<CompOffRow[] | null>(null);
  const [error, setError] = useState('');
  const [empFilter, setEmpFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const team = scope === 'team';

  useEffect(() => {
    getCompOff(scope).then((r) => setRows(r.data)).catch((e: any) => { setError(e.message || 'Could not load comp off'); setRows([]); });
  }, [scope]);

  const empOptions = useMemo(() => {
    const seen = new Map<number, { value: string; label: string }>();
    for (const r of rows ?? []) if (!seen.has(r.employeeId)) seen.set(r.employeeId, { value: String(r.employeeId), label: `${r.employeeName} (${r.employeeCode})` });
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const shown = useMemo(
    () => (rows ?? []).filter((r) => (empFilter.length === 0 || empFilter.includes(String(r.employeeId))) && (stateFilter.length === 0 || stateFilter.includes(r.state))),
    [rows, empFilter, stateFilter],
  );
  const usable = shown.filter((r) => r.state === 'ACTIVE' || r.state === 'EXPIRING');
  const expiringDays = shown.filter((r) => r.state === 'EXPIRING').reduce((s, r) => s + r.remaining, 0);
  const lostDays = shown.filter((r) => r.state === 'EXPIRED').reduce((s, r) => s + r.lost, 0);
  const filtersOn = empFilter.length > 0 || stateFilter.length > 0;

  if (rows === null) return <p className="text-sm text-gray-400">Loading…</p>;
  if (hideWhenEmpty && rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{team ? 'Comp off' : 'My comp off'}</h3>
        <p className="mt-0.5 text-sm text-gray-500">Each day worked on a holiday or weekly off that earned comp off, and when it runs out. Comp off that is not used by its expiry date is lost.</p>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wider text-gray-500">Available now</p><p className="mt-1 text-2xl font-semibold text-gray-900">{days(usable.reduce((s, r) => s + r.remaining, 0))}</p></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wider text-amber-700">Expiring within 7 days</p><p className="mt-1 text-2xl font-semibold text-amber-800">{days(expiringDays)}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wider text-gray-500">Lost to expiry</p><p className="mt-1 text-2xl font-semibold text-gray-900">{days(lostDays)}</p></div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {team && (
          <div className="w-60">
            <Select multiple aria-label="Employees" options={empOptions} values={empFilter} onValuesChange={setEmpFilter} placeholder="All employees" allText="All employees" noun="employees" className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm" />
          </div>
        )}
        <div className="w-52">
          <Select
            multiple
            aria-label="Status"
            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'EXPIRING', label: 'Expiring soon' }, { value: 'USED', label: 'Used' }, { value: 'EXPIRED', label: 'Expired' }]}
            values={stateFilter}
            onValuesChange={setStateFilter}
            placeholder="Any status"
            allText="Any status"
            noun="statuses"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
        {filtersOn && <button type="button" onClick={() => { setEmpFilter([]); setStateFilter([]); }} className="pb-1.5 text-sm font-medium text-blue-600 hover:text-blue-800">Clear filters</button>}
        <p className="ml-auto pb-1.5 text-xs text-gray-500">Showing {shown.length} of {rows.length}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr>
              {team && <th className="px-4 py-3">Employee</th>}
              <th className="px-4 py-3">Worked on</th>
              <th className="px-4 py-3">Earned</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Left</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.length === 0 ? (
              <tr><td colSpan={team ? 7 : 6} className="px-4 py-8 text-center text-gray-500">{filtersOn ? 'Nothing matches these filters.' : 'No comp off yet.'}</td></tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id}>
                  {team && <td className="px-4 py-2 text-gray-900">{r.employeeName} <span className="text-xs text-gray-400">{r.employeeCode}</span></td>}
                  <td className="px-4 py-2 font-mono text-[13px] text-gray-700">{r.workedOn ?? r.creditedOn}</td>
                  <td className="px-4 py-2 text-gray-700">{r.quantity}</td>
                  <td className="px-4 py-2 text-gray-700">{r.used}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.state === 'EXPIRED' ? <span className="font-normal text-red-700">{r.lost} lost</span> : r.remaining}</td>
                  <td className={`px-4 py-2 ${r.state === 'EXPIRING' ? 'font-medium text-amber-700' : r.state === 'EXPIRED' ? 'text-red-700' : 'text-gray-700'}`}>{expiryText(r)}</td>
                  <td className="px-4 py-2"><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATE[r.state].tone}`}>{STATE[r.state].text}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
