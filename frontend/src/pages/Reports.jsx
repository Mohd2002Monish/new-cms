import { useState, useEffect } from 'react';
import api from '../services/api.js';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Select from 'react-select';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, all
  
  // Data states
  const [overview, setOverview] = useState(null);
  const [postsOverTime, setPostsOverTime] = useState([]);
  const [editorOutput, setEditorOutput] = useState([]);
  const [turnaround, setTurnaround] = useState(null);
  const [rejectionRate, setRejectionRate] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [managerWorkload, setManagerWorkload] = useState([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Calculate from/to dates
      const to = new Date();
      let from = null;
      if (timeRange === '7d') from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (timeRange === '30d') from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (timeRange === '90d') from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);

      const params = {};
      if (from) params.from = from.toISOString();
      params.to = to.toISOString();
      
      // Determine group by for line chart based on timeRange
      if (timeRange === '7d' || timeRange === '30d') params.groupBy = 'day';
      else if (timeRange === '90d') params.groupBy = 'week';
      else params.groupBy = 'month';

      const [
        overviewRes,
        postsOverTimeRes,
        editorOutputRes,
        turnaroundRes,
        rejectionRateRes,
        categoryDistRes,
        managerWorkloadRes
      ] = await Promise.all([
        api.get('/admin/reports/overview'),
        api.get('/admin/reports/posts-over-time', { params }),
        api.get('/admin/reports/editor-output', { params }),
        api.get('/admin/reports/turnaround', { params }),
        api.get('/admin/reports/rejection-rate', { params }),
        api.get('/admin/reports/category-dist', { params }),
        api.get('/admin/reports/manager-workload')
      ]);

      setOverview(overviewRes.data.data);
      setPostsOverTime(postsOverTimeRes.data.data);
      setEditorOutput(editorOutputRes.data.data);
      setTurnaround(turnaroundRes.data.data);
      setRejectionRate(rejectionRateRes.data.data);
      setCategoryDist(categoryDistRes.data.data);
      setManagerWorkload(managerWorkloadRes.data.data);

    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  if (loading && !overview) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  // Formatting for PieChart
  const pieData = overview?.postStatuses.map(item => ({
    name: item._id,
    value: item.count
  })) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor CMS health, editorial output, and approval speeds.</p>
        </div>
        <Select
          options={[
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
            { value: 'all', label: 'All Time' }
          ]}
          value={{
            value: timeRange,
            label: timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : timeRange === '90d' ? 'Last 90 Days' : 'All Time'
          }}
          onChange={(selected) => setTimeRange(selected.value)}
          className="text-sm w-44"
          styles={{
            control: (base) => ({
              ...base,
              borderRadius: '0.75rem',
              borderColor: '#e2e8f0',
              padding: '2px',
              boxShadow: 'none',
              backgroundColor: '#f8fafc',
              '&:hover': { borderColor: '#cbd5e1' }
            })
          }}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Posts</p>
          <p className="text-3xl font-black text-slate-800">{overview?.totalPosts || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-3xl font-black text-slate-800">{overview?.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Active Users (30d)</p>
          <p className="text-3xl font-black text-emerald-600">{overview?.activeUsers30d || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Turnaround</p>
          <p className="text-3xl font-black text-theme-purple">
            {turnaround?.avgTurnaround ? `${turnaround.avgTurnaround.toFixed(1)}h` : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Posts Over Time */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Publications Over Time</h3>
          <div className="h-72 w-full">
            {postsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={postsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="_id" tick={{fontSize: 12}} stroke="#94a3b8" />
                  <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="count" name="Posts" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data for selected period</div>
            )}
          </div>
        </div>

        {/* Posts by Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Posts By Status</h3>
          <div className="h-72 w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Editors */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Top Editors (Published Output)</h3>
          <div className="h-72 w-full">
            {editorOutput.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={editorOutput} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 12}} stroke="#94a3b8" />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12}} stroke="#475569" />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" name="Posts" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data for selected period</div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Category Distribution</h3>
          <div className="h-72 w-full">
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} stroke="#94a3b8" />
                  <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="count" name="Posts" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data for selected period</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Rejection Rate Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Editor Quality (Rejection Rate)</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0">
                <tr>
                  <th className="px-6 py-3">Editor</th>
                  <th className="px-6 py-3 text-right">Reviewed</th>
                  <th className="px-6 py-3 text-right">Rejected</th>
                  <th className="px-6 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectionRate.length > 0 ? (
                  rejectionRate.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{row.totalReviewed}</td>
                      <td className="px-6 py-3 text-right text-red-600">{row.totalRejected}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-700">
                        {row.rejectionRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="p-8 text-center text-slate-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manager Workload Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Manager Workload</h3>
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">Pending Approvals</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs sticky top-0">
                <tr>
                  <th className="px-6 py-3">Manager</th>
                  <th className="px-6 py-3 text-right">Queue Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managerWorkload.length > 0 ? (
                  managerWorkload.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        {row.name}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-slate-700">
                        {row.pendingCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="2" className="p-8 text-center text-slate-400">All queues clear! ✨</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
