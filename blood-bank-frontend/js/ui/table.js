/**
 * ui/table.js — Comprehensive Data Table with Server-side Pagination & CSV Export.
 * Features debounced search, URL query state synchronization, responsive card collapse under 640px,
 * and AbortController for stale request cancellation.
 * @module ui/table
 */

import { h, debounce } from '../core/dom.js';
import { pagination } from './pagination.js';
import { skeletonTable } from './skeleton.js';
import { notify } from './toast.js';

/**
 * Creates an interactive data table.
 * @param {object} config
 * @param {Array<{key: string, label: string, render?: (val: any, row: any) => Node|string}>} config.columns
 * @param {Function} config.fetchPage - (params: {page, limit, search, ...filters}, signal) => Promise<{data: Array, pagination: object}>
 * @param {Array<{key: string, label: string, type: 'select'|'text', options?: Array}>} [config.filters=[]]
 * @param {Array<{label: string, icon?: string, danger?: boolean, onClick: (row: any) => void}>} [config.rowActions=[]]
 * @param {string} [config.exportName='export']
 * @param {Function} [config.onRowClick=null]
 * @returns {HTMLElement}
 */
export function dataTable(config) {
  const container = h('div', { className: 'data-table-view' });

  // State initialized from URL query params
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  let currentPage = parseInt(urlParams.get('page') || '1', 10);
  let pageSize = parseInt(urlParams.get('limit') || '25', 10);
  let currentSearch = urlParams.get('search') || '';
  const activeFilters = {};

  if (config.filters) {
    config.filters.forEach(f => {
      const v = urlParams.get(f.key);
      if (v) activeFilters[f.key] = v;
    });
  }

  let abortController = null;
  let currentSort = { key: null, asc: true };
  let cachedData = [];

  // Toolbar
  const searchInput = h('input', {
    type: 'search',
    className: 'form-control',
    placeholder: 'Search records...',
    value: currentSearch
  });

  const refreshBtn = h('button', {
    className: 'btn btn--ghost btn--sm',
    ariaLabel: 'Refresh data',
    onClick: () => loadData()
  }, '↻ Refresh');

  const filterControls = [];
  if (config.filters) {
    config.filters.forEach(f => {
      if (f.type === 'select') {
        const select = h('select', {
          className: 'form-control',
          style: { width: 'auto' },
          onChange: (e) => {
            if (e.target.value) {
              activeFilters[f.key] = e.target.value;
            } else {
              delete activeFilters[f.key];
            }
            currentPage = 1;
            syncUrlAndLoad();
          }
        },
          h('option', { value: '' }, `All ${f.label}`),
          ...(f.options || []).map(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            const optEl = h('option', { value: val }, lbl);
            if (activeFilters[f.key] === val) optEl.selected = true;
            return optEl;
          })
        );
        filterControls.push(select);
      }
    });
  }

  const toolbar = h('div', { className: 'toolbar' },
    h('div', { className: 'toolbar__search' }, searchInput),
    h('div', { className: 'toolbar__actions' },
      ...filterControls,
      refreshBtn
    )
  );
  container.appendChild(toolbar);

  // Active filter chips
  const chipsBar = h('div', { className: 'filter-bar', style: { display: 'none' } });
  container.appendChild(chipsBar);

  // Table wrapper mount point
  const tableMount = h('div', {});
  container.appendChild(tableMount);

  // Pagination mount point
  const paginationMount = h('div', {});
  container.appendChild(paginationMount);

  function syncUrl() {
    const hashParts = window.location.hash.split('?');
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (pageSize !== 25) params.set('limit', String(pageSize));
    if (currentSearch) params.set('search', currentSearch);
    for (const [k, v] of Object.entries(activeFilters)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    const newHash = qs ? `${hashParts[0]}?${qs}` : hashParts[0];
    window.history.replaceState(null, '', newHash);
  }

  function syncUrlAndLoad() {
    syncUrl();
    loadData();
  }

  searchInput.addEventListener('input', debounce((e) => {
    currentSearch = e.target.value.trim();
    currentPage = 1;
    syncUrlAndLoad();
  }, 300));

  async function loadData() {
    if (abortController) abortController.abort();
    abortController = new AbortController();

    tableMount.replaceChildren(skeletonTable(5, config.columns.length + (config.rowActions?.length ? 1 : 0)));
    paginationMount.replaceChildren();

    // Update chips
    updateFilterChips();

    try {
      const queryParams = {
        page: currentPage,
        limit: pageSize,
        search: currentSearch || undefined,
        ...activeFilters
      };

      const result = await config.fetchPage(queryParams, abortController.signal);
      cachedData = result.data || [];

      renderTable(cachedData, result.pagination);
    } catch (err) {
      if (err.name === 'AbortError') return;

      tableMount.replaceChildren(h('div', { className: 'empty-state' },
        h('h3', { className: 'empty-state__title' }, 'Unable to Load Data'),
        h('p', { className: 'empty-state__description' }, err.message || 'Server error or network failure.'),
        h('button', { className: 'btn btn--primary', onClick: () => loadData() }, 'Retry')
      ));
    }
  }

  function updateFilterChips() {
    chipsBar.replaceChildren();
    const entries = Object.entries(activeFilters);
    if (entries.length === 0 && !currentSearch) {
      chipsBar.style.display = 'none';
      return;
    }

    chipsBar.style.display = 'flex';
    if (currentSearch) {
      chipsBar.appendChild(h('div', { className: 'filter-chip' },
        h('span', {}, `Search: "${currentSearch}"`),
        h('span', {
          className: 'filter-chip__remove',
          onClick: () => {
            currentSearch = '';
            searchInput.value = '';
            currentPage = 1;
            syncUrlAndLoad();
          }
        }, '✕')
      ));
    }

    entries.forEach(([k, v]) => {
      const fDef = config.filters?.find(f => f.key === k);
      chipsBar.appendChild(h('div', { className: 'filter-chip' },
        h('span', {}, `${fDef ? fDef.label : k}: ${v}`),
        h('span', {
          className: 'filter-chip__remove',
          onClick: () => {
            delete activeFilters[k];
            currentPage = 1;
            syncUrlAndLoad();
          }
        }, '✕')
      ));
    });
  }

  function renderTable(data, paginationData) {
    if (data.length === 0) {
      tableMount.replaceChildren(h('div', { className: 'empty-state' },
        h('h3', { className: 'empty-state__title' }, 'No Records Found'),
        h('p', { className: 'empty-state__description' }, 'Try clearing active filters or adjusting your search.')
      ));
      return;
    }

    // Apply client-side sorting on current page if requested
    let displayRows = [...data];
    if (currentSort.key) {
      displayRows.sort((a, b) => {
        const valA = a[currentSort.key];
        const valB = b[currentSort.key];
        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
      });
    }

    const tableWrapper = h('div', { className: 'table-container' });
    const table = h('table', { className: 'data-table data-table--responsive' });

    // Table Header
    const thead = h('thead', {});
    const headerRow = h('tr', {});

    config.columns.forEach(col => {
      const th = h('th', {
        style: { cursor: 'pointer', userSelect: 'none' },
        onClick: () => {
          if (currentSort.key === col.key) {
            currentSort.asc = !currentSort.asc;
          } else {
            currentSort.key = col.key;
            currentSort.asc = true;
          }
          renderTable(cachedData, paginationData);
        }
      },
        col.label,
        currentSort.key === col.key ? (currentSort.asc ? ' ▲' : ' ▼') : ''
      );
      headerRow.appendChild(th);
    });

    if (config.rowActions && config.rowActions.length > 0) {
      headerRow.appendChild(h('th', { style: { textAlign: 'right' } }, 'Actions'));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Table Body
    const tbody = h('tbody', {});
    displayRows.forEach(row => {
      const tr = h('tr', {
        style: config.onRowClick ? { cursor: 'pointer' } : {},
        onClick: (e) => {
          if (!e.target.closest('button') && config.onRowClick) {
            config.onRowClick(row);
          }
        }
      });

      config.columns.forEach(col => {
        const td = h('td', { dataset: { label: col.label } });
        const val = row[col.key];
        if (col.render) {
          td.appendChild(col.render(val, row));
        } else {
          td.textContent = val !== null && val !== undefined ? String(val) : '—';
        }
        tr.appendChild(td);
      });

      if (config.rowActions && config.rowActions.length > 0) {
        const actionTd = h('td', {
          dataset: { label: 'Actions' },
          style: { textAlign: 'right' }
        });

        config.rowActions.forEach(act => {
          const btn = h('button', {
            className: `btn btn--sm ${act.danger ? 'btn--danger' : 'btn--secondary'}`,
            style: { marginLeft: 'var(--space-1)' },
            onClick: (e) => {
              e.stopPropagation();
              act.onClick(row);
            }
          }, act.label);
          actionTd.appendChild(btn);
        });
        tr.appendChild(actionTd);
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableMount.replaceChildren(tableWrapper);

    // Render pagination controls
    if (paginationData) {
      paginationMount.replaceChildren(pagination({
        page: paginationData.page || currentPage,
        pages: paginationData.pages || 1,
        total: paginationData.total || data.length,
        limit: paginationData.limit || pageSize,
        onPageChange: (newPage) => {
          currentPage = newPage;
          syncUrlAndLoad();
        }
      }));
    }
  }

  loadData();
  return container;
}
