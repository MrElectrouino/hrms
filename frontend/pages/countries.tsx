import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { CountryItem, createCountry, getCountries, updateCountry } from '../lib/api';

const blank = { isoCode: '', name: '', currencyCode: '', defaultTimezone: '', defaultLanguage: 'en', dateFormat: 'DD/MM/YYYY' };

export default function CountriesPage() {
  const { isAuthenticated, user } = useAuth();
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isSystemAdmin = user?.userTypeId === 3;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCountries();
      setCountries(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSystemAdmin) load();
    else if (isAuthenticated) setLoading(false);
  }, [isAuthenticated, isSystemAdmin]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await createCountry({
        isoCode: form.isoCode.trim().toUpperCase(),
        name: form.name.trim(),
        currencyCode: form.currencyCode.trim().toUpperCase(),
        defaultTimezone: form.defaultTimezone.trim(),
        defaultLanguage: form.defaultLanguage.trim(),
        dateFormat: form.dateFormat.trim(),
      });
      setMessage(`${created.data.name} added.`);
      setForm(blank);
      load();
    } catch (err: any) {
      setError(err.message || 'Could not add the country');
    }
  };

  const toggle = async (c: CountryItem) => {
    setError('');
    try {
      await updateCountry(c.id, { isActive: !c.isActive });
      load();
    } catch (err: any) {
      setError(err.message || 'Could not update the country');
    }
  };

  if (!isAuthenticated) return null;
  if (!isSystemAdmin) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
        Only System Admin can manage country configuration.
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Country configuration</h2>
        <p className="mt-1 text-sm text-gray-500">
          Countries supported by the HRMS. Adding a country here does not require a code change elsewhere.
        </p>
      </div>

      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={add} className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-medium text-gray-700">
          ISO code
          <input className={inputClass} value={form.isoCode} maxLength={2} placeholder="AE" onChange={(e) => setForm((f) => ({ ...f, isoCode: e.target.value }))} required />
        </label>
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Name
          <input className={inputClass} value={form.name} placeholder="United Arab Emirates" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Currency code
          <input className={inputClass} value={form.currencyCode} maxLength={3} placeholder="AED" onChange={(e) => setForm((f) => ({ ...f, currencyCode: e.target.value }))} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Default timezone
          <input className={inputClass} value={form.defaultTimezone} placeholder="Asia/Dubai" onChange={(e) => setForm((f) => ({ ...f, defaultTimezone: e.target.value }))} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Default language
          <input className={inputClass} value={form.defaultLanguage} placeholder="en" onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))} required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Date format
          <input className={inputClass} value={form.dateFormat} placeholder="DD/MM/YYYY" onChange={(e) => setForm((f) => ({ ...f, dateFormat: e.target.value }))} required />
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Add country
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">ISO</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Timezone</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Date format</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {countries.map((c) => (
                  <tr key={c.id} className={c.isActive ? '' : 'opacity-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.isoCode}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.currencyCode}</td>
                    <td className="px-4 py-3">{c.defaultTimezone}</td>
                    <td className="px-4 py-3">{c.defaultLanguage}</td>
                    <td className="px-4 py-3">{c.dateFormat}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => toggle(c)} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {countries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                      No countries configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
