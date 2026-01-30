import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Trash2, X, Clock } from 'lucide-react';
import {
  getSchedules,
  getTargets,
  createSchedule,
  pauseSchedule,
  resumeSchedule,
  deleteSchedule,
} from '../api/client';
import { formatDateTime } from '../utils/dateUtils';

const Schedules = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    target_id: '',
    schedule_type: 'INTERVAL',
    interval_seconds: '',
    start_time: '',
    end_time: '',
    max_runs: '',
  });

  const queryClient = useQueryClient();

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await getSchedules();
      return response.data;
    },
    refetchInterval: 3000,
  });

  const { data: targets } = useQuery({
    queryKey: ['targets'],
    queryFn: async () => {
      const response = await getTargets();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
      setShowModal(false);
      resetForm();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pauseSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
    },
  });

  const resetForm = () => {
    setFormData({
      target_id: '',
      schedule_type: 'INTERVAL',
      interval_seconds: '',
      start_time: '',
      end_time: '',
      max_runs: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 1. Basic validation
    if (!formData.target_id) {
      alert("Please select a target");
      return;
    }

    // 2. Parse ID and Interval (ensure they are valid numbers)
    const targetId = Number(formData.target_id);
    const interval = parseInt(formData.interval_seconds, 10);

    if (isNaN(targetId)) {
      alert("Invalid target: ID must be a number");
      return;
    }

    if (isNaN(interval) || interval <= 0) {
      alert("Interval must be a number greater than 0");
      return;
    }

    // 3. Construct config based on type
    let scheduleConfig = {
      interval_seconds: interval
    };

    if (formData.schedule_type === "WINDOW") {
      if (!formData.end_time) {
        alert("End Time is required for WINDOW schedules");
        return;
      }

      // Use current time if start_time is omitted
      const startTime = formData.start_time ? new Date(formData.start_time) : new Date();
      const endTime = new Date(formData.end_time);

      // Validation: End must be after Start
      if (endTime <= startTime) {
        alert("End time must be later than the start time");
        return;
      }

      scheduleConfig = {
        ...scheduleConfig,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };

      if (formData.max_runs) {
        const maxRuns = parseInt(formData.max_runs, 10);
        if (!isNaN(maxRuns) && maxRuns > 0) {
          scheduleConfig.max_runs = maxRuns;
        }
      }
    }

    const payload = {
      target_id: targetId,
      schedule_type: formData.schedule_type,
      schedule_config: scheduleConfig,
    };

    createMutation.mutate(payload);
  };

  const handleToggle = (schedule) => {
    if (schedule.status === 'ACTIVE') {
      pauseMutation.mutate(schedule.schedule_id);
    } else {
      resumeMutation.mutate(schedule.schedule_id);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Active</span>;
      case 'PAUSED':
        return <span className="badge badge-warning">Paused</span>;
      case 'COMPLETED':
        return <span className="badge badge-info">Completed</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  if (schedulesLoading) {
    return <div className="card p-6 animate-pulse bg-slate-800 h-96"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Schedules</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage your scheduled jobs
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create Schedule
        </button>
      </div>

      {/* Schedules Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Target
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Next Run
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {schedules && schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <tr
                    key={schedule.schedule_id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-300">
                      {schedule.schedule_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-primary-400">
                      #{schedule.target_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-info">
                        {schedule.schedule_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(schedule.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300">
                          {formatDateTime(schedule.next_run_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(schedule)}
                          className={`btn text-sm ${schedule.status === 'ACTIVE'
                            ? 'btn-secondary'
                            : 'btn-success'
                            }`}
                          disabled={
                            pauseMutation.isPending || resumeMutation.isPending
                          }
                        >
                          {schedule.status === 'ACTIVE' ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Resume
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.schedule_id)}
                          className="btn btn-danger text-sm"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No schedules created yet. Create your first schedule to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Create New Schedule
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Target *</label>
                <select
                  className="input"
                  value={formData.target_id}
                  onChange={(e) =>
                    setFormData({ ...formData, target_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select a target</option>
                  {targets?.map((target) => (
                    <option key={target.target_id} value={target.target_id}>
                      #{target.target_id} - {target.method} {target.url}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Schedule Type *</label>
                <select
                  className="input"
                  value={formData.schedule_type}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule_type: e.target.value })
                  }
                  required
                >
                  <option value="INTERVAL">INTERVAL</option>
                  <option value="WINDOW">WINDOW</option>
                </select>
              </div>

              <div>
                <label className="label">Interval (seconds) *</label>
                <input
                  type="number"
                  className="input"
                  placeholder="60"
                  min="1"
                  value={formData.interval_seconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interval_seconds: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {formData.schedule_type === 'WINDOW' && (
                <>
                  <div>
                    <label className="label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Leave empty for "now"
                    </p>
                  </div>

                  <div>
                    <label className="label">End Time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Max Runs (Optional)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="10"
                      min="1"
                      value={formData.max_runs}
                      onChange={(e) =>
                        setFormData({ ...formData, max_runs: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;