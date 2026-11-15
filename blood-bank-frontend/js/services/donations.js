import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/donations', 'donations');
export default {
  ...base,
  history: (query, signal) => api('/donations/history', { method: 'GET', query, signal })
};