import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/staff', 'staff');
export default {
  ...base,
  getDonations: (id, signal) => api(`/staff/${id}/donations`, { method: 'GET', signal })
};