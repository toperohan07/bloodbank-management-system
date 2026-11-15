/**
 * core/api.js — HTTP client with envelope parsing and typed errors.
 * Handles timeouts, AbortController, URLSearchParams query encoding, and status extraction.
 * @module core/api
 */

import { getSetting } from './store.js';
import { API_TIMEOUT_MS } from '../config.js';
import { emit } from './events.js';

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {string|null} [field=null]
   */
  constructor(status, message, field = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.field = field;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Cannot reach server on port 5000') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Extracts a leading field name from 400 error messages (e.g. "age must be at least 18").
 * @param {string} message
 * @returns {string|null}
 */
function extractFieldName(message) {
  if (!message || typeof message !== 'string') return null;
  const match = message.match(/^([a-zA-Z_]+)\s+(must|is|cannot|should|already|does)/i);
  if (match) return match[1].toLowerCase();
  // 409 duplicate: "Duplicate record: a record with this email already exists"
  const dup = message.match(/with this ([a-z_]+) already exists/i);
  return dup ? dup[1].toLowerCase() : null;
}

/**
 * Makes an HTTP request to the API.
 * @param {string} path - Endpoint path (e.g. '/donors')
 * @param {object} [options={}] - Request options
 * @param {string} [options.method='GET']
 * @param {object} [options.query]
 * @param {any} [options.body]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{data: any, pagination: object|null, message: string}>}
 */
export async function api(path, options = {}) {
  const baseUrl = getSetting('apiBaseUrl').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Query parameter encoding
  const url = new URL(`${baseUrl}${cleanPath}`);
  if (options.query) {
    for (const [key, val] of Object.entries(options.query)) {
      if (val !== null && val !== undefined && val !== '') {
        url.searchParams.append(key, String(val));
      }
    }
  }

  // Abort timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  const combinedSignal = options.signal || controller.signal;

  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Accept': 'application/json'
    },
    signal: combinedSignal
  };

  if (options.body !== undefined) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url.toString(), fetchOptions);
    clearTimeout(timeoutId);

    let json = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const msg = (json && json.message) || `Request failed with status ${res.status}`;
      const field = (res.status === 400 || res.status === 409) ? extractFieldName(msg) : null;
      throw new ApiError(res.status, msg, field);
    }

    emit('api:online');
    return {
      data: json ? json.data : null,
      pagination: json ? (json.pagination || null) : null,
      message: (json && json.message) || 'Success'
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new Error('Request timed out or was cancelled');
    }

    emit('api:offline');
    throw new NetworkError('Cannot reach server on port 5000');
  }
}
