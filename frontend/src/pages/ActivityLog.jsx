import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Clock, AlertCircle, CheckCircle2, ChevronRight, 
  Globe, Server, ShieldAlert, ArrowRight, MousePointerClick 
} from 'lucide-react';
import { getSchedules, getRuns } from '../api/client';
import { formatDateTime } from '../utils/dateUtils';

const ActivityLog = () => {
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null); // For the detailed inspection panel

  // 1. Fetch Schedules (The "Parents" of the tree)
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => (await getSchedules()).data,
  });

  // 2. Fetch Runs for the SELECTED Schedule (The "Attempts/Children")
  const { data: runs, isLoading: isLoadingRuns } = useQuery({
    queryKey: ['runs', selectedScheduleId],
    queryFn: async () => {
      if (!selectedScheduleId) return [];
      // Fetch only runs for this specific schedule
      const params = { schedule_id: selectedScheduleId, limit: 50 };
      return (await getRuns(params)).data;
    },
    enabled: !!selectedScheduleId, // Only fetch if a schedule is clicked
    refetchInterval: 3000,
  });

  // Helper: Classification Color
  const getErrorColor = (type) => {
    if (type === 'TIMEOUT') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (type === 'DNS_ERROR') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type === 'CONNECTION_REFUSED') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="h-[calc(100vh-100px)] flex gap-6">
      
      {/* --- COLUMN 1: SCHEDULE SELECTOR (Root Nodes) --- */}
      <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Select Schedule
          </h3>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {isLoadingSchedules ? (
            <div className="p-4 text-center text-slate-400 text-sm">Loading schedules...</div>
          ) : (
            schedules?.map((sched) => (
              <div
                key={sched.id}
                onClick={() => { setSelectedScheduleId(sched.id); setSelectedRun(null); }}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedScheduleId === sched.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-blue-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID #{sched.id}</span>
                    <p className="font-medium text-slate-700 mt-0.5 text-sm truncate w-48">
                      {sched.schedule_type}
                    </p>
                  </div>
                  {selectedScheduleId === sched.id && <ChevronRight className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="w-3 h-3" /> Target #{sched.target_id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- COLUMN 2: EXECUTION TREE / TIMELINE (Attempts) --- */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" /> Execution History
          </h3>
          {selectedScheduleId && <span className="text-xs font-mono text-slate-400">Sched #{selectedScheduleId}</span>}
        </div>

        <div className="overflow-y-auto flex-1 p-6 relative">
          {!selectedScheduleId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MousePointerClick className="w-12 h-12 opacity-20 mb-2" />
              <p>Select a schedule to view its execution tree.</p>
            </div>
          ) : isLoadingRuns ? (
            <div className="p-4 text-center text-slate-400">Loading history...</div>
          ) : runs?.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No execution history found.</div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              
              {/* Timeline Items */}
              {runs.map((run) => (
                <div key={run.run_id} className="relative pl-10">
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-[11px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    run.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'
                  }`} />

                  {/* Card */}
                  <div 
                    onClick={() => setSelectedRun(run)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                      selectedRun?.run_id === run.run_id 
                        ? 'bg-slate-50 border-blue-200 ring-1 ring-blue-100' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                          run.status === 'SUCCESS' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {run.status === 'SUCCESS' ? '200 OK' : run.error_type || 'FAILURE'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Run #{run.run_id}</span>
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(run.executed_at)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-3">
                        <div className="text-xs">
                            <span className="block text-slate-400 mb-0.5">Latency</span>
                            <span className="font-mono font-medium text-slate-700">{run.latency_ms}ms</span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-slate-400 mb-0.5">Code</span>
                            <span className={`font-mono font-bold ${run.status_code >= 400 ? 'text-red-500' : 'text-green-600'}`}>
                                {run.status_code || 'ERR'}
                            </span>
                        </div>
                        <div className="text-xs">
                            <span className="block text-slate-400 mb-0.5">Size</span>
                            <span className="font-mono text-slate-700">{run.response_size || 0} B</span>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- COLUMN 3: INSPECTION PANEL (Detail) --- */}
      {selectedRun && (
        <div className="w-1/3 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col animate-in slide-in-from-right-10 duration-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" /> Inspection
            </h3>
            <button onClick={() => setSelectedRun(null)} className="text-slate-400 hover:text-slate-600">
                <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Classification Banner */}
            {selectedRun.status !== 'SUCCESS' && (
               <div className={`p-4 rounded-lg border ${getErrorColor(selectedRun.error_type)}`}>
                  <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {selectedRun.error_type || 'Unknown Error'}
                  </h4>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {selectedRun.error_type === 'TIMEOUT' && "Server took too long to respond. Check network latency or server load."}
                    {selectedRun.error_type === 'DNS_ERROR' && "Domain name resolution failed. Check the URL validity."}
                    {selectedRun.error_type === 'CONNECTION_REFUSED' && "Target machine actively refused connection. Is the service running?"}
                    {!selectedRun.error_type && "An unspecified failure occurred during execution."}
                  </p>
               </div>
            )}

            {/* Request Details */}
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Server className="w-3 h-3" /> Technical Details
                </h4>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Run UUID</span>
                        <span className="font-mono text-slate-700">{selectedRun.run_id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Schedule ID</span>
                        <span className="font-mono text-blue-600 font-bold">#{selectedRun.schedule_id}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Timestamp</span>
                        <span className="text-slate-700">{formatDateTime(selectedRun.executed_at)}</span>
                    </div>
                </div>
            </div>

            {/* Response Body */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Response Payload</h4>
                <div className="bg-slate-900 rounded-lg p-3 overflow-auto border border-slate-800 flex-1">
                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                        {selectedRun.response_body 
                            ? selectedRun.response_body 
                            : <span className="text-slate-600 italic">// No content captured</span>
                        }
                    </pre>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
