import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { UserType } from '../lib/user-types';
import { LeaveSettings, LeaveType, LeaveTypePayload, createLeaveType, getLeaveConfig, runAccrual, saveLeaveSettings, syncCompOff, updateLeaveType } from '../lib/leave-api';
import Drawer, { fieldClass } from '../components/Drawer';

const blankType: LeaveTypePayload = {
  code: '', name: '', isPaid: true, balanceTracking: true, accrual: 'NONE', annualDays: 0, allowHalfDay: true, allowNegative: false,
  requiresDocument: false, documentAfterDays: 0, maxDaysPerRequest: null, isSandwichEligible: false, isCompOff: false, isActive: true,
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** System Settings > Leave configuration: leave types, the sandwich leave switch, comp off, and the leave year. */
export default function LeaveConfigPage() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.userTypeId === UserType.SystemAdmin;
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [settings, setSettings] = useState<LeaveSettings | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; form: LeaveTypePayload } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = (await getLeaveConfig()).data;
      setTypes(r.types);
      setSettings(r.settings);
    } catch (e: any) {
      setError(e.message || 'Could not load the leave configuration');
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated && isAdmin) load();
  }, [isAuthenticated, isAdmin, load]);

  const saveType = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.code.trim() || !f.name.trim()) return setError('Code and name are required');
    setSaving(true);
    setError('');
    try {
      const payload = { ...f, annualDays: Number(f.annualDays), maxDaysPerRequest: f.maxDaysPerRequest ? Number(f.maxDaysPerRequest) : null };
      if (editing.id === null) await createLeaveType(payload);
      else await updateLeaveType(editing.id, payload);
      setEditing(null);
      setNotice('Leave type saved');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setError('');
    setNotice('');
    try {
      await saveLeaveSettings({ ...settings, compOffCreditDays: Number(settings.compOffCreditDays), compOffExpiryDays: settings.compOffExpiryDays ? Number(settings.compOffExpiryDays) : null });
      setNotice('Settings saved');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not save');
    }
  };

  if (isAuthenticated && !isAdmin) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Only System Admin can change the leave configuration.</div>;

  const check = 'rounded border-gray-300 text-blue-600 focus:ring-blue-500';
  const set = (patch: Partial<LeaveSettings>) => settings && setSettings({ ...settings, ...patch });
  const setF = (patch: Partial<LeaveTypePayload>) => editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Leave configuration</h2>
        <p className="mt-1 text-gray-500">Leave types, the sandwich leave policy, comp off and the leave year.</p>
      </div>
      {error && !editing && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">{notice}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Leave types</h3>
          <button type="button" onClick={() => { setError(''); setEditing({ id: null, form: { ...blankType } }); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">+ Add leave type</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Entitlement</th><th className="px-4 py-3">Sandwich</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((t) => (
                <tr key={t.id} className={!t.isActive ? 'bg-gray-50/60' : undefined}>
                  <td className="px-4 py-3 font-mono text-[13px] text-gray-700">{t.code}</td>
                  <td className={`px-4 py-3 font-medium ${t.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{t.name}</td>
                  <td className="px-4 py-3 text-gray-700">{t.isPaid ? 'Paid' : 'Unpaid'}</td>
                  <td className="px-4 py-3 text-gray-700">{t.isCompOff ? 'Earned (comp off)' : !t.balanceTracking ? 'No balance kept' : t.accrual === 'NONE' ? 'Set by HR' : `${t.annualDays} days / year, ${t.accrual === 'MONTHLY' ? 'monthly' : 'yearly'}`}</td>
                  <td className="px-4 py-3">{t.isSandwichEligible ? <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">Eligible</span> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setError(''); setEditing({ id: t.id, form: { ...t } }); }} className="text-xs font-medium text-blue-600 hover:text-blue-800">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {settings && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Sandwich leave</h3>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" className={`${check} mt-0.5`} checked={settings.sandwichEnabled} onChange={(e) => set({ sandwichEnabled: e.target.checked })} />
              <span><span className="font-medium">Apply the sandwich leave policy</span><span className="block text-xs text-gray-500">Off by default. It applies only to leave types marked eligible, and some laws override a company rule, so check before turning it on.</span></span>
            </label>
            <fieldset disabled={!settings.sandwichEnabled} className="space-y-3 disabled:opacity-50">
              <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" className={check} checked={settings.sandwichWeeklyOffs} onChange={(e) => set({ sandwichWeeklyOffs: e.target.checked })} />Count weekly offs</label>
              <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" className={check} checked={settings.sandwichHolidays} onChange={(e) => set({ sandwichHolidays: e.target.checked })} />Count public holidays</label>
              <label className="flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" className={`${check} mt-0.5`} checked={settings.sandwichRequireBothSides} onChange={(e) => set({ sandwichRequireBothSides: e.target.checked })} /><span>Leave must be on both sides<span className="block text-xs text-gray-500">Off: leave right before or right after the off days is enough.</span></span></label>
            </fieldset>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Leave year and comp off</h3>
            <label className="block text-sm font-medium text-gray-700">Leave year starts in
              <select className={fieldClass} value={settings.leaveYearStartMonth} onChange={(e) => set({ leaveYearStartMonth: Number(e.target.value) })}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" className={`${check} mt-0.5`} checked={settings.compOffEnabled} onChange={(e) => set({ compOffEnabled: e.target.checked })} />
              <span><span className="font-medium">Earn comp off for working on a weekly off or holiday</span><span className="block text-xs text-gray-500">Credited when the day is approved and enough time was worked.</span></span>
            </label>
            <fieldset disabled={!settings.compOffEnabled} className="grid grid-cols-3 gap-3 disabled:opacity-50">
              <label className="text-xs font-medium text-gray-600">Days credited<input type="number" step="0.25" min="0.25" className={fieldClass} value={settings.compOffCreditDays} onChange={(e) => set({ compOffCreditDays: e.target.value })} /></label>
              <label className="text-xs font-medium text-gray-600">Expires after (days)<input type="number" min="1" placeholder="Never" className={fieldClass} value={settings.compOffExpiryDays ?? ''} onChange={(e) => set({ compOffExpiryDays: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className="text-xs font-medium text-gray-600">Minimum worked (min)<input type="number" min="0" className={fieldClass} value={settings.compOffMinWorkedMinutes} onChange={(e) => set({ compOffMinWorkedMinutes: Number(e.target.value) })} /></label>
            </fieldset>
          </div>
          <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveSettings} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">Save settings</button>
            <button type="button" onClick={async () => { setError(''); try { const r = (await runAccrual()).data; setNotice(`Accrual for ${r.leaveYear}: ${r.credited} credited, ${r.alreadyCredited} already done.`); } catch (e: any) { setError(e.message); } }} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Credit leave now</button>
            <button type="button" onClick={async () => { setError(''); try { const r = (await syncCompOff()).data; setNotice(`Comp off checked: ${r.granted} new credit(s).`); } catch (e: any) { setError(e.message); } }} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Check comp off now</button>
            <span className="text-xs text-gray-500">Both also run every night. Running them again never credits twice.</span>
          </div>
        </section>
      )}

      {editing && (
        <Drawer
          title={editing.id === null ? 'New leave type' : `Edit ${editing.form.name}`}
          wide
          onClose={() => setEditing(null)}
          footer={<>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={saveType} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </>}
        >
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-3 gap-4">
            <label className="col-span-1 block text-sm font-medium text-gray-700">Code<input className={`${fieldClass} font-mono uppercase`} maxLength={10} value={editing.form.code} onChange={(e) => setF({ code: e.target.value })} /></label>
            <label className="col-span-2 block text-sm font-medium text-gray-700">Name<input className={fieldClass} maxLength={60} value={editing.form.name} onChange={(e) => setF({ name: e.target.value })} /></label>
          </div>
          <div className="space-y-3">
            {([
              ['isPaid', 'Paid leave', ''],
              ['balanceTracking', 'Keep a balance', 'Off for types such as loss of pay, where days are recorded but not limited.'],
              ['allowHalfDay', 'Allow half days', ''],
              ['allowNegative', 'Allow going over the balance', 'The days beyond the balance are recorded, not blocked.'],
              ['isCompOff', 'Comp off', 'Earned by working on an off day instead of being credited each year.'],
              ['isSandwichEligible', 'Eligible for the sandwich leave policy', 'Used only when the sandwich policy is switched on above.'],
              ['requiresDocument', 'Needs a supporting document', 'Shown to the employee as a reminder; HR keeps the document.'],
              ['isActive', 'Active', ''],
            ] as const).map(([k, label, hint]) => (
              <label key={k} className="flex items-start gap-3 text-sm text-gray-700">
                <input type="checkbox" className={`${check} mt-0.5`} checked={!!editing.form[k]} onChange={(e) => setF({ [k]: e.target.checked } as Partial<LeaveTypePayload>)} />
                <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-gray-500">{hint}</span>}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">How days are credited
              <select className={fieldClass} value={editing.form.accrual} onChange={(e) => setF({ accrual: e.target.value as LeaveType['accrual'] })}>
                <option value="NONE">Not credited automatically</option><option value="ANNUAL">All at the start of the leave year</option><option value="MONTHLY">A twelfth each month</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Days per year<input type="number" min="0" step="0.5" disabled={editing.form.accrual === 'NONE'} className={fieldClass} value={editing.form.annualDays} onChange={(e) => setF({ annualDays: e.target.value })} /></label>
            <label className="block text-sm font-medium text-gray-700">Longest request (days)<input type="number" min="1" placeholder="No limit" className={fieldClass} value={editing.form.maxDaysPerRequest ?? ''} onChange={(e) => setF({ maxDaysPerRequest: e.target.value ? Number(e.target.value) : null })} /></label>
            <label className="block text-sm font-medium text-gray-700">Document needed after (days)<input type="number" min="0" className={fieldClass} value={editing.form.documentAfterDays} onChange={(e) => setF({ documentAfterDays: Number(e.target.value) })} /></label>
          </div>
          <p className="text-xs text-gray-500">Entitlement, service slabs and the statutory amounts vary by country and company policy. Set the values your policy needs; none are assumed.</p>
        </Drawer>
      )}
    </div>
  );
}
