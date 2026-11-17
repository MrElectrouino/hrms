import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { changeOwnPassword } from '../lib/admin-api';

// Same rule the API enforces (CreateUserDto / ChangePasswordDto).
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

const EyeIcon = ({ off }: { off?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

const Tick = ({ ok }: { ok: boolean }) => (
  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ok ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <circle cx="12" cy="12" r="1.5" />}
    </svg>
  </span>
);

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

/** A password box with a show / hide button. */
function PasswordField({ label, value, onChange, autoComplete, hint }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        <div className="relative mt-1.5">
          <input type={show ? 'text' : 'password'} autoComplete={autoComplete} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} required />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-400 hover:text-gray-700">
            <EyeIcon off={show} />
          </button>
        </div>
      </label>
      {hint}
    </div>
  );
}

export default function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const rules = useMemo(
    () => [
      { label: 'At least 8 characters', ok: newPassword.length >= 8 },
      { label: 'An upper case letter', ok: /[A-Z]/.test(newPassword) },
      { label: 'A lower case letter', ok: /[a-z]/.test(newPassword) },
      { label: 'A digit', ok: /\d/.test(newPassword) },
      { label: 'A symbol, such as ! @ # $', ok: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword],
  );
  const matches = confirm.length > 0 && newPassword === confirm;
  const differs = newPassword.length > 0 && newPassword !== currentPassword;
  const ready = POLICY.test(newPassword) && matches && newPassword !== currentPassword && currentPassword.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!POLICY.test(newPassword)) {
      setError('Use at least 8 characters with upper and lower case letters, a digit and a symbol.');
      return;
    }
    if (newPassword !== confirm) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('The new password must be different from the current one.');
      return;
    }
    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      await refreshUser();
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
      if (forced) router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {forced && user?.mustChangePassword && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          Your password was set by an administrator or carried over from the old system. Choose a new password to continue.
        </p>
      )}

      <PasswordField label={forced ? 'Temporary password' : 'Current password'} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />

      <PasswordField
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        hint={
          <ul className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2" aria-label="Password requirements">
            {rules.map((r) => (
              <li key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? 'text-green-700' : 'text-gray-500'}`}>
                <Tick ok={r.ok} />
                {r.label}
              </li>
            ))}
            <li className={`flex items-center gap-2 text-xs ${differs ? 'text-green-700' : 'text-gray-500'}`}>
              <Tick ok={differs} />
              Different from the current one
            </li>
          </ul>
        }
      />

      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        hint={confirm.length > 0 && <p className={`mt-1.5 text-xs ${matches ? 'text-green-700' : 'text-red-600'}`}>{matches ? 'The passwords match.' : 'The passwords do not match yet.'}</p>}
      />

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}
      {done && !forced && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">Password changed. Other devices have been signed out.</p>
      )}

      <button type="submit" disabled={saving || !ready} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {saving ? 'Saving…' : forced ? 'Set new password and continue' : 'Change password'}
      </button>
    </form>
  );
}
