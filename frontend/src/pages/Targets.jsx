import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Globe } from 'lucide-react';
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

  if (isLoading) {
    return <div className="card p-6 animate-pulse bg-slate-800 h-96"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">API Targets</h3>
          <p className="text-sm text-slate-400 mt-1">
            Configure external endpoints
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" />
          Create Target
        </button>
      </div>

      {/* Targets Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  URL
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase">
                  Method
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {targets && targets.length > 0 ? (
                targets.map((target) => (
                  <tr
                    key={target.target_id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-slate-300">
                      {target.target_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-mono text-primary-400">
                          {target.url}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge badge-info">{target.method}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(target.target_id)}
                        className="btn btn-danger text-sm"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No targets configured yet. Create your first target to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Target Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Create New Target
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
                <label className="label">URL *</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://api.example.com/endpoint"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="label">Method *</label>
                <select
                  className="input"
                  value={formData.method}
                  onChange={(e) =>
                    setFormData({ ...formData, method: e.target.value })
                  }
                  required
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="label">Headers (JSON)</label>
                <textarea
                  className="input font-mono text-sm"
                  rows="3"
                  placeholder='{"Authorization": "Bearer token"}'
                  value={formData.headers}
                  onChange={(e) =>
                    setFormData({ ...formData, headers: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Body Template (Optional)</label>
                <textarea
                  className="input font-mono text-sm"
                  rows="3"
                  placeholder='{"key": "value"}'
                  value={formData.body_template || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      body_template: e.target.value || null,
                    })
                  }
                />
              </div>

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
                  {createMutation.isPending ? 'Creating...' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Targets;