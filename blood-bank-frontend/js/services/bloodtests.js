import { createResource } from './resourceFactory.js';
import { api } from '../core/api.js';

const base = createResource('/bloodtests', 'bloodtests');
export default {
  ...base,
  safe: (query, signal) => api('/bloodtests/safe', { method: 'GET', query, signal }),
  unsafe: (query, signal) => api('/bloodtests/unsafe', { method: 'GET', query, signal })
};