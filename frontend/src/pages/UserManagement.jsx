import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';
import Select from 'react-select';

const customStyles = {
  control: (base, state) => ({
    ...base,
    border: state.isFocused ? '1px solid #9B8EC7' : '1px solid #e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(155, 142, 199, 0.3)' : 'none',
    borderRadius: '0.75rem',
    minHeight: '42px',
    backgroundColor: state.isDisabled ? '#f8fafc' : '#ffffff',
    fontSize: '0.875rem'
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#9B8EC7' : state.isFocused ? '#f1f5f9' : 'transparent',
    color: state.isSelected ? '#ffffff' : '#334155',
    cursor: 'pointer',
    fontSize: '0.875rem'
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 50,
  })
};

const ROLE_COLORS = {
  admin: 'bg-theme-purple text-white',
  manager: 'bg-theme-mint text-slate-800',
  editor: 'bg-theme-lavender text-slate-900',
};

export default function UserManagement() {
  const currentUser = useSelector(selectUser);
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor', assignedManager: '' });
  const [formError, setFormError] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = showDeleted ? '/users?showDeleted=true' : '/users';
      const { data } = await api.get(url);
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [showDeleted]);

  const handleToggleStatus = async (userId, currentStatus) => {
    setActionLoading(userId + '_status');
    try {
      await api.patch(`/users/${userId}/status`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(userId + '_delete');
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (userId) => {
    setActionLoading(userId + '_restore');
    try {
      await api.patch(`/users/${userId}/restore`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    try {
      if (editUserId) {
        // Exclude password when editing
        const { password, ...updateData } = form;
        await api.patch(`/users/${editUserId}`, updateData);
      } else {
        await api.post('/users', form);
      }
      setForm({ name: '', email: '', password: '', role: 'editor', assignedManager: '' });
      setEditUserId(null);
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setFormSaving(false);
    }
  };

  const handleEditClick = (u) => {
    setEditUserId(u._id);
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: u.role || 'editor',
      assignedManager: u.assignedManager?._id || ''
    });
    setShowForm(true);
    // scroll to top where form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditUserId(null);
    setForm({ name: '', email: '', password: '', role: 'editor', assignedManager: '' });
    setFormError(null);
  };

  // Roles a manager can assign/create
  const allowedRoles = isAdmin
    ? ['admin', 'manager', 'editor']
    : ['editor'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} total users</p>
        </div>
        <button
          id="create-user-btn"
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-purple text-white font-bold rounded-xl
            hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Create / Edit user form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">
            {editUserId ? 'Edit User' : 'Create New User'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{formError}</div>
          )}
          <form onSubmit={handleSubmitUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            {!editUserId && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password *</label>
                <input
                  type="password"
                  required={!editUserId}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="min. 6 characters"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role *</label>
              <Select
                value={{ value: form.role, label: form.role.charAt(0).toUpperCase() + form.role.slice(1) }}
                onChange={(option) => setForm((f) => ({ ...f, role: option.value }))}
                isDisabled={editUserId && form.role === 'admin' && !isAdmin}
                options={allowedRoles.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
                styles={customStyles}
                isSearchable={false}
              />
            </div>
            {isAdmin && form.role === 'editor' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign Manager (Optional)</label>
                <Select
                  value={
                    form.assignedManager
                      ? {
                          value: form.assignedManager,
                          label: users.find(u => u._id === form.assignedManager)?.name || 'Unknown'
                        }
                      : null
                  }
                  onChange={(option) => setForm((f) => ({ ...f, assignedManager: option ? option.value : '' }))}
                  options={users.filter(u => u.role === 'manager').map(m => ({ value: m._id, label: m.name }))}
                  styles={customStyles}
                  isClearable
                  placeholder="— Unassigned —"
                  noOptionsMessage={() => "No managers found"}
                />
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={formSaving}
                className="px-6 py-2.5 bg-theme-purple text-white font-bold rounded-xl
                  hover:bg-purple-600 transition-all disabled:opacity-60"
              >
                {formSaving ? 'Saving…' : editUserId ? 'Save Changes' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="rounded border-gray-300 text-theme-purple focus:ring-theme-purple"
            />
            <span className="text-sm font-medium text-slate-700">Show Deleted (Trash)</span>
          </label>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Name</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Manager</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Joined</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-theme-lavender flex items-center justify-center
                        text-slate-700 font-bold text-xs flex-shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p>{u.name}</p>
                        {u._id === currentUser?.id && (
                          <span className="text-[10px] text-theme-purple font-bold">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {u.assignedManager?.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold
                        ${u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Cannot perform actions on yourself or other admins if you are an admin */}
                        {u._id !== currentUser?.id && !(isAdmin && u.role === 'admin') && (
                          u.deletedAt ? (
                            isAdmin && (
                              <button
                                onClick={() => handleRestore(u._id)}
                                disabled={actionLoading === u._id + '_restore'}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
                              >
                                Restore
                              </button>
                            )
                          ) : (
                            <>
                              {isAdmin && (
                                <Link
                                  to={`/users/${u._id}/permissions`}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200
                                    rounded-lg hover:border-theme-purple hover:text-theme-purple transition-colors"
                                >
                                  Permissions
                                </Link>
                              )}
                              <button
                                onClick={() => handleEditClick(u)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200
                                  rounded-lg hover:border-theme-purple hover:text-theme-purple transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u._id, u.status)}
                                disabled={actionLoading === u._id + '_status'}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-60
                                  ${u.status === 'active'
                                    ? 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    : 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                                  }`}
                              >
                                {actionLoading === u._id + '_status' ? '…' : u.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(u._id)}
                                  disabled={actionLoading === u._id + '_delete'}
                                  className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
