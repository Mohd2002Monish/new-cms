import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';

export default function RateLimits() {
  const user = useSelector(selectUser);
  const [rateLimits, setRateLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRateLimits = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/rate-limits');
      setRateLimits(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rate limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRateLimits(); }, []);

  const handleClear = async (key) => {
    if (!window.confirm(`Are you sure you want to clear the rate limit for IP: ${key}?`)) return;
    setActionLoading(key);
    try {
      await api.delete(`/admin/rate-limits/${encodeURIComponent(key)}`);
      fetchRateLimits();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear rate limit');
    } finally {
      setActionLoading(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="py-20 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Access Denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Rate Limits Monitoring</h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage blocked IPs or active limits</p>
        </div>
        <button
          onClick={fetchRateLimits}
          className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">{error}</div>
        ) : rateLimits.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="font-medium">No active rate limits found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">IP / Identifier</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Request Count</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Expires At</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rateLimits.map((limit) => (
                  <tr key={limit.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-800">{limit.key}</td>
                    <td className="px-6 py-4 text-slate-600 font-semibold">
                      <span className={`px-2.5 py-1 rounded-full text-xs ${limit.hits > 50 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {limit.hits} hits
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(limit.expireAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleClear(limit.key)}
                        disabled={actionLoading === limit.key}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        {actionLoading === limit.key ? 'Clearing…' : 'Clear Limit'}
                      </button>
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
