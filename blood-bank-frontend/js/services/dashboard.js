import { api } from '../core/api.js';

export default {
  summary: (signal) => api('/dashboard/summary', { method: 'GET', signal }),
  bloodGroups: (signal) => api('/dashboard/blood-groups', { method: 'GET', signal }),
  recentDonations: (limit = 8, signal) => api('/dashboard/recent-donations', { method: 'GET', query: { limit }, signal }),
  recentRequests: (limit = 8, signal) => api('/dashboard/recent-requests', { method: 'GET', query: { limit }, signal }),
  expiryAlerts: (days = 30, signal) => api('/dashboard/expiry-alerts', { method: 'GET', query: { days }, signal }),
  donationStatistics: (groupBy = 'month', signal) => api('/dashboard/donation-statistics', { method: 'GET', query: { group_by: groupBy }, signal }),
  health: (signal) => api('/health', { method: 'GET', signal })
};