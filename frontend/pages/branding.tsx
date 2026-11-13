import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  BrandingItem,
  brandingFaviconUrl,
  brandingLogoUrl,
  getBranding,
  updateBranding,
  uploadBrandingFavicon,
  uploadBrandingLogo,
} from '../lib/api';

export default function BrandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [branding, setBranding] = useState<BrandingItem | null>(null);
  const [form, setForm] = useState({ appName: '', primaryColor: '#2563eb', secondaryColor: '#1e40af', accentColor: '#f97316', loginBrandingText: '', footerText: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);

  const isSystemAdmin = user?.userTypeId === 3;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBranding();
      setBranding(res.data);
      setForm({
        appName: res.data.appName,
        primaryColor: res.data.primaryColor || '#2563eb',
        secondaryColor: res.data.secondaryColor || '#1e40af',
        accentColor: res.data.accentColor || '#f97316',
        loginBrandingText: res.data.loginBrandingText || '',
        footerText: res.data.footerText || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load branding');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSystemAdmin) load();
    else if (isAuthenticated) setLoading(false);
  }, [isAuthenticated, isSystemAdmin]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await updateBranding(form);
      setBranding(res.data);
      setMessage('Branding updated.');
    } catch (err: any) {
      setError(err.message || 'Could not update branding');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setError('');
    setMessage('');
    try {
      const res = await uploadBrandingLogo(file);
      setBranding(res.data);
      setMessage('Logo uploaded.');
    } catch (err: any) {
      setError(err.message || 'Could not upload logo');
    }
  };

  const uploadFavicon = async (file: File) => {
    setError('');
    setMessage('');
    try {
      const res = await uploadBrandingFavicon(file);
      setBranding(res.data);
      setMessage('Favicon uploaded.');
    } catch (err: any) {
      setError(err.message || 'Could not upload favicon');
    }
  };

  if (!isAuthenticated) return null;
  if (!isSystemAdmin) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700 shadow-sm">
        Only System Admin can manage application branding.
      </div>
    );
  }
  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';
  const colorInputClass = 'h-10 w-16 cursor-pointer rounded border border-gray-300';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Application branding</h2>
        <p className="mt-1 text-sm text-gray-500">Only System Admin can change this.</p>
      </div>

      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Logo &amp; favicon</h3>
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            {branding?.logoFileId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandingLogoUrl()} alt="Logo" className="h-12 w-auto rounded border border-gray-200 bg-gray-50 p-1" />
            ) : (
              <div className="flex h-12 w-24 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">No logo</div>
            )}
            <div>
              <input ref={logoInput} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <button type="button" onClick={() => logoInput.current?.click()} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Upload logo
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {branding?.faviconFileId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandingFaviconUrl()} alt="Favicon" className="h-8 w-8 rounded border border-gray-200 bg-gray-50 p-1" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400">None</div>
            )}
            <div>
              <input ref={faviconInput} type="file" accept=".png,.ico" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFavicon(e.target.files[0])} />
              <button type="button" onClick={() => faviconInput.current?.click()} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Upload favicon
              </button>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={save} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Appearance</h3>
        <label className="block text-sm font-medium text-gray-700">
          Application name
          <input className={inputClass} value={form.appName} onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Primary color
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className={colorInputClass} value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
              <span className="text-sm text-gray-500">{form.primaryColor}</span>
            </div>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Secondary color
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className={colorInputClass} value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
              <span className="text-sm text-gray-500">{form.secondaryColor}</span>
            </div>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Accent color
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className={colorInputClass} value={form.accentColor} onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))} />
              <span className="text-sm text-gray-500">{form.accentColor}</span>
            </div>
          </label>
        </div>
        <label className="block text-sm font-medium text-gray-700">
          Login page branding text
          <input className={inputClass} value={form.loginBrandingText} onChange={(e) => setForm((f) => ({ ...f, loginBrandingText: e.target.value }))} />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Footer text
          <input className={inputClass} value={form.footerText} onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))} />
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
