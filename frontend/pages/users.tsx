import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  resetUserPassword,
  User,
  getLoginCandidates,
  LoginCandidate,
  getUserTypes,
  getBranches,
  BranchOption,
} from '../lib/api';
import BranchAccessPicker from '../components/BranchAccessPicker';
import { UserType } from '../lib/user-types';
import Select from '../components/Select';

export default function UsersPage() {
  const { isAuthenticated, user: me } = useAuth();
  const isSystemAdmin = me?.userTypeId === UserType.SystemAdmin;
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [candidates, setCandidates] = useState<LoginCandidate[]>([]);
  // A generated temporary password, shown once and then forgotten.
  const [shown, setShown] = useState<{ username: string; password: string; reset: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userTypes, setUserTypes] = useState<{ id: number; name: string }[]>([]);

  // Create form state
  const [form, setForm] = useState({
    profileId: '',
    username: '',
    password: '',
    userTypeId: '',
    allBranches: true,
    branchIds: [] as number[],
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    userTypeId: '',
    isActive: true,
    allBranches: true,
    branchIds: [] as number[],
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    loadUsers();
    getUserTypes().then((res) => setUserTypes(res.data));
    getLoginCandidates().then((res) => setCandidates(res.data)).catch(() => {});
    if (isSystemAdmin) getBranches().then((res) => setBranchOptions(res.data)).catch(() => {});
  }, [isAuthenticated, isSystemAdmin, page, search]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page };
      if (search) params.search = search;
      const res = await getUsers(params);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({
      userTypeId: String(u.userTypeId || ''),
      isActive: u.isActive,
      allBranches: u.allBranches ?? true,
      branchIds: (u.branches ?? []).map((b) => b.branchId),
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createUser({
        username: form.username,
        ...(form.profileId ? { profileId: Number(form.profileId) } : {}),
        ...(form.password ? { password: form.password } : {}),
        userTypeId: parseInt(form.userTypeId, 10),
        ...(isSystemAdmin && parseInt(form.userTypeId, 10) !== UserType.SystemAdmin ? { allBranches: form.allBranches, branchIds: form.branchIds } : {}),
      });
      setShowCreate(false);
      setForm({ profileId: '', username: '', password: '', userTypeId: '', allBranches: true, branchIds: [] });
      if (created.data.temporaryPassword) { setCopied(false); setShown({ username: form.username.trim().toLowerCase(), password: created.data.temporaryPassword, reset: false }); }
      loadUsers();
      getLoginCandidates().then((res) => setCandidates(res.data)).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  /** Open the create form for an employee who is waiting for a login, with their details filled in. */
  const startFor = (c: LoginCandidate) => {
    const match = userTypes.find((t) => t.name.toLowerCase() === (c.accessRole ?? '').toLowerCase());
    setForm({ profileId: String(c.profileId), username: c.username, password: '', userTypeId: match ? String(match.id) : String(userTypes.find((t) => t.id === UserType.Executive)?.id ?? ''), allBranches: true, branchIds: [] });
    setShowCreate(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, {
        userTypeId: editForm.userTypeId ? parseInt(editForm.userTypeId, 10) : undefined,
        isActive: editForm.isActive,
        ...(isSystemAdmin && editingUser.userTypeId !== UserType.SystemAdmin ? { allBranches: editForm.allBranches, branchIds: editForm.branchIds } : {}),
      });
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await deactivateUser(id);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
    }
  };

  const handleResetPassword = async (id: number) => {
    const target = users.find((u) => u.id === id);
    if (!window.confirm(`Generate a new temporary password for ${target?.username ?? 'this user'}? They will be signed out and must choose their own password at the next sign-in.`)) return;
    try {
      const r = await resetUserPassword(id);
      if (r.data.temporaryPassword) { setCopied(false); setShown({ username: target?.username ?? '', password: r.data.temporaryPassword, reset: true }); }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="text-gray-500 mt-1">Manage site users and their access.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
        >
          + Add User
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {candidates.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <h3 className="text-sm font-semibold text-blue-900">Employees waiting for a login ({candidates.length})</h3>
          <p className="mt-0.5 text-xs text-blue-800">These employees have Login enabled on their System Access tab but no account yet. Create the account in one step; a temporary password is generated and shown once.</p>
          <div className="mt-3 divide-y divide-blue-100 rounded-lg border border-blue-100 bg-white">
            {candidates.slice(0, 10).map((c) => (
              <div key={c.profileId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-gray-900">{c.name} <span className="text-xs text-gray-400">{c.code}</span>{c.branchName && <span className="ml-2 text-xs text-gray-500">{c.branchName}</span>}</span>
                <button type="button" onClick={() => startFor(c)} className="rounded-lg border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50">Create login</button>
              </div>
            ))}
            {candidates.length > 10 && <p className="px-3 py-2 text-xs text-gray-500">+{candidates.length - 10} more: choose them in Add User.</p>}
          </div>
        </section>
      )}

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={() => setPage(1)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
        >
          Search
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-semibold text-gray-700">Username</th>
              <th className="px-6 py-3 font-semibold text-gray-700">User Type</th>
              <th className="px-6 py-3 font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 font-semibold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.username}</td>
                  <td className="px-6 py-4 text-gray-600">{u.userType?.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Reset Password
                    </button>
                    {u.isActive && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create User</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee <span className="font-normal text-gray-400">(optional)</span></label>
                <Select
                  value={form.profileId}
                  onChange={(e) => {
                    const c = candidates.find((x) => String(x.profileId) === e.target.value);
                    setForm({ ...form, profileId: e.target.value, ...(c ? { username: c.username } : {}) });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Not linked to an employee</option>
                  {candidates.map((c) => <option key={c.profileId} value={c.profileId}>{c.name} ({c.code})</option>)}
                </Select>
                <p className="mt-1 text-xs text-gray-500">Only employees with Login enabled on their System Access tab are listed.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave empty to generate a temporary password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <Select
                  required
                  value={form.userTypeId}
                  onChange={(e) => setForm({ ...form, userTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select user type</option>
                  {userTypes.map((ut) => (
                    <option key={ut.id} value={ut.id}>
                      {ut.name}
                    </option>
                  ))}
                </Select>
              </div>

              {isSystemAdmin && form.userTypeId !== String(UserType.SystemAdmin) && (
                <BranchAccessPicker branches={branchOptions} allBranches={form.allBranches} branchIds={form.branchIds} onChange={(v) => setForm({ ...form, ...v })} />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit User</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="text-sm text-gray-500 mb-2">
                Username: <span className="font-medium text-gray-900">{editingUser.username}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <Select
                  required
                  value={editForm.userTypeId}
                  onChange={(e) => setEditForm({ ...editForm, userTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select user type</option>
                  {userTypes.map((ut) => (
                    <option key={ut.id} value={ut.id}>
                      {ut.name}
                    </option>
                  ))}
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Active
              </label>

              {isSystemAdmin && editingUser.userTypeId !== UserType.SystemAdmin && (
                <BranchAccessPicker branches={branchOptions} allBranches={editForm.allBranches} branchIds={editForm.branchIds} onChange={(v) => setEditForm({ ...editForm, ...v })} />
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h4 className="text-base font-semibold text-gray-900">{shown.reset ? 'New temporary password' : 'Account created'}</h4>
            <p className="mt-1 text-sm text-gray-600">Give this to <b>{shown.username}</b>. It is shown <b>only now</b> and cannot be looked up later. They must choose their own password at the first sign-in.</p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
              <code className="flex-1 select-all break-all font-mono text-base tracking-wide text-gray-900">{shown.password}</code>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(shown.password); setCopied(true); } catch { setCopied(false); }
                }}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">If it is lost, use Reset Password to make a new one.</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => { setShown(null); setCopied(false); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">I have noted it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
