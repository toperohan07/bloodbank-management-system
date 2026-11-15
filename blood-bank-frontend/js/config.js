/**
 * config.js — Central application configuration, constants, routes, enums, and defaults.
 * @module config
 */

export const API_BASE_URL = 'http://127.0.0.1:5000/api';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const DONATION_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Deferred'];
export const URGENCY_LEVELS = ['Low', 'Normal', 'High', 'Critical'];
export const REQUEST_STATUSES = ['Pending', 'Approved', 'Fulfilled', 'Rejected', 'Cancelled'];
export const TEST_RESULTS = ['Negative', 'Positive', 'Pending'];
export const OVERALL_STATUSES = ['Safe', 'Unsafe', 'Pending'];
export const EXPIRY_STATUSES = ['valid', 'expiring_soon', 'expired', 'unknown'];

/**
 * Advisory shelf life in days per component type.
 * Note: These are advisory clinical guidelines, not strict database constraints.
 */
export const COMPONENT_TYPES = {
  'Whole Blood': 35,
  'Packed Red Cells': 42,
  'Platelets': 5,
  'Fresh Frozen Plasma': 365,
  'Cryoprecipitate': 365
};

export const PAGE_SIZES = [10, 25, 50, 100];

export const DEFAULT_SETTINGS = {
  apiBaseUrl: 'http://127.0.0.1:5000/api',
  theme: 'light',
  pageSize: 25,
  expiryAlertDays: 30,
  lowStockThreshold: 2,
  donorEligibilityDays: 90
};

export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DONOR_MIN_AGE = 18;
export const DONOR_MAX_AGE = 65;
export const PATIENT_MIN_AGE = 0;
export const PATIENT_MAX_AGE = 120;
export const MIN_QUANTITY_ML = 1;
export const MAX_QUANTITY_ML = 2000;
export const DEFAULT_QUANTITY_ML = 450;

export const API_TIMEOUT_MS = 10000;
export const DEBOUNCE_MS = 300;
export const HEALTH_CHECK_INTERVAL_MS = 30000;
export const CACHE_TTL_MS = 60000;
export const AUTO_REFRESH_MS = 60000;
export const MAX_EXPORT_ROWS = 5000;
export const MAX_PAGE_LIMIT = 200;

export const PROJECT_INFO = {
  name: 'Blood Bank & Donor Management System',
  version: '1.0.0'
};

export const ROUTES = [
  { path: '#/dashboard', title: 'Dashboard', icon: 'dashboard', navGroup: 'Overview' },
  { path: '#/donors', title: 'Donors', icon: 'users', navGroup: 'Blood Operations' },
  { path: '#/donations', title: 'Donations', icon: 'syringe', navGroup: 'Blood Operations' },
  { path: '#/bloodtests', title: 'Blood Tests', icon: 'test-tube', navGroup: 'Blood Operations' },
  { path: '#/inventory', title: 'Inventory', icon: 'package', navGroup: 'Blood Operations' },
  { path: '#/requests', title: 'Blood Requests', icon: 'clipboard', navGroup: 'Blood Operations' },
  { path: '#/issue', title: 'Issue Blood', icon: 'send', navGroup: 'Blood Operations' },
  { path: '#/issues', title: 'Issue History', icon: 'clipboard', navGroup: 'Blood Operations' },
  { path: '#/bloodbanks', title: 'Blood Banks', icon: 'building', navGroup: 'Network' },
  { path: '#/hospitals', title: 'Hospitals', icon: 'hospital', navGroup: 'Network' },
  { path: '#/patients', title: 'Patients', icon: 'bed', navGroup: 'Network' },
  { path: '#/staff', title: 'Staff', icon: 'id-card', navGroup: 'Network' },
  { path: '#/settings', title: 'Settings', icon: 'settings', navGroup: 'Tools' }
];
