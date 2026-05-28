import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications?page=${page}&limit=${pagination.limit}`);
      setNotifications(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(pagination.page);
  }, [pagination.page]);

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">Stay updated on posts and account activities.</p>
        </div>
        <button
          onClick={handleMarkAllAsRead}
          className="px-4 py-2 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-medium text-lg text-slate-600">You're all caught up!</p>
            <p className="text-sm">No notifications found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notif) => (
              <li
                key={notif._id}
                className={`p-5 transition-colors hover:bg-slate-50 flex items-start gap-4 ${notif.isRead ? 'opacity-70' : 'bg-theme-purple/5'}`}
              >
                <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${notif.isRead ? 'bg-transparent' : 'bg-theme-purple'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-base ${notif.isRead ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                    {notif.message}
                  </p>
                  <p className="text-sm text-slate-500 mt-1.5 font-medium">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif._id)}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-theme-purple border border-theme-purple/20 rounded-lg hover:bg-theme-purple/10 transition-colors"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            className="px-4 py-2 border border-slate-200 rounded-xl font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 font-medium text-slate-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            className="px-4 py-2 border border-slate-200 rounded-xl font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
