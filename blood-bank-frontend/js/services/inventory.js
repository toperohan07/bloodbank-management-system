import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/inventory', 'inventory');
export default {
  ...base,
  summary: (signal) => api('/inventory/summary', { method: 'GET', signal }),
  expiring: (days, signal) => api('/inventory/expiring', { method: 'GET', query: { days }, signal }),
  expired: (signal) => api('/inventory/expired', { method: 'GET', signal })
};