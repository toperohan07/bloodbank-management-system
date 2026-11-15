/**
 * ui/skeleton.js — Skeleton loader components.
 * Generates accessible shimmer placeholders during loading states.
 * @module ui/skeleton
 */

/**
 * Generates a skeleton element.
 * @param {string} [type='text'] - 'text', 'card', 'table'
 * @param {object} [options={}] - Options like width, height, lines
 * @returns {HTMLElement}
 */
export function skeleton(type = 'text', options = {}) {
  const el = document.createElement('div');
  el.className = 'skeleton';
  el.setAttribute('aria-hidden', 'true');

  if (type === 'text') {
    el.classList.add('skeleton-text');
    if (options.short) el.classList.add('skeleton-text--short');
    if (options.medium) el.classList.add('skeleton-text--medium');
  } else if (type === 'card') {
    el.style.height = options.height || '120px';
    el.style.width = options.width || '100%';
    el.style.borderRadius = 'var(--radius-lg)';
  }

  return el;
}

/**
 * Creates a skeleton table placeholder.
 * @param {number} [rows=5] - Number of placeholder rows
 * @param {number} [cols=4] - Number of placeholder columns
 * @returns {HTMLDivElement}
 */
export function skeletonTable(rows = 5, cols = 4) {
  const container = document.createElement('div');
  container.className = 'table-container';
  container.setAttribute('aria-busy', 'true');
  container.setAttribute('aria-label', 'Loading data...');

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (let c = 0; c < cols; c++) {
    const th = document.createElement('th');
    th.appendChild(skeleton('text', { short: true }));
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.appendChild(skeleton('text', { medium: c === 0 }));
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}
