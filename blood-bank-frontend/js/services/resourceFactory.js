/**
 * services/resourceFactory.js — Generic CRUD service factory.
 * @module services/resourceFactory
 */

import { api } from '../core/api.js';
import { emit } from '../core/events.js';

export function createResource(resourcePath, eventName) {
  return {
    list: (query, signal) => api(resourcePath, { method: 'GET', query, signal }),
    get: (id, signal) => api(`${resourcePath}/${id}`, { method: 'GET', signal }),
    create: async (body) => {
      const res = await api(resourcePath, { method: 'POST', body });
      if (eventName) emit(`data:changed:${eventName}`);
      return res;
    },
    update: async (id, body) => {
      const res = await api(`${resourcePath}/${id}`, { method: 'PUT', body });
      if (eventName) emit(`data:changed:${eventName}`);
      return res;
    },
    remove: async (id) => {
      const res = await api(`${resourcePath}/${id}`, { method: 'DELETE' });
      if (eventName) emit(`data:changed:${eventName}`);
      return res;
    }
  };
}
