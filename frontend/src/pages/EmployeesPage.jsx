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
  admin: 'bg-purple-100 text-purple-700 border border-purple-200',
  manager: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  editor: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
};

export default function EmployeesPage() {
  const currentUser = useSelector(selectUser);
  const isAdmin = currentUser?.role === 'admin';

  const [staff, setStaff] = useState([]);
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

  // Filter states
  const [roleFilter, setRoleFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/users?type=staff${showDeleted ? '&showDeleted=true' : ''}`;
      const { data } = await api.get(url);
      setStaff(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [showDeleted]);

  const filteredStaff = staff.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const handleToggleStatus = async (userId) => {
    setActionLoading(userId + '_status');
    try {
      await api.patch(`/users/${userId}/status`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    setActionLoading(userId + '_delete');
    try {
      await api.delete(`/users/${userId}`);
      fetchStaff();
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
      fetchStaff();
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
        const { password, ...updateData } = form;
        await api.patch(`/users/${editUserId}`, updateData);
      } else {
        await api.post('/users', form);
      }
      setForm({ name: '', email: '', password: '', role: 'editor', assignedManager: '' });
      setEditUserId(null);
      setShowForm(false);
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save staff member');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditUserId(null);
    setForm({ name: '', email: '', password: '', role: 'editor', assignedManager: '' });
    setFormError(null);
  };

  const allowedRoles = isAdmin ? ['admin', 'manager', 'editor'] : ['editor'];
  const managersList = staff.filter((u) => u.role === 'manager' || u.role === 'admin');

  const adminCount = staff.filter(u => u.role === 'admin' && !u.deletedAt).length;
  const managerCount = staff.filter(u => u.role === 'manager' && !u.deletedAt).length;
  const editorCount = staff.filter(u => u.role === 'editor' && !u.deletedAt).length;

  return (
    <div className="space-y-6">
      {/* Header & Metric Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-theme-purple">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Newsroom Staff & Team</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Manage internal journalists, editors, and editorial managers</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (showForm) handleCancelForm();
              else setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-theme-purple text-white font-semibold text-sm rounded-xl
              hover:bg-purple-700 transition shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {showForm ? 'Cancel' : 'Add Staff Member'}
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{staff.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Administrators</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{adminCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Managers</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{managerCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Editors & Writers</p>
          <p className="text-2xl font-black text-indigo-700 mt-1">{editorCount}</p>
        </div>
      </div>

      {/* Create / Edit Form Modal/Drawer */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-md transition-all">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-theme-purple"></span>
            {editUserId ? 'Edit Staff Profile' : 'Onboard New Staff Member'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{formError}</div>
          )}
          <form onSubmit={handleSubmitUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Rohit Sharma"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Work Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="rohit@newsroom.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            {!editUserId && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Initial Password *</label>
                <input
                  type="password"
                  required={!editUserId}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Role *</label>
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
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Assigned Manager</label>
                <Select
                  value={
                    form.assignedManager
                      ? {
                          value: form.assignedManager,
                          label: managersList.find((m) => m._id === form.assignedManager)?.name || 'Select Manager',
                        }
                      : null
                  }
                  onChange={(option) => setForm((f) => ({ ...f, assignedManager: option ? option.value : '' }))}
                  options={managersList.map((m) => ({ value: m._id, label: `${m.name} (${m.role})` }))}
                  styles={customStyles}
                  isClearable
                  placeholder="Select a supervisor or leave blank"
                />
              </div>
            )}

            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-5 py-2 bg-theme-purple text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50"
              >
                {formSaving ? 'Saving...' : editUserId ? 'Update Staff Member' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Role pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 rounded-lg transition ${!roleFilter ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Roles
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'admin' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-purple-700'}`}
            >
              Admins
            </button>
            <button
              onClick={() => setRoleFilter('manager')}
              className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'manager' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-emerald-700'}`}
            >
              Managers
            </button>
            <button
              onClick={() => setRoleFilter('editor')}
              className={`px-3 py-1.5 rounded-lg transition ${roleFilter === 'editor' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-indigo-700'}`}
            >
              Editors
            </button>
          </div>

          {isAdmin && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded border-slate-300 text-theme-purple focus:ring-theme-purple/30"
              />
              Show archived
            </label>
          )}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple mb-3"></div>
            <p>Loading newsroom staff...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-600">No staff members found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or click "Add Staff Member" to invite team members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Manager / Supervisor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((u) => {
                  const isDeactivated = u.status === 'inactive';
                  const isDeleted = Boolean(u.deletedAt);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {u.assignedManager ? (
                          <span className="inline-flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            {u.assignedManager.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                          isDeleted
                            ? 'bg-red-50 text-red-600'
                            : isDeactivated
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isDeleted ? 'bg-red-500' : isDeactivated ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                          {isDeleted ? 'Archived' : isDeactivated ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isDeleted && (
                            <Link
                              to={`/chat?user=${u._id}`}
                              title={`Chat with ${u.name}`}
                              className="px-2.5 py-1 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition text-xs font-semibold flex items-center gap-1"
                            >
                              <span>💬</span>
                              <span className="hidden xl:inline">Chat</span>
                            </Link>
                          )}

                          {isAdmin && !isDeleted && (
                            <Link
                              to={`/users/${u._id}/permissions`}
                              title="Manage Granular Permissions"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition text-xs font-medium"
                            >
                              Permissions
                            </Link>
                          )}

                          <button
                            onClick={() => handleEditClick(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Edit Staff Member"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u._id)}
                            disabled={actionLoading === u._id + '_status'}
                            className={`p-1.5 rounded-lg transition ${
                              isDeactivated ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isDeactivated ? 'Activate Account' : 'Suspend Account'}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>

                          {isAdmin && (
                            isDeleted ? (
                              <button
                                onClick={() => handleRestore(u._id)}
                                disabled={actionLoading === u._id + '_restore'}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Restore Staff Member"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDelete(u._id)}
                                disabled={actionLoading === u._id + '_delete'}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                title="Archive Staff Member"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
