import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { CountryItem, SystemConfigurationItem, createCountry, getCountries, getSystemConfigurations, updateCountry, updateSystemConfiguration } from '../lib/api';

const COUNTRY_NAMES: Record<string, string> = { IN: 'India', AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States' };

/** The company's own location: currency, timezone, language and date format of the default country. */
function CompanyLocation({ code, onSaved }: { code: string; onSaved: (text: string) => void }) {
  const [row, setRow] = useState<CountryItem | null>(null);
  const [form, setForm] = useState({ currencyCode: '', defaultTimezone: '', defaultLanguage: 'en', dateFormat: 'DD/MM/YYYY' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const input = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  useEffect(() => {
    if (!code) return;
    getCountries().then((r) => {
      const hit = r.data.find((c) => c.isoCode === code) ?? null;
      setRow(hit);
      if (hit) setForm({ currencyCode: hit.currencyCode, defaultTimezone: hit.defaultTimezone, defaultLanguage: hit.defaultLanguage, dateFormat: hit.dateFormat });
    }).catch((e: any) => setError(e.message || 'Could not load the company location'));
  }, [code]);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const saved = row ? await updateCountry(row.id, form) : await createCountry({ isoCode: code, name: COUNTRY_NAMES[code] ?? code, ...form });
      setRow(saved.data);
      onSaved('Company location saved.');
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Company location ({COUNTRY_NAMES[code] ?? code})</h3>
      <p className="mt-1 text-sm text-gray-500">Used as the default timezone for attendance, and for currency and date format. Change the country itself with the Default Country setting above.</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-medium text-gray-600">Currency<input className={input} maxLength={3} value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} placeholder="AED" /></label>
        <label className="text-xs font-medium text-gray-600">Timezone<input className={input} value={form.defaultTimezone} onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })} placeholder="Asia/Dubai" /></label>
        <label className="text-xs font-medium text-gray-600">Language<input className={input} maxLength={10} value={form.defaultLanguage} onChange={(e) => setForm({ ...form, defaultLanguage: e.target.value })} /></label>
        <label className="text-xs font-medium text-gray-600">Date format<input className={input} value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} /></label>
      </div>
      <button type="button" disabled={saving || !form.currencyCode || !form.defaultTimezone} onClick={save} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">{saving ? 'Saving…' : 'Save'}</button>
    </section>
  );
}

// Regional Settings (planning/system_application_module.md §B) are seeded as ids 26-32,
// Security Configuration (§I) as 33-35; everything else is general application config (§F).
const REGIONAL_IDS = new Set([26, 27, 28, 29, 30, 31, 32]);
const SECURITY_IDS = new Set([33, 34, 35]);

export default function SystemSettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<SystemConfigurationItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'regional' | 'general' | 'security'>('regional');

  const isSystemAdmin = user?.userTypeId === 3;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSystemConfigurations();
      setItems(res.data);
      setDrafts(Object.fromEntries(res.data.map((i) => [i.id, i.value ?? ''])));
    } catch (err: any) {
      setError(err.message || 'Failed to load system configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSystemAdmin) load();
    else if (isAuthenticated) setLoading(false);
  }, [isAuthenticated, isSystemAdmin]);

  const save = async (item: SystemConfigurationItem) => {
    setError('');
    setMessage('');
    setSavingId(item.id);
    try {
      await updateSystemConfiguration(item.id, { value: drafts[item.id] });
      setMessage(`"${item.name}" updated.`);
      load();
    } catch (err: any) {
      setError(err.message || `Could not update "${item.name}"`);
    } finally {
      setSavingId(null);
    }
  };

  if (!isAuthenticated) return null;
  if (!isSystemAdmin) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
        Only System Admin can manage system settings.
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';
  const regional = items.filter((i) => REGIONAL_IDS.has(i.id));
  const security = items.filter((i) => SECURITY_IDS.has(i.id));
  const general = items.filter((i) => !REGIONAL_IDS.has(i.id) && !SECURITY_IDS.has(i.id));
  const defaultCountry = items.find((i) => i.name === 'Default Country')?.value ?? '';
  const shown = tab === 'regional' ? regional : tab === 'security' ? security : general;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">System settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Only System Admin can change these. Every change is recorded in the audit log.
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('regional')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'regional' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Regional settings
        </button>
        <button
          type="button"
          onClick={() => setTab('security')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'security' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Security
        </button>
        <button
          type="button"
          onClick={() => setTab('general')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'general' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Application configuration
        </button>
      </div>

      {tab === 'security' && !loading && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700">Password policy (fixed, not editable here)</p>
          <p className="mt-1">At least 8 characters, with upper, lower, digit and special characters. Multi-factor authentication is not yet implemented.</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-3">
                      <input
                        className={inputClass}
                        value={drafts[item.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.description}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => save(item)}
                        disabled={savingId === item.id || drafts[item.id] === (item.value ?? '')}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingId === item.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No settings in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'regional' && !loading && defaultCountry && <CompanyLocation code={defaultCountry} onSaved={setMessage} />}
    </div>
  );
}
