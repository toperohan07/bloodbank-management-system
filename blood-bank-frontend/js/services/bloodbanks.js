import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/bloodbanks', 'bloodbanks');
export default {
  ...base,
  getInventory: (id, signal) => api(`/bloodbanks/${id}/inventory`, { method: 'GET', signal }),
  getStaff: (id, signal) => api(`/bloodbanks/${id}/staff`, { method: 'GET', signal })
};