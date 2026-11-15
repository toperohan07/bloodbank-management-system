import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/donors', 'donors');
export default {
  ...base,
  getDonations: (id, signal) => api(`/donors/${id}/donations`, { method: 'GET', signal })
};