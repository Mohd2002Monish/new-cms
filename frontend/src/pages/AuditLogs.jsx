import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import Papa from 'papaparse';
import Select from 'react-select';
import Datepicker from 'react-tailwindcss-datepicker';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    dateFrom: '',
    dateTo: '',
    actorId: ''
  });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      // Clean empty filters
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      alert('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const exportCsv = async () => {
    try {
      // Fetch all for export or just current page? Usually all matching filters
      // Let's fetch up to 1000 logs for export
      const params = { page: 1, limit: 1000, ...filters };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const res = await api.get('/admin/audit-logs', { params });
      const exportData = res.data.data.map(log => ({
        Date: new Date(log.createdAt).toLocaleString(),
        Actor: log.actorEmail || log.actorId?.email || 'System',
        Role: log.actorRole,
        Action: log.action,
        TargetType: log.targetType,
        TargetLabel: log.targetLabel,
        IP: log.ipAddress
      }));

      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed', error);
      alert('Export failed');
    }
  };

  const toggleRow = (id) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
        <button 
          onClick={exportCsv}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm text-sm"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Action</label>
          <input 
            type="text" 
            name="action" 
            value={filters.action} 
            onChange={handleFilterChange}
            className="border rounded px-2 py-1 text-sm w-40" 
            placeholder="e.g. POST_APPROVED"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Target Type</label>
          <Select 
            options={[
              { value: '', label: 'All' },
              { value: 'Post', label: 'Post' },
              { value: 'User', label: 'User' },
              { value: 'Category', label: 'Category' },
              { value: 'Permission', label: 'Permission' },
              { value: 'Auth', label: 'Auth' }
            ]}
            value={{
              value: filters.targetType,
              label: filters.targetType || 'All'
            }}
            onChange={(selected) => handleFilterChange({ target: { name: 'targetType', value: selected.value } })}
            className="text-sm w-48"
            styles={{
              control: (base) => ({
                ...base,
                minHeight: '34px',
                height: '34px'
              })
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date Range</label>
          <div className="w-64">
            <Datepicker
              value={{ startDate: filters.dateFrom, endDate: filters.dateTo }}
              onChange={(newValue) => {
                setFilters(prev => ({
                  ...prev,
                  dateFrom: newValue?.startDate || '',
                  dateTo: newValue?.endDate || ''
                }));
              }}
              showShortcuts={true}
              inputClassName="border rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        {loading && <div className="p-4 text-center text-gray-500">Loading...</div>}
        {!loading && logs.length === 0 && <div className="p-4 text-center text-gray-500">No logs found.</div>}
        
        {!loading && logs.length > 0 && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <React.Fragment key={log._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.actorEmail || log.actorId?.email || 'System'}</div>
                      <div className="text-xs text-gray-500">{log.actorRole}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.targetType}: {log.targetLabel || log.targetId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer" onClick={() => toggleRow(log._id)}>
                      {expandedRows.has(log._id) ? 'Hide Diff' : 'View Diff'}
                    </td>
                  </tr>
                  {expandedRows.has(log._id) && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-red-600 mb-2">Previous State</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.previousState, null, 2) || 'null'}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-green-600 mb-2">New State</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.newState, null, 2) || 'null'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing page {pagination.page} of {pagination.pages} ({pagination.total} records)
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border rounded bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
