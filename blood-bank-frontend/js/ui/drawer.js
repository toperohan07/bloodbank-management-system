/**
 * ui/drawer.js — Right slide-out panel for record inspection and secondary views.
 * @module ui/drawer
 */

import { h } from '../core/dom.js';

let activeDrawer = null;

/**
 * Opens a right-side drawer panel.
 * @param {object} options
 * @param {string} options.title
 * @param {HTMLElement|string} options.content
 * @returns {{close: () => void, el: HTMLElement}}
 */
export function openDrawer({ title, content }) {
  if (activeDrawer) activeDrawer.close();

  const titleEl = h('h2', { className: 'modal__title' }, title);
  const closeBtn = h('button', {
    className: 'btn btn--ghost btn--icon-only',
    ariaLabel: 'Close drawer',
    onClick: () => close()
  }, '✕');

  const header = h('div', { className: 'drawer__header' }, titleEl, closeBtn);
  const body = h('div', { className: 'drawer__body' }, content);

  const drawerEl = h('div', { className: 'drawer open' }, header, body);
  const backdrop = h('div', {
    className: 'drawer-backdrop',
    onClick: (e) => {
      if (e.target === backdrop) close();
    }
  }, drawerEl);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function close() {
    window.removeEventListener('keydown', handleKeyDown);
    drawerEl.classList.remove('open');
    setTimeout(() => {
      backdrop.remove();
      activeDrawer = null;
    }, 200);
  }

  window.addEventListener('keydown', handleKeyDown);
  document.getElementById('drawer-root').appendChild(backdrop);

  activeDrawer = { close, el: drawerEl };
  return activeDrawer;
}

export function closeDrawer() {
  if (activeDrawer) activeDrawer.close();
}
