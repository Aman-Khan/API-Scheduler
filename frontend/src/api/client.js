import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard Metrics
export const getMetrics = () => apiClient.get('/metrics');

// Targets
export const getTargets = () => apiClient.get('/targets/');
export const createTarget = (data) => apiClient.post('/targets/', data);
export const deleteTarget = (id) => apiClient.delete(`/targets/${id}`);

// Schedules
export const getSchedules = () => apiClient.get('/schedules/');
export const createSchedule = (data) => apiClient.post('/schedules/', data);
export const pauseSchedule = (id) => apiClient.post(`/schedules/${id}/pause`);
export const resumeSchedule = (id) => apiClient.post(`/schedules/${id}/resume`);
export const deleteSchedule = (id) => apiClient.delete(`/schedules/${id}`);

// Runs
export const getRuns = (params = {}) => apiClient.get('/runs/', { params });

export default apiClient;