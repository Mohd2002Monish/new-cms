import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-theme-mint text-slate-800',
  live: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  live: 'Live',
  rejected: 'Rejected',
};

export default function Dashboard() {
  const user = useSelector(selectUser);
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, postsRes] = await Promise.all([
          api.get('/users/stats'),
          api.get('/posts?limit=5'),
        ]);

        setStats(statsRes.data.data);
        setRecentPosts(postsRes.data.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const StatCard = ({ label, value, color, icon }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value ?? 0}</p>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span className="text-theme-purple">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-500 mt-0.5">Here's what's happening in your CMS today.</p>
        </div>
        <Link
          to="/posts/new"
          id="new-post-btn"
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-purple text-white font-bold rounded-xl
            hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </Link>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Posts" value={stats?.totalPosts} color="bg-theme-purple/10" icon="📰" />
          <StatCard label="Live" value={stats?.livePosts} color="bg-emerald-100" icon="🟢" />
          <StatCard label="Pending Review" value={stats?.pendingPosts} color="bg-amber-100" icon="⏳" />
          <StatCard label="Drafts" value={stats?.draftPosts} color="bg-slate-100" icon="✏️" />
        </div>
      )}

      {/* Recent posts table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Recent Posts</h2>
          <Link to="/posts" className="text-sm text-theme-purple font-semibold hover:underline">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentPosts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-medium">No posts yet. Create your first post!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Author</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">Updated</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentPosts.map((post) => (
                  <tr key={post._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800 max-w-xs truncate">{post.title}</td>
                    <td className="px-6 py-4 text-slate-600">{post.author?.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/posts/${post._id}`}
                        className="text-theme-purple font-semibold hover:underline text-xs"
                      >
                        Open →
                      </Link>
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
