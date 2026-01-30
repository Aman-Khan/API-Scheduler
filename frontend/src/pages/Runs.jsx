import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, CheckCircle, XCircle, Clock, Calendar, RefreshCw, ListFilter, X } from 'lucide-react';
import { getRuns, getSchedules } from '../api/client';
import { formatDateTime } from '../utils/dateUtils';

const Runs = () => {
  // --- Filter States ---
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // 1. Fetch Schedules
  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await getSchedules();
      return response.data;
    },
  });

  // 2. Fetch Runs (with Status & Date Filters)
  const { data: runs, isLoading, refetch } = useQuery({
    queryKey: ['runs', selectedSchedule, selectedStatus, dateRange],
    queryFn: async () => {
      const params = { limit: 100 };
      
      if (selectedSchedule) params.schedule_id = selectedSchedule;
      if (selectedStatus) params.status = selectedStatus;
      if (dateRange.start) params.start_date = new Date(dateRange.start).toISOString();
      if (dateRange.end) params.end_date = new Date(dateRange.end).toISOString();

      const response = await getRuns(params);
      return response.data;
    },
    refetchInterval: 3000,
  });

  // Light Mode Badges
  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3.5 h-3.5" />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5" />
        Failure
      </span>
    );
  };

  // Light Mode Text Colors
  const getStatusCodeColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-600';
    if (code >= 400 && code < 500) return 'text-yellow-600';
    if (code >= 500) return 'text-red-600';
    return 'text-slate-400';
  };

  const clearFilters = () => {
    setSelectedSchedule('');
    setSelectedStatus('');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = selectedSchedule || selectedStatus || dateRange.start || dateRange.end;

  if (isLoading) {
    return <div className="rounded-xl p-6 animate-pulse bg-white h-96 border border-slate-200 shadow-sm"></div>;
  }

  return (
    <div className="space-y-6">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Run History</h3>
          <p className="text-sm text-slate-500">
            Monitor execution logs, latency, and status codes.
          </p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="self-start md:self-auto flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* --- Filter Bar (Light Theme) --- */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          
          {/* Schedule Select */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Schedule
            </label>
            <div className="relative">
              <select
                className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2.5 appearance-none shadow-sm"
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
              >
                <option value="">All Schedules</option>
                {schedules?.map((schedule) => {
                  const schedId = schedule.schedule_id || schedule.id;
                  return (
                    <option key={schedId} value={schedId}>
                      #{schedId} - {schedule.target?.url || `Target ${schedule.target_id}`}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                <ListFilter className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Status Select */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select
              className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2.5 shadow-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Any</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </div>

          {/* Date Range Group */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Time Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="datetime-local"
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 block p-2.5 shadow-sm"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <input 
                type="datetime-local"
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 block p-2.5 shadow-sm"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>

          {/* Clear Button */}
          <div className="lg:col-span-1 flex justify-end pb-1">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full justify-center lg:w-auto"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- Stats Cards (Light Theme) --- */}
      {runs && runs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Runs</p>
            <p className="text-2xl font-bold text-slate-800">{runs.length}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Success</p>
            <p className="text-2xl font-bold text-emerald-600">
              {runs.filter((r) => r.status === 'SUCCESS').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {runs.filter((r) => r.status === 'FAILURE').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Latency</p>
            <p className="text-2xl font-bold text-amber-500">
              {runs.length > 0
                ? (runs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / runs.length).toFixed(1)
                : 0}
              <span className="text-sm font-normal text-slate-400 ml-1">ms</span>
            </p>
          </div>
        </div>
      )}

      {/* --- Runs Table (Light Theme) --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Run ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Executed At</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs && runs.length > 0 ? (
                runs.map((run) => {
                  const actualRunId = run.run_id || run.id;
                  return (
                    <tr key={actualRunId} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600 group-hover:text-slate-900">
                        #{actualRunId}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-blue-600 font-medium">
                        {run.schedule_id ? `#${run.schedule_id}` : <span className="text-slate-400 italic">Deleted</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm font-medium">{formatDateTime(run.executed_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-mono font-bold text-sm ${getStatusCodeColor(run.status_code)}`}>
                          {run.status_code || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-amber-600">
                          {run.latency_ms} ms
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ListFilter className="w-8 h-8 opacity-20" />
                      <p className="text-sm text-slate-500">No runs found matching these filters.</p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline mt-1">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-4">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <span>Live updates active</span>
      </div>
    </div>
  );
};

export default Runs;
