/**
 * ui/confirm.js — Accessible confirmation dialog returning a Promise.
 * @module ui/confirm
 */

import { openModal } from './modal.js';
import { h } from '../core/dom.js';

/**
 * Prompts the user with a confirmation modal.
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {boolean} [options.danger=false]
 * @returns {Promise<boolean>}
 */
export function confirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;

    const cancelBtn = h('button', {
      className: 'btn btn--secondary',
      onClick: () => {
        settled = true;
        modal.close();
        resolve(false);
      }
    }, cancelText);

    const confirmBtn = h('button', {
      className: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
      onClick: () => {
        settled = true;
        modal.close();
        resolve(true);
      }
    }, confirmText);

    const content = h('p', { style: { lineHeight: '1.6', color: 'var(--color-text)' } }, message);

    const modal = openModal({
      title,
      content,
      actions: [cancelBtn, confirmBtn],
      closeOnEscape: true
    });

    const origClose = modal.close;
    modal.close = () => {
      origClose();
      if (!settled) resolve(false);
    };
  });
}
