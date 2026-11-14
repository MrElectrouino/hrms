import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Employee, getEmployees } from '../../lib/api';
import { LeaveBalance, LeaveType, LedgerRow, adjustBalance, getBalancesOf, getLeaveTypes, getLedger } from '../../lib/leave-api';
import { fieldClass } from '../../components/Drawer';

const KIND: Record<string, string> = { CREDIT: 'Credit', DEBIT: 'Used', REVERSAL: 'Returned', EXPIRY: 'Expired', ADJUSTMENT: 'Adjustment' };

/** HR: an employee's balances and ledger, and adding or taking away days with a reason. */
export default function LeaveBalancesPage() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [emps, setEmps] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [adj, setAdj] = useState({ leaveTypeId: '', days: '', note: '', expiresOn: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isAuthenticated) getLeaveTypes().then((r) => setTypes(r.data.filter((t) => t.balanceTracking))).catch(() => {});
  }, [isAuthenticated]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setTimeout(() => getEmployees({ pageSize: 25, isActive: true, ...(search.trim() ? { search: search.trim() } : {}) }).then((r) => setEmps(r.data)).catch(() => setEmps([])), 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, search]);

  const load = useCallback(async () => {
    if (employeeId === null) return;
    try {
      const [b, l] = await Promise.all([getBalancesOf(employeeId), getLedger(employeeId)]);
      setBalances(b.data);
      setLedger(l.data);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load this employee');
    }
  }, [employeeId]);
  useEffect(() => {
    setBalances([]);
    setLedger([]);
    load();
  }, [load]);

  const save = async () => {
    if (employeeId === null) return;
    const days = Number(adj.days);
    if (!adj.leaveTypeId || !days) return setError('Choose a leave type and the number of days (negative to take away)');
    if (!adj.note.trim()) return setError('A reason is required');
    setError('');
    setNotice('');
    try {
      await adjustBalance({ employeeId, leaveTypeId: Number(adj.leaveTypeId), days, note: adj.note.trim(), expiresOn: adj.expiresOn || undefined });
      setNotice('Balance adjusted');
      setAdj({ leaveTypeId: adj.leaveTypeId, days: '', note: '', expiresOn: '' });
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not adjust');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave balances</h2>
        <p className="mt-1 text-gray-500">Every change to a balance is recorded. Days taken away use the earliest-expiring balance first.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-gray-700">Find employee<input type="search" placeholder="Name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 block w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></label>
        <label className="text-sm font-medium text-gray-700">Employee
          <select value={employeeId ?? ''} onChange={(e) => { setEmployeeId(e.target.value ? Number(e.target.value) : null); setNotice(''); }} className="mt-1 block w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Select employee…</option>
            {emps.map((e) => <option key={e.id} value={e.id}>{[e.profile?.name, e.profile?.lastName].filter(Boolean).join(' ')} ({e.employeeCode})</option>)}
          </select>
        </label>
      </div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{notice}</p>}

      {employeeId === null ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Choose an employee.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {balances.filter((b) => b.balanceTracking).map((b) => (
              <div key={b.leaveTypeId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{b.name}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{b.balance}</p>
                <p className="mt-1 text-xs text-gray-500">{b.pending > 0 ? `${b.pending} waiting approval` : 'None waiting'}{b.nextExpiry ? ` · expires ${b.nextExpiry}` : ''}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Add or take away days</h3>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-gray-600">Leave type
                <select value={adj.leaveTypeId} onChange={(e) => setAdj({ ...adj, leaveTypeId: e.target.value })} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"><option value="">Select…</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </label>
              <label className="text-xs font-medium text-gray-600">Days (use − to take away)<input type="number" step="0.5" value={adj.days} onChange={(e) => setAdj({ ...adj, days: e.target.value })} className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm" /></label>
              <label className="text-xs font-medium text-gray-600">Expires (optional)<input type="date" value={adj.expiresOn} onChange={(e) => setAdj({ ...adj, expiresOn: e.target.value })} className="mt-1 block rounded-lg border border-gray-300 px-3 py-1.5 text-sm" /></label>
              <label className="min-w-[14rem] flex-1 text-xs font-medium text-gray-600">Reason<input value={adj.note} maxLength={200} onChange={(e) => setAdj({ ...adj, note: e.target.value })} className={`${fieldClass} !mt-1`} /></label>
              <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">Save</button>
            </div>
          </section>

          <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Days</th><th className="px-4 py-3">Note</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {ledger.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No movements yet.</td></tr> : ledger.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-gray-600">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-gray-900">{l.leaveType}</td>
                    <td className="px-4 py-2 text-gray-700">{KIND[l.kind] ?? l.kind}</td>
                    <td className={`px-4 py-2 font-medium ${l.days >= 0 ? 'text-green-700' : 'text-red-700'}`}>{l.days > 0 ? `+${l.days}` : l.days}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{l.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
