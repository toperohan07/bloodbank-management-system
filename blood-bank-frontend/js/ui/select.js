/**
 * ui/select.js — Searchable asynchronous select (ARIA combobox) for foreign keys.
 * Displays "Name — #ID" plus contextual badges.
 * @module ui/select
 */

import { h, debounce } from '../core/dom.js';

/**
 * Creates a searchable select combobox.
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {string|number|null} [options.value]
 * @param {string} [options.placeholder='Select or search...']
 * @param {Array<{value: any, label: string, subtitle?: string}>} [options.options]
 * @param {Function} [options.loadOptions] - Async function (searchQuery) => Promise<Array>
 * @param {Function} [options.onChange]
 * @returns {HTMLElement}
 */
export function searchableSelect({ id, name, value = null, placeholder = 'Select or search...', options = [], loadOptions = null, onChange = null }) {
  let selectedValue = value;
  let items = [...options];

  const input = h('input', {
    type: 'text',
    className: 'form-control',
    placeholder,
    autocomplete: 'off',
    role: 'combobox',
    ariaExpanded: 'false',
    id
  });

  const hiddenInput = h('input', {
    type: 'hidden',
    name,
    value: value || ''
  });

  const dropdown = h('div', {
    className: 'card',
    style: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: '0',
      right: '0',
      maxHeight: '220px',
      overflowY: 'auto',
      zIndex: 'var(--z-dropdown)',
      display: 'none',
      padding: 'var(--space-1)'
    }
  });

  function renderDropdown(list) {
    dropdown.replaceChildren();
    if (list.length === 0) {
      dropdown.appendChild(h('div', { style: { padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' } }, 'No matches found'));
      return;
    }

    list.forEach(item => {
      const optEl = h('div', {
        className: 'btn btn--ghost',
        style: {
          width: '100%',
          justifyContent: 'flex-start',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          textAlign: 'left'
        },
        onClick: () => {
          selectedValue = item.value;
          hiddenInput.value = item.value;
          input.value = item.label;
          closeDropdown();
          if (onChange) onChange(item.value, item);
        }
      },
        h('span', { style: { fontWeight: 'var(--font-medium)' } }, item.label),
        item.subtitle ? h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' } }, item.subtitle) : null
      );
      dropdown.appendChild(optEl);
    });
  }

  // Pre-fill label if value exists
  if (value && options.length > 0) {
    const found = options.find(o => String(o.value) === String(value));
    if (found) input.value = found.label;
  }

  function openDropdown() {
    dropdown.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
    input.setAttribute('aria-expanded', 'false');
  }

  const debouncedSearch = debounce(async (query) => {
    if (loadOptions) {
      const dynamicItems = await loadOptions(query);
      items = dynamicItems || [];
      renderDropdown(items);
    } else {
      const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
      renderDropdown(filtered);
    }
    openDropdown();
  }, 250);

  input.addEventListener('focus', () => {
    if (loadOptions && items.length === 0) {
      debouncedSearch('');
    } else {
      renderDropdown(items);
      openDropdown();
    }
  });

  input.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  });

  const wrapper = h('div', { style: { position: 'relative', width: '100%' } }, input, hiddenInput, dropdown);
  return wrapper;
}
