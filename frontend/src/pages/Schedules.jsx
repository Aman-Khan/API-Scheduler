import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Pause, Trash2, X, Clock, Hash, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
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
  const [expandedRowId, setExpandedRowId] = useState(null);
  
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
    queryFn: async () => (await getSchedules()).data,
    refetchInterval: 3000,
  });

  const { data: targets } = useQuery({
    queryKey: ['targets'],
    queryFn: async () => (await getTargets()).data,
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
    onSuccess: () => queryClient.invalidateQueries(['schedules']),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeSchedule,
    onSuccess: () => queryClient.invalidateQueries(['schedules']),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => queryClient.invalidateQueries(['schedules']),
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
    if (!formData.target_id) { alert("Please select a target"); return; }
    
    const targetId = parseInt(String(formData.target_id), 10);
    const interval = parseInt(String(formData.interval_seconds), 10);
    
    let scheduleConfig = { interval_seconds: interval };

    if (formData.schedule_type === "WINDOW") {
      if (!formData.end_time) { alert("End Time is required"); return; }
      
      const now = new Date();
      // Add buffer (e.g., 1 minute) to allow for submission delay if user picks "now"
      const nowWithBuffer = new Date(now.getTime() - 60000); 

      const startTime = formData.start_time ? new Date(formData.start_time) : new Date();
      const endTime = new Date(formData.end_time);

      // --- VALIDATION: Start Time cannot be in the past ---
      if (formData.start_time && startTime < nowWithBuffer) {
        alert("Start time cannot be in the past.");
        return;
      }

      if (endTime <= startTime) { alert("End time must be later than start time"); return; }

      scheduleConfig = {
        ...scheduleConfig,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      };
      
      if (formData.max_runs) {
        scheduleConfig.max_runs = parseInt(formData.max_runs, 10);
      }
    }

    createMutation.mutate({
      target_id: targetId,
      schedule_type: formData.schedule_type,
      schedule_config: scheduleConfig,
    });
  };

  const handleToggle = (id, status, e) => {
    e.stopPropagation(); 
    if (status === 'COMPLETED') return;
    if (status === 'ACTIVE') pauseMutation.mutate(id);
    else resumeMutation.mutate(id);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete schedule?')) deleteMutation.mutate(id);
  };

  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: "bg-green-50 text-green-700 border-green-200",
      PAUSED: "bg-yellow-50 text-yellow-700 border-yellow-200",
      COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
      DEFAULT: "bg-slate-50 text-slate-600 border-slate-200"
    };
    const style = styles[status] || styles.DEFAULT;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        <span className="relative flex h-2 w-2">
          {status === 'ACTIVE' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>}
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
        {status}
      </span>
    );
  };

  // Helper to get current datetime string for min attribute
  const getCurrentDateTimeString = () => {
    const now = new Date();
    // Format: YYYY-MM-DDThh:mm (slice removes seconds/ms)
    // Need to adjust for local timezone offset for the input value
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (schedulesLoading) return <div className="rounded-xl p-6 animate-pulse bg-white h-96 border border-slate-200 shadow-sm"></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Schedules</h3>
          <p className="text-sm text-slate-500">Manage your scheduled jobs and intervals.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Create Schedule
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Next Run</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                <th className="px-2 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules && schedules.length > 0 ? (
                schedules.map((schedule) => {
                  const actualId = schedule.schedule_id || schedule.id;
                  const isCompleted = schedule.status === 'COMPLETED';
                  const isExpanded = expandedRowId === actualId;
                  const config = schedule.schedule_config || {};

                  return (
                    <>
                      <tr 
                        key={actualId} 
                        onClick={() => toggleRow(actualId)}
                        className={`cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-4 text-sm font-mono text-slate-600 font-medium">#{actualId}</td>
                        <td className="px-6 py-4 text-sm font-mono text-blue-600 font-medium">#{schedule.target_id}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {schedule.schedule_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(schedule.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium">{isCompleted ? '-' : formatDateTime(schedule.next_run_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleToggle(actualId, schedule.status, e)}
                              disabled={pauseMutation.isPending || resumeMutation.isPending || isCompleted}
                              className={`p-1.5 rounded-lg border transition-all ${
                                isCompleted ? 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' :
                                schedule.status === 'ACTIVE' ? 'border-yellow-200 text-yellow-600 hover:bg-yellow-50 bg-white' :
                                'border-green-200 text-green-600 hover:bg-green-50 bg-white'
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : schedule.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={(e) => handleDelete(actualId, e)}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan="7" className="px-6 py-4 border-t border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock className="w-3 h-3" /> Interval Frequency
                                </span>
                                <p className="font-medium text-slate-700">{config.interval_seconds} seconds</p>
                              </div>

                              {schedule.schedule_type === 'WINDOW' && (
                                <>
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3" /> Active Window
                                    </span>
                                    <div className="flex flex-col gap-1 text-slate-700">
                                      <span className="text-xs text-slate-500">Start:</span>
                                      <span className="font-medium">{formatDateTime(config.start_time)}</span>
                                      <span className="text-xs text-slate-500 mt-1">End:</span>
                                      <span className="font-medium">{formatDateTime(config.end_time)}</span>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <Hash className="w-3 h-3" /> Run Limits
                                    </span>
                                    <p className="font-medium text-slate-700">
                                      {config.max_runs ? `${config.max_runs} Max Runs` : 'Unlimited'}
                                    </p>
                                  </div>
                                </>
                              )}
                              
                              {schedule.schedule_type === 'INTERVAL' && (
                                <div className="col-span-2 flex items-center text-slate-400 text-xs italic">
                                  Standard interval schedule running indefinitely.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              ) : (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500">No schedules active.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Create New Schedule
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target API</label>
                  <select className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" value={formData.target_id} onChange={(e) => setFormData({...formData, target_id: e.target.value})} required>
                    <option value="">Select Target</option>
                    {targets?.map(t => <option key={t.id || t.target_id} value={t.id || t.target_id}>#{t.id || t.target_id} - {t.method} {t.url}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type</label>
                        <select className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" value={formData.schedule_type} onChange={(e) => setFormData({...formData, schedule_type: e.target.value})}>
                            <option value="INTERVAL">Interval</option>
                            <option value="WINDOW">Window</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Interval (Sec)</label>
                        <input type="number" className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" placeholder="60" min="1" value={formData.interval_seconds} onChange={(e) => setFormData({...formData, interval_seconds: e.target.value})} required />
                    </div>
                </div>
                {formData.schedule_type === 'WINDOW' && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Start Time</label>
                          {/* Added min={getCurrentDateTimeString()} to the input */}
                          <input 
                            type="datetime-local" 
                            className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" 
                            value={formData.start_time} 
                            min={getCurrentDateTimeString()} 
                            onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">End Time</label>
                          <input 
                            type="datetime-local" 
                            className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" 
                            value={formData.end_time} 
                            min={getCurrentDateTimeString()} 
                            onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                            required 
                          />
                        </div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Max Runs</label><input type="number" className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5" placeholder="Optional" min="1" value={formData.max_runs} onChange={(e) => setFormData({...formData, max_runs: e.target.value})} /></div>
                  </div>
                )}
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Confirm'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;
