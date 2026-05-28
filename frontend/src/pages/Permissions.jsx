import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';

const PERMISSION_LABELS = {
  canCreateUser:       { label: 'Create Users',          desc: 'Allow this user to create new accounts' },
  canApprovePost:      { label: 'Approve Posts',         desc: 'Allow this user to approve and publish posts' },
  canDeletePost:       { label: 'Delete Posts',          desc: 'Allow this user to permanently delete posts' },
  canManageCats:       { label: 'Manage Categories',     desc: 'Allow this user to create and edit categories' },
  canActivateUser:     { label: 'Activate / Deactivate Users', desc: 'Allow this user to toggle account status' },
  canViewReports:      { label: 'View Reports',          desc: 'Allow this user to view analytics and reports' },
  canEditApprovedPost: { label: 'Edit Approved Posts',   desc: 'Allow this user to edit already-approved/live posts' },
};

export default function Permissions() {
  const { userId } = useParams();

  const [permData, setPermData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // which key is being saved
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/users/permissions/${userId}`);
      setPermData(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPermissions(); }, [userId]);

  const handleToggle = async (key, currentValue) => {
    setSaving(key);
    try {
      const { data } = await api.patch(`/users/permissions/${userId}`, { [key]: !currentValue });
      setPermData(data.data);
      setToast(`"${PERMISSION_LABELS[key].label}" ${!currentValue ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-medium">{error}</p>
        <Link to="/users" className="mt-4 inline-block text-theme-purple font-semibold hover:underline">
          ← Back to Users
        </Link>
      </div>
    );
  }

  const user = permData?.userId;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb header */}
      <div>
        <Link to="/users" className="text-sm text-theme-purple font-semibold hover:underline flex items-center gap-1 mb-2">
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-black text-slate-900">
          Permissions — <span className="text-theme-purple">{user?.name}</span>
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {user?.email} &middot; <span className="capitalize">{user?.role}</span>
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          ✓ {toast}
        </div>
      )}

      {/* Permission toggles */}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {Object.entries(PERMISSION_LABELS).map(([key, { label, desc }]) => {
          const isEnabled = !!permData?.[key];
          const isSaving = saving === key;

          return (
            <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors">
              <div className="flex-1 min-w-0 pr-6">
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>

              {/* Toggle switch */}
              <button
                id={`perm-toggle-${key}`}
                onClick={() => handleToggle(key, isEnabled)}
                disabled={!!saving}
                aria-checked={isEnabled}
                role="switch"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-purple/50
                  ${isEnabled ? 'bg-theme-purple' : 'bg-slate-200'}
                  ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                    ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
                {isSaving && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        Changes apply immediately. These override the user's default role-based permissions.
      </p>
    </div>
  );
}
