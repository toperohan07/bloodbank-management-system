import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/requests', 'requests');
export default {
  ...base,
  pending: (query, signal) => api('/requests/pending', { method: 'GET', query, signal }),
  summary: (signal) => api('/requests/summary', { method: 'GET', signal })
};