import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Employee, ShiftItem, getEmployees, getShifts } from '../../lib/api';
import {
  AssignmentRow,
  Assignments,
  HolidayCalendar,
  ResolvedDay,
  RosterPattern,
  WeeklyOffTemplate,
  WorkSchedule,
  assignHolidayCalendar,
  assignRosterPattern,
  assignWeeklyOffTemplate,
  assignWorkSchedule,
  clearRosterEntry,
  getAssignments,
  getEmployeeCalendar,
  getHolidayCalendars,
  getRosterPatterns,
  getWeeklyOffTemplates,
  getWorkSchedules,
  removeAssignment,
  setRosterEntry,
} from '../../lib/attendance-api';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`;
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
const LEVEL = { EMPLOYEE: 'Employee', BRANCH: 'Branch', COUNTRY: 'Country', COMPANY: 'Company' } as const;

type Kind = 'work-schedule' | 'roster-pattern' | 'holiday-calendar' | 'weekly-off';

function AssignmentCard({
  title,
  hint,
  rows,
  options,
  withAnchor,
  onAssign,
  onRemove,
}: {
  title: string;
  hint: string;
  rows: AssignmentRow[];
  options: { id: number; name: string }[];
  withAnchor?: boolean;
  onAssign: (id: number, from: string, anchor?: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [pick, setPick] = useState('');
  const [from, setFrom] = useState(today());
  const [anchor, setAnchor] = useState('');
  const [busy, setBusy] = useState(false);
  const current = rows.find((r) => r.effectiveTo === null) ?? null;

  const assign = async () => {
    if (!pick || !from) return;
    setBusy(true);
    try {
      await onAssign(Number(pick), from, withAnchor && anchor ? anchor : undefined);
      setPick('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      <p className="mt-3 text-sm">
        Current: <span className="font-medium text-gray-900">{current ? `${current.ref.name} (from ${current.effectiveFrom})` : 'none'}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-gray-600">Assign
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">
            <option value="">Select…</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
        </label>
        {withAnchor && (
          <label className="text-xs font-medium text-gray-600" title="The date where day 1 of the pattern falls">Day 1 falls on
            <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder={from} className="mt-1 block rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
          </label>
        )}
        <button type="button" onClick={assign} disabled={!pick || busy} className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">Assign</button>
      </div>
      <p className="mt-2 text-xs text-gray-500">A new assignment ends the previous one the day before it starts.</p>

      {rows.length > 0 && (
        <table className="mt-3 min-w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><tr><th className="py-1">Name</th><th className="py-1">From</th><th className="py-1">To</th><th /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-1.5 text-gray-900">{r.ref.name}</td>
                <td className="py-1.5 font-mono text-[13px] text-gray-700">{r.effectiveFrom}</td>
                <td className="py-1.5 font-mono text-[13px] text-gray-700">{r.effectiveTo ?? 'open'}</td>
                <td className="py-1.5 text-right"><button type="button" onClick={() => window.confirm('Remove this assignment?') && onRemove(r.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Per employee: work schedule, weekly off, roster pattern and holiday calendar (all effective-dated), plus a month preview. */
export default function AssignmentsPanel() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignments | null>(null);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [patterns, setPatterns] = useState<RosterPattern[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [weeklyOffs, setWeeklyOffs] = useState<WeeklyOffTemplate[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [days, setDays] = useState<ResolvedDay[]>([]);
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    getWorkSchedules().then((r) => setSchedules(r.data.filter((s) => s.isActive))).catch(() => {});
    getRosterPatterns().then((r) => setPatterns(r.data.filter((p) => p.isActive))).catch(() => {});
    getHolidayCalendars().then((r) => setCalendars(r.data.filter((c) => c.isActive))).catch(() => {});
    getWeeklyOffTemplates().then((r) => setWeeklyOffs(r.data.filter((t) => t.isActive))).catch(() => {});
    getShifts().then((r) => setShifts(r.data.filter((s) => s.isActive))).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setTimeout(() => {
      getEmployees({ pageSize: 25, isActive: true, ...(search.trim() ? { search: search.trim() } : {}) }).then((r) => setEmployees(r.data)).catch(() => setEmployees([]));
    }, 300);
    return () => clearTimeout(t);
  }, [isAuthenticated, search]);

  const reload = useCallback(async () => {
    if (employeeId === null) return;
    setError('');
    try {
      const [a, c] = await Promise.all([getAssignments(employeeId), getEmployeeCalendar(employeeId, monthStart(month.y, month.m), monthEnd(month.y, month.m))]);
      setAssignments(a.data);
      setDays(c.data.days);
      setCountry(c.data.country);
    } catch (e: any) {
      setError(e.message || 'Could not load this employee');
    }
  }, [employeeId, month]);

  useEffect(() => {
    setAssignments(null);
    setDays([]);
    reload();
  }, [reload]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      await reload();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
  };

  const selected = employees.find((e) => e.id === employeeId);
  const monthLabel = useMemo(() => new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }), [month]);
  const shiftMonth = (d: number) => setMonth((p) => { const n = new Date(Date.UTC(p.y, p.m + d, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; });

  const statusOf = (d: ResolvedDay) => {
    if (d.holiday) return { text: `Holiday: ${d.holiday.name}`, tone: 'bg-purple-50 text-purple-700 border-purple-200', note: `${LEVEL[d.holiday.calendarLevel]} calendar` };
    if (d.roster.source === 'NONE') return { text: 'No roster', tone: 'bg-gray-50 text-gray-500 border-gray-200', note: '' };
    if (d.roster.isWeeklyOff) return { text: 'Weekly off', tone: 'bg-gray-100 text-gray-600 border-gray-200', note: d.roster.source === 'ENTRY' ? 'single day' : d.roster.source === 'TEMPLATE' ? 'weekly off template' : '' };
    return { text: d.roster.shift?.name ?? 'Working', tone: 'bg-green-50 text-green-700 border-green-200', note: d.roster.source === 'ENTRY' ? 'single day' : '' };
  };

  const override = (date: string, value: string) => {
    if (!employeeId || !value) return;
    if (value === 'PATTERN') return run(() => clearRosterEntry(employeeId, date), 'Back to the pattern');
    return run(() => setRosterEntry(value === 'OFF' ? { employeeId, date, isWeeklyOff: true } : { employeeId, date, shiftId: Number(value), isWeeklyOff: false }), 'Day updated');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assignments</h2>
        <p className="mt-1 text-gray-500">Give an employee a work schedule, a weekly off, a roster pattern and, if needed, their own holiday calendar. Each has an effective date, so history is kept.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-gray-700">Find employee
          <input type="search" placeholder="Name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 block w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <label className="text-sm font-medium text-gray-700">Employee
          <select value={employeeId ?? ''} onChange={(e) => { setEmployeeId(e.target.value ? Number(e.target.value) : null); setNotice(''); }} className="mt-1 block w-72 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="">Select employee…</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{[e.profile?.name, e.profile?.lastName].filter(Boolean).join(' ')} ({e.employeeCode})</option>)}
          </select>
        </label>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{notice}</p>}

      {employeeId === null ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Choose an employee to see and change their schedule.</p>
      ) : !assignments ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <AssignmentCard
              title="Work schedule"
              hint="Required hours and start model."
              rows={assignments.workSchedules}
              options={schedules.map((s) => ({ id: s.id, name: `${s.name} (${s.code})` }))}
              onAssign={(id, from) => run(() => assignWorkSchedule(employeeId, { workScheduleId: id, effectiveFrom: from }), 'Work schedule assigned')}
              onRemove={(id) => run(() => removeAssignment(employeeId, 'work-schedule' as Kind, id), 'Assignment removed')}
            />
            <AssignmentCard
              title="Weekly off"
              hint="Which weekdays are off (templates are made under Weekly off). A roster entry or pattern still wins for the days it covers."
              rows={assignments.weeklyOffs ?? []}
              options={weeklyOffs.map((t) => ({ id: t.id, name: t.name }))}
              onAssign={(id, from) => run(() => assignWeeklyOffTemplate(employeeId, { templateId: id, effectiveFrom: from }), 'Weekly off assigned')}
              onRemove={(id) => run(() => removeAssignment(employeeId, 'weekly-off' as Kind, id), 'Assignment removed')}
            />
            <AssignmentCard
              title="Roster pattern"
              hint="The repeating cycle of shifts and weekly offs."
              rows={assignments.rosterPatterns}
              options={patterns.map((p) => ({ id: p.id, name: `${p.name} (${p.cycleDays} days)` }))}
              withAnchor
              onAssign={(id, from, anchor) => run(() => assignRosterPattern(employeeId, { patternId: id, effectiveFrom: from, anchorDate: anchor }), 'Roster pattern assigned')}
              onRemove={(id) => run(() => removeAssignment(employeeId, 'roster-pattern' as Kind, id), 'Assignment removed')}
            />
            <AssignmentCard
              title="Employee holiday calendar"
              hint="Only if this person needs a calendar of their own; otherwise the branch, country or company one applies."
              rows={assignments.holidayCalendars}
              options={calendars.map((c) => ({ id: c.id, name: c.name }))}
              onAssign={(id, from) => run(() => assignHolidayCalendar(employeeId, { calendarId: id, effectiveFrom: from }), 'Holiday calendar assigned')}
              onRemove={(id) => run(() => removeAssignment(employeeId, 'holiday-calendar' as Kind, id), 'Assignment removed')}
            />
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{selected ? `${selected.profile?.name ?? ''} ${selected.profile?.lastName ?? ''}`.trim() : 'Employee'}: {monthLabel}</h3>
                <p className="text-xs text-gray-500">Country of employment: {country || '—'}. Change a single day below; "Pattern" puts it back.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" aria-label="Previous month">←</button>
                <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" aria-label="Next month">→</button>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><tr><th className="py-2">Date</th><th className="py-2">Day</th><th className="py-2">Status</th><th className="py-2">Work schedule</th><th className="py-2">Change day</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {days.map((d) => {
                    const s = statusOf(d);
                    const dt = new Date(`${d.date}T00:00:00Z`);
                    return (
                      <tr key={d.date}>
                        <td className="py-1.5 font-mono text-[13px] text-gray-700">{d.date}</td>
                        <td className="py-1.5 text-gray-600">{dt.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}</td>
                        <td className="py-1.5">
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.tone}`}>{s.text}</span>
                          {s.note && <span className="ml-2 text-xs text-gray-400">{s.note}</span>}
                        </td>
                        <td className="py-1.5 text-gray-600">{d.workSchedule?.name ?? '—'}</td>
                        <td className="py-1.5">
                          <select aria-label={`Change ${d.date}`} value="" onChange={(e) => override(d.date, e.target.value)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs">
                            <option value="">…</option>
                            {shifts.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                            <option value="OFF">Weekly off</option>
                            {d.roster.source === 'ENTRY' && <option value="PATTERN">Pattern or weekly off</option>}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
