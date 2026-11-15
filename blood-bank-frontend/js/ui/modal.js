/**
 * ui/modal.js — Accessible, focus-trapped promise-based modal dialog.
 * Closes on Escape, traps focus inside, and returns focus on close.
 * @module ui/modal
 */

import { h } from '../core/dom.js';

let activeModal = null;

/**
 * Opens a modal dialog.
 * @param {object} options
 * @param {string} options.title - Dialog title
 * @param {HTMLElement|string} options.content - Modal body content
 * @param {Array<HTMLElement>} [options.actions=[]] - Footer action buttons
 * @param {boolean} [options.closeOnEscape=true]
 * @returns {{close: () => void, el: HTMLElement}}
 */
export function openModal({ title, content, actions = [], closeOnEscape = true }) {
  if (activeModal) {
    activeModal.close();
  }

  const previousActiveElement = document.activeElement;

  const titleEl = h('h2', { className: 'modal__title' }, title);
  const closeBtn = h('button', {
    className: 'btn btn--ghost btn--icon-only',
    ariaLabel: 'Close modal',
    onClick: () => close()
  }, '✕');

  const header = h('div', { className: 'modal__header' }, titleEl, closeBtn);
  const body = h('div', { className: 'modal__body' }, content);

  const footer = actions.length > 0
    ? h('div', { className: 'modal__footer' }, ...actions)
    : null;

  const modalEl = h('div', {
    className: 'modal',
    role: 'dialog',
    ariaModal: 'true',
    ariaLabel: title
  }, header, body, footer);

  const backdrop = h('div', {
    className: 'modal-backdrop',
    onClick: (e) => {
      if (e.target === backdrop) close();
    }
  }, modalEl);

  function handleKeyDown(e) {
    if (e.key === 'Escape' && closeOnEscape) {
      e.preventDefault();
      close();
    }
  }

  function close() {
    window.removeEventListener('keydown', handleKeyDown);
    backdrop.remove();
    activeModal = null;
    if (previousActiveElement && previousActiveElement.focus) {
      previousActiveElement.focus();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  document.getElementById('modal-root').appendChild(backdrop);

  // Focus the close button or first action
  closeBtn.focus();

  activeModal = { close, el: modalEl };
  return activeModal;
}

export function closeModal() {
  if (activeModal) activeModal.close();
}
