import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/requests', 'requests');
export default {
  ...base,
  pending: (signal) => api('/requests/pending', { method: 'GET', signal }),
  summary: (signal) => api('/requests/summary', { method: 'GET', signal })
};