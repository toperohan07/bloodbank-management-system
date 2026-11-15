import { api } from '../core/api.js';
import { emit } from '../core/events.js';

export default {
  list: (query, signal) => api('/issues', { method: 'GET', query, signal }),
  get: (id, signal) => api(`/issues/${id}`, { method: 'GET', signal }),
  history: (query, signal) => api('/issues/history', { method: 'GET', query, signal }),
  create: async (body) => {
    const res = await api('/issues', { method: 'POST', body });
    emit('data:changed:issues');
    emit('data:changed:inventory');
    emit('data:changed:requests');
    return res;
  },
  update: async (id, body) => {
    const res = await api(`/issues/${id}`, { method: 'PUT', body });
    emit('data:changed:issues');
    return res;
  }
};