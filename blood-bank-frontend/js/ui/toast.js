/**
 * ui/toast.js — Accessible Toast notification system.
 * Renders in an aria-live region; auto-dismisses with progress indicators.
 * @module ui/toast
 */

import { h } from '../core/dom.js';

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = h('div', { id: 'toast-container', className: 'toast-container', role: 'status', ariaLive: 'polite' });
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * Shows a toast message.
 * @param {string} message - Text message
 * @param {'info'|'success'|'warning'|'danger'} [variant='info'] - Toast type
 * @param {number} [duration=4000] - Duration in ms
 */
export function toast(message, variant = 'info', duration = 4000) {
  const c = ensureContainer();

  const toastEl = h('div', { className: `toast toast--${variant}` },
    h('span', { style: { flex: '1' } }, message),
    h('button', {
      className: 'btn btn--ghost btn--sm',
      style: { padding: '2px', minHeight: 'unset' },
      onClick: () => dismiss()
    }, '✕')
  );

  function dismiss() {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.remove();
    }, 200);
  }

  c.appendChild(toastEl);
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { dismiss };
}

export const notify = {
  success: (msg, dur) => toast(msg, 'success', dur),
  error: (msg, dur) => toast(msg, 'danger', dur),
  warning: (msg, dur) => toast(msg, 'warning', dur),
  info: (msg, dur) => toast(msg, 'info', dur)
};
