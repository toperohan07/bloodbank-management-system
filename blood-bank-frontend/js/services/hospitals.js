import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/hospitals', 'hospitals');
export default {
  ...base,
  getRequests: (id, signal) => api(`/hospitals/${id}/requests`, { method: 'GET', signal })
};