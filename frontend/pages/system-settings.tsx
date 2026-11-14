import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { SystemConfigurationItem, getSystemConfigurations, updateSystemConfiguration } from '../lib/api';

// Regional Settings (planning/system_application_module.md §B) are seeded as ids 26-32,
// Security Configuration (§I) as 33-35.
const REGIONAL_IDS = new Set([26, 27, 28, 29, 30, 31, 32]);
const SECURITY_IDS = new Set([33, 34, 35]);

/** Settings with a fixed list of valid values are shown as a dropdown. */
const CHOICES: Record<string, { value: string; label: string }[]> = {
  'Default Country': [
    { value: 'IN', label: 'India (IN)' },
    { value: 'AE', label: 'United Arab Emirates (AE)' },
    { value: 'GB', label: 'United Kingdom (GB)' },
    { value: 'US', label: 'United States (US)' },
  ],
  'Default Time Format': [
    { value: '12', label: '12-hour (3:30 PM)' },
    { value: '24', label: '24-hour (15:30)' },
  ],
};
const NUMERIC = new Set(['Max Failed Login Attempts', 'Account Lockout Minutes', 'Session Timeout Minutes']);

const inputClass = 'mt-1.5 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export default function SystemSettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<SystemConfigurationItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'regional' | 'security'>('regional');

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

  const shown = items.filter((i) => (tab === 'regional' ? REGIONAL_IDS : SECURITY_IDS).has(i.id));
  const changed = shown.filter((i) => (drafts[i.id] ?? '') !== (i.value ?? ''));

  /** One Save for the whole tab: only the settings that changed are sent. */
  const saveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    for (const i of changed) {
      if (NUMERIC.has(i.name) && !/^\d+$/.test((drafts[i.id] ?? '').trim())) {
        setError(`"${i.name}" must be a whole number.`);
        return;
      }
    }
    setSaving(true);
    const done: string[] = [];
    try {
      for (const i of changed) {
        await updateSystemConfiguration(i.id, { value: (drafts[i.id] ?? '').trim() });
        done.push(i.name);
      }
      setMessage(`Saved: ${done.join(', ')}.`);
    } catch (err: any) {
      const failed = changed[done.length]?.name;
      setError(`${failed ? `"${failed}": ` : ''}${err.message || 'Could not save'}${done.length ? ` (already saved: ${done.join(', ')})` : ''}`);
    } finally {
      setSaving(false);
      await load();
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
        {([['regional', 'Regional settings'], ['security', 'Security']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setMessage(''); setError(''); setDrafts(Object.fromEntries(items.map((i) => [i.id, i.value ?? '']))); }}
            className={`px-4 py-2 text-sm font-medium ${tab === key ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
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
        <form onSubmit={saveAll} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
            {shown.map((item) => {
              const choices = CHOICES[item.name];
              const value = drafts[item.id] ?? '';
              const set = (v: string) => setDrafts((d) => ({ ...d, [item.id]: v }));
              return (
                <label key={item.id} className="block text-sm font-medium text-gray-700">
                  {item.name}
                  {choices ? (
                    <select className={inputClass} value={value} onChange={(e) => set(e.target.value)}>
                      {!choices.some((c) => c.value === value) && <option value={value}>{value || 'Select…'}</option>}
                      {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  ) : (
                    <input className={inputClass} inputMode={NUMERIC.has(item.name) ? 'numeric' : undefined} value={value} onChange={(e) => set(e.target.value)} />
                  )}
                  {item.description && <span className="mt-1 block text-xs font-normal text-gray-500">{item.description}</span>}
                </label>
              );
            })}
            {shown.length === 0 && <p className="text-sm text-gray-500">No settings in this section.</p>}
          </div>
          {shown.length > 0 && (
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              {changed.length > 0 && <span className="mr-auto text-xs text-gray-500">{changed.length} unsaved change{changed.length === 1 ? '' : 's'}</span>}
              <button
                type="button"
                disabled={saving || changed.length === 0}
                onClick={() => setDrafts(Object.fromEntries(items.map((i) => [i.id, i.value ?? ''])))}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving || changed.length === 0}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
