import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Datepicker from 'react-tailwindcss-datepicker';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-theme-mint text-slate-800',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { draft: 'Draft', pending_approval: 'Pending', approved: 'Approved', scheduled: 'Scheduled', live: 'Live', rejected: 'Rejected' };
const STATUSES = ['', 'draft', 'pending_approval', 'scheduled', 'live', 'rejected'];

export default function PostList() {
  const user = useSelector(selectUser);
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, postId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [approveModal, setApproveModal] = useState({ 
    open: false, postId: null, isBreaking: false, priority: 'normal', breakingExpiresAt: '', breakingExpiresTime: '00:00' 
  });
  const [scheduledPublishAt, setScheduledPublishAt] = useState('');
  const [scheduledPublishTime, setScheduledPublishTime] = useState('00:00');
  const [showDeleted, setShowDeleted] = useState(false);

  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set('status', status);
      if (showDeleted) params.set('showDeleted', 'true');
      const { data } = await api.get(`/posts?${params}`);
      setPosts(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, [status, page, showDeleted]);

  const handleApprove = async () => {
    setActionLoading(approveModal.postId + '_approve');
    try {
      const payload = {
        ...(scheduledPublishAt ? { scheduledPublishAt: new Date(`${scheduledPublishAt}T${scheduledPublishTime}:00`).toISOString() } : {}),
        isBreaking: approveModal.isBreaking,
        priority: approveModal.priority,
        breakingExpiresAt: approveModal.breakingExpiresAt ? new Date(`${approveModal.breakingExpiresAt}T${approveModal.breakingExpiresTime}:00`).toISOString() : null,
      };
      await api.patch(`/posts/${approveModal.postId}/approve`, payload);
      setApproveModal({ open: false, postId: null, isBreaking: false, priority: 'normal', breakingExpiresAt: '', breakingExpiresTime: '00:00' });
      setScheduledPublishAt('');
      setScheduledPublishTime('00:00');
      fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Approve failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(rejectModal.postId + '_reject');
    try {
      await api.patch(`/posts/${rejectModal.postId}/reject`, { reason: rejectReason });
      setRejectModal({ open: false, postId: null });
      setRejectReason('');
      fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  };

  const canApprove = ['admin', 'manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  const handleDelete = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setActionLoading(postId + '_delete');
    try {
      await api.delete(`/posts/${postId}`);
      fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (postId) => {
    setActionLoading(postId + '_restore');
    try {
      await api.patch(`/posts/${postId}/restore`);
      fetchPosts();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Posts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {pagination.total ?? 0} total posts
          </p>
        </div>
        <Link
          to="/posts/new"
          id="create-post-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-purple text-white font-bold rounded-xl
            hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
              ${status === s
                ? 'bg-theme-purple text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-theme-purple hover:text-theme-purple'
              }`}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>
      
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">{error}</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-medium">No posts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Author</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Category</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Updated</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map((post) => (
                  <tr key={post._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 max-w-xs">
                      <div className="flex items-center gap-2">
                        <Link to={`/posts/${post._id}`} className="hover:text-theme-purple transition-colors line-clamp-1">
                          {post.title}
                        </Link>
                        {post.isBreaking && (
                          <span className="text-[10px] font-black tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                            🔴 BREAKING
                          </span>
                        )}
                        {post.priority && post.priority !== 'normal' && (
                          <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm whitespace-nowrap ${post.priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                            {post.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <span>{post.author?.name}</span>
                        {post.coAuthors?.length > 0 && (
                          <span 
                            className="text-[10px] font-bold text-theme-purple bg-theme-purple/10 px-1.5 py-0.5 rounded-full" 
                            title={post.coAuthors.map(c => c.name).join(', ')}
                          >
                            +{post.coAuthors.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{post.category?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/posts/${post._id}`}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200
                            rounded-lg hover:border-theme-purple hover:text-theme-purple transition-colors"
                        >
                          Edit
                        </Link>
                        {canApprove && post.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => {
                                setApproveModal({ 
                                  open: true, postId: post._id, 
                                  isBreaking: post.isBreaking || false, 
                                  priority: post.priority || 'normal',
                                  breakingExpiresAt: post.breakingExpiresAt ? new Date(post.breakingExpiresAt).toISOString().slice(0, 10) : '',
                                  breakingExpiresTime: post.breakingExpiresAt ? new Date(post.breakingExpiresAt).toISOString().slice(11, 16) : '00:00',
                                });
                              }}
                              disabled={actionLoading === post._id + '_approve'}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 rounded-lg
                                hover:bg-emerald-600 transition-colors disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ open: true, postId: post._id })}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 rounded-lg
                                hover:bg-red-600 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {post.deletedAt ? (
                          isAdmin && (
                            <button
                              onClick={() => handleRestore(post._id)}
                              disabled={actionLoading === post._id + '_restore'}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
                            >
                              Restore
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleDelete(post._id)}
                            disabled={actionLoading === post._id + '_delete'}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSearchParams({ page: page - 1, ...(status && { status }) })}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg
                  disabled:opacity-40 hover:border-theme-purple hover:text-theme-purple transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setSearchParams({ page: page + 1, ...(status && { status }) })}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 text-sm font-semibold border border-slate-200 rounded-lg
                  disabled:opacity-40 hover:border-theme-purple hover:text-theme-purple transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Reject Post</h3>
            <p className="text-slate-500 text-sm mb-4">Please provide a reason for rejection so the author can revise.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setRejectModal({ open: false, postId: null }); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl
                  hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Approve Modal */}
      {approveModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Approve & Publish</h3>
            <p className="text-slate-500 text-sm mb-4">Choose whether to publish this post immediately or schedule it for a future date.</p>
            
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-slate-700">Scheduled Date & Time (Optional)</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Datepicker
                    useRange={false}
                    asSingle={true}
                    value={{ startDate: scheduledPublishAt, endDate: scheduledPublishAt }}
                    onChange={(newValue) => setScheduledPublishAt(newValue?.startDate || '')}
                    displayFormat="YYYY-MM-DD"
                    inputClassName="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple focus:border-theme-purple"
                  />
                </div>
                <input
                  type="time"
                  value={scheduledPublishTime}
                  onChange={(e) => setScheduledPublishTime(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple focus:border-theme-purple bg-white"
                />
              </div>
              <p className="text-xs text-slate-400">Leave empty to publish immediately.</p>
            </div>

            <div className="space-y-3 mb-6 pt-4 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-700">Editorial Priority</label>
              <Select
                options={[
                  { value: 'normal', label: '⚪️ Normal' },
                  { value: 'high', label: '🟡 High' },
                  { value: 'urgent', label: '🔴 Urgent' }
                ]}
                value={{
                  value: approveModal.priority,
                  label: approveModal.priority === 'normal' ? '⚪️ Normal' : approveModal.priority === 'high' ? '🟡 High' : '🔴 Urgent'
                }}
                onChange={(selected) => setApproveModal(m => ({ ...m, priority: selected.value }))}
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '0.75rem',
                    borderColor: '#e2e8f0',
                    padding: '2px',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#cbd5e1' }
                  })
                }}
              />
            </div>

            <div className="space-y-3 mb-6 pt-4 border-t border-slate-100">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-bold text-slate-700">Mark as Breaking News</span>
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={approveModal.isBreaking}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setApproveModal(m => ({ 
                        ...m, 
                        isBreaking: checked,
                        breakingExpiresAt: checked && !m.breakingExpiresAt 
                          ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16) 
                          : m.breakingExpiresAt
                      }));
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                </div>
              </label>
              
              {approveModal.isBreaking && (
                <div className="mt-2 animate-fade-in bg-red-50 text-red-900 p-3 rounded-xl border border-red-100">
                  <label className="block text-xs font-bold mb-1">Remove Breaking Badge At:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1">
                      <Datepicker
                        useRange={false}
                        asSingle={true}
                        value={{ startDate: approveModal.breakingExpiresAt, endDate: approveModal.breakingExpiresAt }}
                        onChange={(newValue) => setApproveModal(m => ({ ...m, breakingExpiresAt: newValue?.startDate || '' }))}
                        displayFormat="YYYY-MM-DD"
                        inputClassName="w-full text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/50 bg-white"
                      />
                    </div>
                    <input
                      type="time"
                      value={approveModal.breakingExpiresTime}
                      onChange={(e) => setApproveModal(m => ({ ...m, breakingExpiresTime: e.target.value }))}
                      className="text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/50 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setApproveModal({ open: false, postId: null, isBreaking: false, priority: 'normal', breakingExpiresAt: '', breakingExpiresTime: '00:00' }); setScheduledPublishAt(''); setScheduledPublishTime('00:00'); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl
                  hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                {scheduledPublishAt ? 'Schedule' : 'Publish Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
