import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Globe, Code, Braces } from 'lucide-react';
import { getTargets, createTarget, deleteTarget } from '../api/client';

const Targets = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    method: 'GET',
    headers: '{}',
    body_template: null,
  });

  const queryClient = useQueryClient();

  const { data: targets, isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: async () => {
      const response = await getTargets();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      queryClient.invalidateQueries(['targets']);
      setShowModal(false);
      setFormData({ url: '', method: 'GET', headers: '{}', body_template: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTarget,
    onSuccess: () => {
      queryClient.invalidateQueries(['targets']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const payload = {
        url: formData.url,
        method: formData.method,
        headers: JSON.parse(formData.headers || '{}'),
        body_template: formData.body_template || null,
      };
      createMutation.mutate(payload);
    } catch (error) {
      alert('Invalid JSON in headers field');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this target?')) {
      deleteMutation.mutate(id);
    }
  };

  // LIGHT THEME BADGES
  const getMethodBadge = (method) => {
    const styles = {
      GET: 'bg-blue-50 text-blue-700 border-blue-200',
      POST: 'bg-green-50 text-green-700 border-green-200',
      PUT: 'bg-orange-50 text-orange-700 border-orange-200',
      DELETE: 'bg-red-50 text-red-700 border-red-200',
      PATCH: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    };
    const style = styles[method] || 'bg-slate-50 text-slate-600 border-slate-200';

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${style}`}>
        {method}
      </span>
    );
  };

  if (isLoading) {
    return <div className="rounded-xl p-6 animate-pulse bg-white h-96 border border-slate-200 shadow-sm"></div>;
  }

  return (
    <div className="space-y-6">
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">API Targets</h3>
          <p className="text-sm text-slate-500">
            Configure your external API endpoints and methods.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Target
        </button>
      </div>

      {/* --- Targets Table (Light Theme) --- */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Endpoint URL</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targets && targets.length > 0 ? (
                targets.map((target) => {
                  const actualId = target.target_id || target.id;
                  
                  return (
                    <tr
                      key={actualId}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-slate-600 group-hover:text-slate-900">
                        #{actualId}
                      </td>
                      <td className="px-6 py-4">
                        {getMethodBadge(target.method)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-mono text-slate-700 break-all">
                            {target.url}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(actualId)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 bg-white transition-all flex items-center gap-2 ml-auto text-xs font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Globe className="w-8 h-8 opacity-20" />
                      <p className="text-sm text-slate-500">No targets configured yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Create Target Modal (Light Theme) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> New API Target
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* URL Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target URL *</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="url"
                      className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block pl-10 p-2.5 placeholder-slate-400"
                      placeholder="https://api.example.com/v1/endpoint"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Method Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">HTTP Method *</label>
                  <select
                    className="w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block p-2.5"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    required
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                {/* Headers Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Braces className="w-3 h-3" /> Headers (JSON)
                  </label>
                  <textarea
                    className="w-full bg-white border border-slate-300 text-slate-700 text-sm font-mono rounded-lg focus:ring-2 focus:ring-blue-500/20 block p-3 h-24"
                    placeholder='{"Authorization": "Bearer <token>"}'
                    value={formData.headers}
                    onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  />
                </div>

                {/* Body Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Code className="w-3 h-3" /> Body Template (Optional)
                  </label>
                  <textarea
                    className="w-full bg-white border border-slate-300 text-slate-700 text-sm font-mono rounded-lg focus:ring-2 focus:ring-blue-500/20 block p-3 h-24"
                    placeholder='{"key": "value"}'
                    value={formData.body_template || ''}
                    onChange={(e) => setFormData({ ...formData, body_template: e.target.value || null })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Accepts standard JSON payload.</p>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Target'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Targets;
