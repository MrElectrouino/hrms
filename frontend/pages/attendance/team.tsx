import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Employee, getEmployees } from '../../lib/api';
import { AttendanceRow, AttendanceStatus, editAttendance, getStatuses, getTeamAttendance, minutesText } from '../../lib/attendance-marking-api';
import { UserType } from '../../lib/user-types';
import StatusBadge from '../../components/StatusBadge';
import Drawer, { fieldClass } from '../../components/Drawer';
import Select from '../../components/Select';

const monthStart = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`;
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
const MANAGER_STATUSES = ['PRESENT', 'ABSENT', 'NOT_FOUND_PRESENT'];

interface Target {
  employeeId: number;
  employeeName: string;
  date: string;
  inTime: string;
  outTime: string;
  statusCode: string;
  remarks: string;
  isNew: boolean;
}

/** Managers approve and correct their team's unapproved days. HR can correct any day or add a missing one. */
export default function TeamAttendancePage() {
  const { isAuthenticated, user } = useAuth();
  const isHr = user?.userTypeId === UserType.SystemAdmin || user?.userTypeId === UserType.HRAdmin;

  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [edit, setEdit] = useState<Target | null>(null);
  const [saving, setSaving] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [emps, setEmps] = useState<Employee[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows((await getTeamAttendance(monthStart(month.y, month.m), monthEnd(month.y, month.m))).data);
    } catch (e: any) {
      setError(e.message || 'Could not load attendance');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);
  useEffect(() => {
    if (isAuthenticated) getStatuses().then((r) => setStatuses(r.data)).catch(() => {});
  }, [isAuthenticated]);

  // Employee picker for "Add a day" (HR only).
  useEffect(() => {
    if (!isAuthenticated || !isHr || !edit?.isNew) return;
    const t = setTimeout(() => getEmployees({ pageSize: 25, isActive: true, ...(empSearch.trim() ? { search: empSearch.trim() } : {}) }).then((r) => setEmps(r.data)).catch(() => setEmps([])), 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, isHr, edit?.isNew, empSearch]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (filter === 'all' || !r.approved) && (!q || `${r.employeeName} ${r.employeeCode}`.toLowerCase().includes(q)));
  }, [rows, filter, search]);
  const pending = rows.filter((r) => !r.approved).length;

  const label = new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shiftMonth = (d: number) => setMonth((p) => { const n = new Date(Date.UTC(p.y, p.m + d, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });

  const open = (r: AttendanceRow) => { setError(''); setEdit({ employeeId: r.employeeId, employeeName: `${r.employeeName} (${r.employeeCode})`, date: r.date, inTime: r.inLocal ?? '', outTime: r.outLocal ?? '', statusCode: '', remarks: '', isNew: false }); };
  const openNew = () => { setError(''); setEmpSearch(''); setEdit({ employeeId: 0, employeeName: '', date: new Date().toISOString().slice(0, 10), inTime: '', outTime: '', statusCode: '', remarks: '', isNew: true }); };

  const approve = async (r: AttendanceRow) => {
    setError('');
    setNotice('');
    try {
      await editAttendance(r.employeeId, r.date, {});
      setNotice(`${r.employeeName}, ${r.date} approved`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not approve');
    }
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.employeeId) return setError('Choose an employee');
    setSaving(true);
    setError('');
    try {
      const original = rows.find((r) => r.employeeId === edit.employeeId && r.date === edit.date);
      await editAttendance(edit.employeeId, edit.date, {
        // Only send times that were changed, so a plain status change keeps the punches.
        ...(edit.inTime && edit.inTime !== (original?.inLocal ?? '') ? { inTime: edit.inTime } : {}),
        ...(edit.outTime && edit.outTime !== (original?.outLocal ?? '') ? { outTime: edit.outTime } : {}),
        ...(edit.isNew && edit.inTime ? { inTime: edit.inTime } : {}),
        ...(edit.isNew && edit.outTime ? { outTime: edit.outTime } : {}),
        ...(edit.statusCode ? { statusCode: edit.statusCode } : {}),
        ...(edit.remarks.trim() ? { remarks: edit.remarks.trim() } : {}),
      });
      setNotice('Attendance saved and approved');
      setEdit(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const allowed = statuses.filter((s) => s.isActive && (isHr || MANAGER_STATUSES.includes(s.code)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team attendance</h2>
          <p className="mt-1 text-gray-500">
            {isHr ? 'Everyone in your branches. HR can correct any day or add a missing one.' : 'The people who report to you. You can approve or correct days that are not approved yet.'}
          </p>
        </div>
        {isHr && <button type="button" onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">+ Add or correct a day</button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" aria-label="Previous month">←</button>
          <span className="w-36 text-center text-sm font-medium text-gray-800">{label}</span>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" aria-label="Next month">→</button>
        </div>
        <input type="search" placeholder="Search name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-sm">
          <button type="button" onClick={() => setFilter('all')} className={`px-3 py-1.5 ${filter === 'all' ? 'bg-blue-50 font-medium text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>All</button>
          <button type="button" onClick={() => setFilter('pending')} className={`border-l border-gray-300 px-3 py-1.5 ${filter === 'pending' ? 'bg-blue-50 font-medium text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Pending approval ({pending})</button>
        </div>
      </div>

      {error && !edit && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{notice}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">In</th><th className="px-4 py-3">Out</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">Worked</th><th className="px-4 py-3 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">{filter === 'pending' ? 'Nothing is waiting for approval.' : 'No attendance this month.'}</td></tr>
            ) : (
              shown.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-900">{new Date(`${r.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}</td>
                  <td className="px-4 py-3 text-gray-900">{r.employeeName} <span className="text-xs text-gray-400">{r.employeeCode}</span></td>
                  <td className="px-4 py-3"><StatusBadge name={r.statusName} color={r.statusColor} approved={r.approved} /></td>
                  <td className="px-4 py-3 font-mono text-[13px] text-gray-700">{r.inLocal ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-gray-700">{r.outLocal ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{r.lateMinutes ? `${r.lateMinutes} min` : '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{minutesText(r.workedMinutes)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!r.approved && <button type="button" onClick={() => approve(r)} className="mr-3 text-xs font-medium text-green-700 hover:text-green-900">Approve</button>}
                    {(isHr || !r.approved) ? <button type="button" onClick={() => open(r)} className="text-xs font-medium text-blue-600 hover:text-blue-800">Edit</button> : <span className="text-xs text-gray-400">Approved</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {edit && (
        <Drawer
          title={edit.isNew ? 'Add or correct a day' : `Edit ${edit.date}`}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button type="button" onClick={() => setEdit(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save and approve'}</button>
            </>
          }
        >
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
          {edit.isNew ? (
            <>
              <label className="block text-sm font-medium text-gray-700">Find employee
                <input type="search" className={fieldClass} placeholder="Name or code…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-gray-700">Employee
                <Select className={fieldClass} value={edit.employeeId || ''} onChange={(e) => setEdit({ ...edit, employeeId: Number(e.target.value) })}>
                  <option value="">Select…</option>
                  {emps.map((e) => <option key={e.id} value={e.id}>{[e.profile?.name, e.profile?.lastName].filter(Boolean).join(' ')} ({e.employeeCode})</option>)}
                </Select>
              </label>
              <label className="block text-sm font-medium text-gray-700">Date
                <input type="date" className={fieldClass} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
              </label>
            </>
          ) : (
            <p className="text-sm text-gray-600">{edit.employeeName}</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">IN time<input type="time" className={fieldClass} value={edit.inTime} onChange={(e) => setEdit({ ...edit, inTime: e.target.value })} /></label>
            <label className="block text-sm font-medium text-gray-700">OUT time<input type="time" className={fieldClass} value={edit.outTime} onChange={(e) => setEdit({ ...edit, outTime: e.target.value })} /></label>
          </div>
          <p className="-mt-2 text-xs text-gray-500">Times are in the employee's own timezone. Late and half day are worked out again from the IN time.</p>
          <label className="block text-sm font-medium text-gray-700">Status
            <Select className={fieldClass} value={edit.statusCode} onChange={(e) => setEdit({ ...edit, statusCode: e.target.value })}>
              <option value="">Work it out from the times</option>
              {allowed.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </Select>
          </label>
          <label className="block text-sm font-medium text-gray-700">Remarks
            <input className={fieldClass} maxLength={150} value={edit.remarks} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} placeholder="Optional" />
          </label>
        </Drawer>
      )}
    </div>
  );
}
