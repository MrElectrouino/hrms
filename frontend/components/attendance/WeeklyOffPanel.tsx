import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { WeeklyOffTemplate, createWeeklyOffTemplate, deleteWeeklyOffTemplate, getWeeklyOffTemplates, updateWeeklyOffTemplate } from '../../lib/attendance-api';
import Drawer, { fieldClass } from '../Drawer';

/** Days shown Monday first; the number is the weekday used by the server (0 = Sunday ... 6 = Saturday). */
const WEEK: { day: number; short: string; long: string }[] = [
  { day: 1, short: 'Mon', long: 'Monday' },
  { day: 2, short: 'Tue', long: 'Tuesday' },
  { day: 3, short: 'Wed', long: 'Wednesday' },
  { day: 4, short: 'Thu', long: 'Thursday' },
  { day: 5, short: 'Fri', long: 'Friday' },
  { day: 6, short: 'Sat', long: 'Saturday' },
  { day: 0, short: 'Sun', long: 'Sunday' },
];

const blank = { name: '', days: [] as number[], note: '', isActive: true };

/** Weekly off templates: pick the days, name it, then give it to employees (Employee profile, or Administration > Bulk update). */
export default function WeeklyOffPanel() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WeeklyOffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems((await getWeeklyOffTemplates()).data);
    } catch (e: any) {
      setError(e.message || 'Could not load weekly off templates');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated]);

  const open = (t?: WeeklyOffTemplate) => {
    setError('');
    setNotice('');
    setForm(t ? { name: t.name, days: [...t.days], note: t.note ?? '', isActive: t.isActive } : { ...blank });
    setEditing(t ? t.id : 'new');
  };
  const toggleDay = (d: number) => setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));

  const save = async () => {
    if (!form.name.trim()) return setError('Give the template a name');
    if (form.days.length === 0) return setError('Tick at least one day');
    if (form.days.length === 7) return setError('At least one day of the week must be a working day');
    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name.trim(), days: form.days, note: form.note.trim() || null, isActive: form.isActive };
      if (editing === 'new') await createWeeklyOffTemplate(payload);
      else await updateWeeklyOffTemplate(editing as number, payload);
      setEditing(null);
      setNotice('Weekly off template saved');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: WeeklyOffTemplate) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    setError('');
    setNotice('');
    try {
      await deleteWeeklyOffTemplate(t.id);
      setNotice('Template deleted');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-gray-500">A weekly off template is a named set of days off, for example "Saturday, Sunday" or "Friday only". Give it to employees on their profile (Attendance &amp; Leave → Weekly off) or in bulk under Administration → Bulk update. A roster entry or roster pattern still wins for the days it covers. Weekly off days are not marked absent and count in the leave sandwich rule.</p>
        <button type="button" onClick={() => open()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">New template</button>
      </div>
      {error && !editing && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{notice}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <tr><th className="px-4 py-3">Template</th><th className="px-4 py-3">Days off</th><th className="px-4 py-3">Employees now</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No templates yet. Create one, for example Saturday and Sunday.</td></tr>}
            {items.map((t) => (
              <tr key={t.id} className={t.isActive ? '' : 'opacity-60'}>
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{t.name}</p>{t.note && <p className="text-xs text-gray-500">{t.note}</p>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {WEEK.map((w) => (
                      <span key={w.day} className={`rounded-md px-2 py-0.5 text-xs font-medium ${t.days.includes(w.day) ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-400'}`}>{w.short}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{t.employeeCount}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{t.isActive ? 'Active' : 'Switched off'}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button type="button" onClick={() => open(t)} className="text-sm font-medium text-blue-600 hover:text-blue-800">Edit</button>
                  <button type="button" onClick={() => remove(t)} className="ml-3 text-sm text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Drawer
          title={editing === 'new' ? 'New weekly off template' : form.name || 'Weekly off template'}
          onClose={() => setEditing(null)}
          footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button><button type="button" disabled={saving} onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div>}
        >
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
          <label className="block text-xs font-medium text-gray-600">Name
            <input className={fieldClass} maxLength={80} placeholder="Saturday, Sunday" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div>
            <p className="text-xs font-medium text-gray-600">Days off</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WEEK.map((w) => (
                <label key={w.day} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.days.includes(w.day) ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-600" checked={form.days.includes(w.day)} onChange={() => toggleDay(w.day)} />
                  {w.long}
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              <button type="button" onClick={() => setForm({ ...form, days: [6, 0] })} className="font-medium text-blue-600 hover:text-blue-800">Saturday and Sunday</button>
              <button type="button" onClick={() => setForm({ ...form, days: [5, 6] })} className="font-medium text-blue-600 hover:text-blue-800">Friday and Saturday</button>
              <button type="button" onClick={() => setForm({ ...form, days: [0] })} className="font-medium text-blue-600 hover:text-blue-800">Sunday only</button>
              <button type="button" onClick={() => setForm({ ...form, days: [] })} className="font-medium text-gray-500 hover:text-gray-800">Clear</button>
            </div>
          </div>
          <label className="block text-xs font-medium text-gray-600">Note (optional)
            <input className={fieldClass} maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (switching off hides it from the pickers, employees keep it)</label>
        </Drawer>
      )}
    </div>
  );
}
