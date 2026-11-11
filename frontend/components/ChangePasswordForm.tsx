import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { changeOwnPassword } from '../lib/admin-api';

// Same rule the API enforces (CreateUserDto / ChangePasswordDto).
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export default function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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

  const inputClass = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm';

  return (
    <form onSubmit={submit} className="space-y-4">
      {forced && user?.mustChangePassword && (
        <p className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200">
          Your password was set by an administrator or carried over from the old system. Choose a new password to continue.
        </p>
      )}
      <label className="block text-sm font-medium text-gray-700">
        Current password
        <input type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        New password
        <input type="password" autoComplete="new-password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Confirm new password
        <input type="password" autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </label>
      {error && <p className="text-sm rounded-md px-3 py-2 bg-red-50 text-red-700">{error}</p>}
      {done && !forced && (
        <p className="text-sm rounded-md px-3 py-2 bg-green-50 text-green-700">
          Password changed. Other devices have been signed out.
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </div>
    </form>
  );
}
