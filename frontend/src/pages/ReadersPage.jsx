import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function ReadersPage() {
  const [readers, setReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedReader, setSelectedReader] = useState(null); // for detail slide-over/modal

  const fetchReaders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/users?type=reader');
      setReaders(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load readers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReaders();
  }, []);

  const handleToggleStatus = async (readerId) => {
    setActionLoading(readerId);
    try {
      await api.patch(`/users/${readerId}/status`);
      fetchReaders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update reader status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReaders = readers.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchEmail = r.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const totalReaders = readers.length;
  const activeCount = readers.filter((r) => r.status === 'active').length;
  const totalReadCount = readers.reduce((acc, r) => acc + (r.readArticlesCount || 0), 0);
  const totalBookmarks = readers.reduce((acc, r) => acc + (r.bookmarksCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Portal Readers & Audience</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Monitor reader behavior, topic interests, bookmarks, and streaks</p>
          </div>
        </div>

        <button
          onClick={fetchReaders}
          className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Readers
        </button>
      </div>

      {/* Reader Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Readers</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalReaders}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Accounts</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Articles Read</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{totalReadCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Saved Bookmarks</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{totalBookmarks}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search readers by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase">Status:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-emerald-700'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg transition ${statusFilter === 'inactive' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-amber-700'}`}
            >
              Suspended
            </button>
          </div>
        </div>
      </div>

      {/* Readers Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p>Loading portal readers...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredReaders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-base font-semibold text-slate-600">No readers found</p>
            <p className="text-xs text-slate-400 mt-1">When readers register on the public portal, they will automatically appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Reader</th>
                  <th className="px-6 py-4">Reading Activity</th>
                  <th className="px-6 py-4">Top Topic Interests</th>
                  <th className="px-6 py-4">Joined / Last Read</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReaders.map((r) => {
                  const isDeactivated = r.status === 'inactive';
                  const interestsObj = r.interests || {};
                  const sortedInterests = Object.entries(interestsObj)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100">
                            {r.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{r.name}</p>
                            <p className="text-xs text-slate-400">{r.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-medium" title="Articles read">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {r.readArticlesCount || 0}
                          </span>

                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 px-2.5 py-1 rounded-lg text-purple-700 font-medium" title="Bookmarks saved">
                            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {r.bookmarksCount || 0}
                          </span>

                          {(r.readingStreak || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 px-2 py-1 rounded-lg text-amber-700 font-semibold" title="Daily Streak">
                              🔥 {r.readingStreak}d
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sortedInterests.length > 0 ? (
                            sortedInterests.map(([tag, score]) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium"
                              >
                                {tag} <span className="text-indigo-400 text-[10px]">({score})</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No topic data yet</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div>
                          <p className="font-medium text-slate-700">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {r.lastReadDate ? `Read ${new Date(r.lastReadDate).toLocaleDateString()}` : 'Never read'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                          isDeactivated ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDeactivated ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          {isDeactivated ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedReader(r)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => handleToggleStatus(r._id)}
                            disabled={actionLoading === r._id}
                            className={`p-1.5 rounded-lg transition text-xs font-semibold ${
                              isDeactivated ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                            }`}
                            title={isDeactivated ? 'Reactivate Reader' : 'Suspend Reader'}
                          >
                            {isDeactivated ? 'Reactivate' : 'Suspend'}
                          </button>
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

      {/* Reader Detail Modal */}
      {selectedReader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center">
                  {selectedReader.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{selectedReader.name}</h3>
                  <p className="text-xs text-slate-400">{selectedReader.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReader(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Articles Read</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{selectedReader.readArticlesCount || 0}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Bookmarks</p>
                  <p className="text-lg font-bold text-purple-700 mt-0.5">{selectedReader.bookmarksCount || 0}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Streak</p>
                  <p className="text-lg font-bold text-amber-600 mt-0.5">🔥 {selectedReader.readingStreak || 0}d</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Topic Affinities & Algorithm Weights</h4>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {Object.entries(selectedReader.interests || {}).length > 0 ? (
                    Object.entries(selectedReader.interests || {})
                      .sort((a, b) => b[1] - a[1])
                      .map(([tag, score]) => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg text-xs bg-white text-indigo-700 border border-indigo-100 font-semibold shadow-xs">
                          {tag}: <span className="text-indigo-500 font-bold">+{score} pts</span>
                        </span>
                      ))
                  ) : (
                    <p className="text-xs text-slate-400 p-2 italic">Reader has not interacted with specific topics yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent Reading History</h4>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto space-y-1">
                  {selectedReader.readArticles && selectedReader.readArticles.length > 0 ? (
                    selectedReader.readArticles.slice(-10).reverse().map((slug, idx) => (
                      <div key={idx} className="text-xs text-slate-700 font-medium py-1 px-2 rounded-lg bg-white border border-slate-100 truncate">
                        📄 {slug}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 p-2 italic">No articles read yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedReader(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
