/**
 * ui/badge.js — Status badge component.
 * Single source of truth for rendering all status, urgency, test, and blood group badges.
 * @module ui/badge
 */

/**
 * Creates an accessible status badge element.
 * @param {string} text - Display text
 * @param {string} [variant='neutral'] - Variant: success, warning, danger, info, neutral
 * @param {boolean} [pulse=false] - Whether to apply pulsing animation
 * @returns {HTMLSpanElement}
 */
export function badge(text, variant = 'neutral', pulse = false) {
  const span = document.createElement('span');
  span.className = `badge badge--${variant}${pulse ? ' badge--pulse' : ''}`;
  span.textContent = text;
  return span;
}

/**
 * Creates a badge based on blood request status.
 * @param {string} status - Pending, Approved, Fulfilled, Rejected, Cancelled
 * @returns {HTMLSpanElement}
 */
export function requestStatusBadge(status) {
  const map = {
    Pending: 'warning',
    Approved: 'info',
    Fulfilled: 'success',
    Rejected: 'danger',
    Cancelled: 'neutral'
  };
  return badge(status, map[status] || 'neutral');
}

/**
 * Creates a badge based on urgency.
 * @param {string} urgency - Low, Normal, High, Critical
 * @returns {HTMLSpanElement}
 */
export function urgencyBadge(urgency) {
  const map = {
    Low: 'neutral',
    Normal: 'info',
    High: 'warning',
    Critical: 'danger'
  };
  const isCritical = urgency === 'Critical';
  return badge(urgency, map[urgency] || 'neutral', isCritical);
}

/**
 * Creates a badge based on blood test results.
 * @param {string|null} status - Safe, Unsafe, Pending, or null (Not Tested)
 * @returns {HTMLSpanElement}
 */
export function testStatusBadge(status) {
  if (!status) {
    return badge('Not Tested', 'warning');
  }
  const map = {
    Safe: 'success',
    Unsafe: 'danger',
    Pending: 'warning'
  };
  return badge(status, map[status] || 'neutral');
}

/**
 * Creates a badge based on expiry status.
 * @param {string} status - valid, expiring_soon, expired, unknown
 * @param {number} [daysLeft] - Optional days remaining
 * @returns {HTMLSpanElement}
 */
export function expiryBadge(status, daysLeft) {
  let label = status;
  if (status === 'valid') label = 'Valid';
  else if (status === 'expiring_soon') label = daysLeft !== undefined ? `Expiring in ${daysLeft}d` : 'Expiring Soon';
  else if (status === 'expired') label = 'Expired';
  else if (status === 'unknown') label = 'Unknown';

  const map = {
    valid: 'success',
    expiring_soon: 'warning',
    expired: 'danger',
    unknown: 'neutral'
  };
  return badge(label, map[status] || 'neutral');
}

/**
 * Creates a badge for donation status.
 * @param {string} status - Accepted, Pending, Rejected, Deferred
 * @returns {HTMLSpanElement}
 */
export function donationStatusBadge(status) {
  const map = {
    Accepted: 'success',
    Pending: 'warning',
    Rejected: 'danger',
    Deferred: 'neutral'
  };
  return badge(status, map[status] || 'neutral');
}

/**
 * Creates a blood group chip badge.
 * @param {string} group - A+, A-, B+, B-, AB+, AB-, O+, O-
 * @returns {HTMLSpanElement}
 */
export function bloodGroupBadge(group) {
  const span = document.createElement('span');
  const slug = (group || '').toLowerCase().replace('+', '-pos').replace('-', '-neg');
  span.className = `chip-blood chip-blood--${slug}`;
  span.textContent = group || 'Unknown';
  return span;
}
