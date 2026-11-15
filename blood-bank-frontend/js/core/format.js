/**
 * core/format.js — Domain-specific formatters.
 * Strictly avoids new Date(str).toISOString() to prevent timezone-shift bugs.
 * @module core/format
 */

/**
 * Parses YYYY-MM-DD string into [year, month, day] numbers.
 * @param {string} str
 * @returns {{year: number, month: number, day: number}|null}
 */
export function parseDateParts(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    day: parseInt(match[3], 10)
  };
}

/**
 * Formats a YYYY-MM-DD date string nicely (e.g. "15 Nov 2026").
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return '—';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parts.day} ${months[parts.month - 1]} ${parts.year}`;
}

/**
 * Calculates days between today and a date string (negative if past, positive if future).
 * @param {string} dateStr - Target date string YYYY-MM-DD
 * @returns {number|null}
 */
export function daysFromToday(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;

  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats relative expiration or wait time (e.g. "expires in 12 days", "expired 3 days ago").
 * @param {string} dateStr
 * @returns {string}
 */
export function formatRelativeDays(dateStr) {
  const days = daysFromToday(dateStr);
  if (days === null) return '—';

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Formats volume in milliliters (e.g. "450 ml").
 * @param {number} ml
 * @returns {string}
 */
export function formatQuantityMl(ml) {
  if (ml === null || ml === undefined) return '0 ml';
  return `${Number(ml).toLocaleString()} ml`;
}

/**
 * Formats whole integer numbers.
 * @param {number} val
 * @returns {string}
 */
export function formatNumber(val) {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString();
}

/**
 * Pluralizes a word based on count (e.g. "1 unit", "3 units").
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Gets initials from a full name (e.g. "John Doe" -> "JD").
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Normalizes phone numbers by stripping non-digit / plus characters.
 * @param {string} phone
 * @returns {string}
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/[^0-9+]/g, '');
}

/**
 * Today's date in the user's LOCAL timezone as YYYY-MM-DD, optionally shifted by whole days.
 * (new Date().toISOString() is UTC and gives the wrong day for part of the day in many timezones.)
 * @param {number} [offsetDays=0]
 * @returns {string}
 */
export function localDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Adds whole days to a YYYY-MM-DD string and returns a YYYY-MM-DD string (local calendar, no timezone shift).
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
export function addDaysToDateString(dateStr, days) {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  const d = new Date(parts.year, parts.month - 1, parts.day + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
