import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getRuns, getSchedules } from '../api/client';
import { formatDateTime } from '../utils/dateUtils';

const Runs = () => {
  const [selectedSchedule, setSelectedSchedule] = useState('');

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await getSchedules();
      return response.data;
    },
  });

  const { data: runs, isLoading } = useQuery({
    queryKey: ['runs', selectedSchedule],
    queryFn: async () => {
      const params = { limit: 100 };
      if (selectedSchedule) {
        params.schedule_id = selectedSchedule;
      }
      const response = await getRuns(params);
      return response.data;
    },
    refetchInterval: 3000,
  });

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') {
      return (
        <span className="badge badge-success">
          <CheckCircle className="w-3 h-3" />
          Success
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        <XCircle className="w-3 h-3" />
        Failure
      </span>
    );
  };

  const getStatusCodeColor = (code) => {
    if (code >= 200 && code < 300) return 'text-green-400';
    if (code >= 400 && code < 500) return 'text-yellow-400';
    if (code >= 500) return 'text-red-400';
    return 'text-slate-400';
  };

  if (isLoading) {
    return <div className="card p-6 animate-pulse bg-slate-800 h-96"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Run History</h3>
          <p className="text-sm text-slate-400 mt-1">
            View execution logs and results
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            className="input w-64"
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
          >
            <option value="">All Schedules</option>
            {schedules?.map((schedule) => (
              <option key={schedule.schedule_id} value={schedule.schedule_id}>
                Schedule #{schedule.schedule_id} (Target: {schedule.target_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      {runs && runs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-slate-400 mb-1">Total Runs</p>
            <p className="text-2xl font-bold text-white">{runs.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-400 mb-1">Success</p>
            <p className="text-2xl font-bold text-green-400">
              {runs.filter((r) => r.status === 'SUCCESS').length}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-400 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-400">
              {runs.filter((r) => r.status === 'FAILURE').length}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-slate-400 mb-1">Avg Latency</p>
            <p className="text-2xl font-bold text-yellow-400">
              {runs.length > 0
                ? (
                    runs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) /
                    runs.length
                  ).toFixed(1)
                : 0}
              ms
            </p>
          </div>
        </div>
      )}

      {/* Runs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Run ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Schedule
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Executed At
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Latency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {runs && runs.length > 0 ? (
                runs.map((run) => (
                  <tr
                    key={run.run_id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-300">
                      {run.run_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-primary-400">
                      #{run.schedule_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">
                          {formatDateTime(run.executed_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-mono font-semibold ${getStatusCodeColor(
                          run.status_code
                        )}`}
                      >
                        {run.status_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-yellow-400 font-semibold">
                        {run.latency_ms}ms
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    {selectedSchedule
                      ? 'No runs found for this schedule.'
                      : 'No runs executed yet. Create a schedule to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Update Indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Auto-refreshing every 3 seconds</span>
      </div>
    </div>
  );
};

export default Runs;