/**
 * ui/pagination.js — Reusable pagination component.
 * Supports first/prev/next/last, page numbers with ellipsis, and go-to-page input.
 * @module ui/pagination
 */

import { h } from '../core/dom.js';

/**
 * Creates pagination controls.
 * @param {object} options
 * @param {number} options.page - Current page (1-based)
 * @param {number} options.pages - Total pages
 * @param {number} options.total - Total records
 * @param {number} options.limit - Items per page
 * @param {Function} options.onPageChange - Callback (newPage: number) => void
 * @returns {HTMLElement}
 */
export function pagination({ page, pages, total, limit, onPageChange }) {
  if (!pages || pages <= 1) {
    return h('div', { className: 'pagination' },
      h('div', { className: 'pagination__info' }, `Total: ${total || 0} records`)
    );
  }

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);
  const infoEl = h('div', { className: 'pagination__info' },
    `Showing ${startRecord}–${endRecord} of ${total} records`
  );

  const controls = h('div', { className: 'pagination__controls' });

  // First & Prev buttons
  controls.appendChild(h('button', {
    className: 'pagination__btn',
    disabled: page <= 1,
    ariaLabel: 'First page',
    onClick: () => onPageChange(1)
  }, '«'));

  controls.appendChild(h('button', {
    className: 'pagination__btn',
    disabled: page <= 1,
    ariaLabel: 'Previous page',
    onClick: () => onPageChange(page - 1)
  }, '‹'));

  // Numbered pages with ellipsis
  const delta = 1;
  const range = [];
  for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
    range.push(i);
  }

  if (page - delta > 2) range.unshift('...');
  if (page + delta < pages - 1) range.push('...');

  range.unshift(1);
  if (pages > 1) range.push(pages);

  range.forEach(p => {
    if (p === '...') {
      controls.appendChild(h('span', { style: { padding: '0 4px', color: 'var(--color-text-tertiary)' } }, '…'));
    } else {
      controls.appendChild(h('button', {
        className: `pagination__btn ${p === page ? 'active' : ''}`,
        onClick: () => onPageChange(p)
      }, String(p)));
    }
  });

  // Next & Last buttons
  controls.appendChild(h('button', {
    className: 'pagination__btn',
    disabled: page >= pages,
    ariaLabel: 'Next page',
    onClick: () => onPageChange(page + 1)
  }, '›'));

  controls.appendChild(h('button', {
    className: 'pagination__btn',
    disabled: page >= pages,
    ariaLabel: 'Last page',
    onClick: () => onPageChange(pages)
  }, '»'));

  return h('div', { className: 'pagination' }, infoEl, controls);
}
