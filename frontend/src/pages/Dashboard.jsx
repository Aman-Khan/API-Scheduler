import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, CheckCircle2, Zap, Clock, ShieldCheck, ArrowUpRight, Cpu } from 'lucide-react';
import { getMetrics } from '../api/client'; 

const Dashboard = () => {
  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['dashboard_metrics'],
    queryFn: async () => {
      const response = await getMetrics(); 
      return response.data;
    },
    refetchInterval: 5000,
  });

  const system = metrics?.system || {};
  const db = metrics?.database || {};

  const isDbOnline = db.online;
  const isHighLoad = system.cpu_usage_percent > 80;

  const successRate = system.total_runs > 0
    ? ((system.success_runs / system.total_runs) * 100).toFixed(1)
    : 0;

  if (isLoading) return <div className="p-8 animate-pulse bg-slate-50/50 h-screen" />;
  if (isError) return <div className="p-8 text-red-500 font-bold">⚠️ Connection lost to backend telemetry.</div>;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 bg-slate-50/30">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Metrics</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Real-time telemetry from your API automation engine.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDbOnline ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isDbOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isDbOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span className={`text-xs font-bold uppercase tracking-widest ${isDbOnline ? 'text-emerald-700' : 'text-red-700'}`}>
              {isDbOnline ? 'Operational' : 'System Critical'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="relative overflow-hidden bg-white border border-slate-200/60 p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
          <div className="absolute -right-4 -top-4 text-blue-500/5 group-hover:scale-110 transition-transform">
             <TrendingUp size={120} />
          </div>
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
              <TrendingUp size={22} strokeWidth={2.5} />
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Runs</p>
               <h3 className="text-3xl font-black text-slate-900 tabular-nums">{system.total_runs || 0}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold py-1 px-2 bg-emerald-50 text-emerald-600 rounded-md w-fit">
            <ArrowUpRight size={12} /> Live Tracking
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-slate-200/60 p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Efficiency</p>
               <h3 className="text-3xl font-black text-slate-900 tabular-nums">{successRate}%</h3>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white border border-slate-200/60 p-6 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
              <Zap size={22} strokeWidth={2.5} />
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</p>
               <h3 className="text-3xl font-black text-slate-900 tabular-nums">
                {system.avg_latency_ms ? `${system.avg_latency_ms.toFixed(0)}ms` : '0ms'}
               </h3>
            </div>
          </div>
          <p className="text-[10px] text-amber-600 font-black uppercase tracking-tighter italic">Engine optimized</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[1.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                <Cpu size={18} />
              </div>
              <h2 className="font-bold text-slate-800">Node Infrastructure</h2>
            </div>
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
              <Clock size={12} /> AUTO-REFRESH ACTIVE
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {[
              { 
                label: 'Primary DB', 
                val: isDbOnline ? 'Connected' : 'Offline', 
                sub: isDbOnline ? `Latency ${db.latency_ms}ms` : 'Check Logs', 
                color: isDbOnline ? 'bg-blue-500' : 'bg-red-500'
              },
              { 
                label: 'Worker Nodes', 
                val: `${system.active_workers || 0} Active`, 
                sub: `CPU Load ${system.cpu_usage_percent || 0}%`, 
                color: 'bg-purple-500' 
              },
            ].map((node, i) => (
              <div key={i} className="relative pl-6">
                <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-full ${node.color} opacity-40`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{node.label}</p>
                <p className="text-lg font-bold text-slate-800 leading-tight">{node.val}</p>
                <p className="text-xs text-slate-500 mt-1">{node.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-[1.5rem] p-8 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 blur-3xl rounded-full" />
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Last Telemetry Check</p>
          <div className="space-y-1">
            <h3 className="text-4xl font-black tracking-tight leading-none text-slate-900">
              {metrics?.timestamp 
                ? new Date(metrics.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </h3>
            <p className="text-slate-500 text-sm font-medium">
              {metrics?.timestamp 
                 ? new Date(metrics.timestamp * 1000).toLocaleDateString([], { month: 'long', day: 'numeric' })
                 : 'Waiting for signal...'}
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-blue-100/50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
            <span className={`text-[10px] font-bold uppercase ${isDbOnline ? 'text-emerald-600' : 'text-red-600'}`}>
              {isDbOnline ? 'No issues detected' : 'Check Database'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
