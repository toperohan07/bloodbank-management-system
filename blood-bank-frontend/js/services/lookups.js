import { api } from '../core/api.js';
import { on } from '../core/events.js';
import { CACHE_TTL_MS } from '../config.js';

const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// Invalidate cache on mutations
['donors', 'bloodbanks', 'hospitals', 'patients', 'staff'].forEach(res => {
  on(`data:changed:${res}`, () => cache.delete(res));
});

export default {
  async getBloodBanks() {
    const cached = getCached('bloodbanks');
    if (cached) return cached;
    const res = await api('/bloodbanks', { query: { limit: 200 } });
    setCached('bloodbanks', res.data || []);
    return res.data || [];
  },
  async getHospitals() {
    const cached = getCached('hospitals');
    if (cached) return cached;
    const res = await api('/hospitals', { query: { limit: 200 } });
    setCached('hospitals', res.data || []);
    return res.data || [];
  },
  async getStaff() {
    const cached = getCached('staff');
    if (cached) return cached;
    const res = await api('/staff', { query: { limit: 200 } });
    setCached('staff', res.data || []);
    return res.data || [];
  },
  async getPatients() {
    const cached = getCached('patients');
    if (cached) return cached;
    const res = await api('/patients', { query: { limit: 200 } });
    setCached('patients', res.data || []);
    return res.data || [];
  }
};