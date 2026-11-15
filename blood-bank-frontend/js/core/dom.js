/**
 * core/dom.js — Safe DOM builders and functional helpers.
 * Prevents XSS by construction using textContent and attribute setters.
 * @module core/dom
 */

/**
 * Safe element builder.
 * @param {string} tag - HTML tag name
 * @param {object} [attrs={}] - Attributes, styles, or event handlers (e.g. onClick)
 * @param {...(Node|string|number)} children - Child elements or text
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs || {})) {
    if (val === undefined || val === null || val === false) continue;

    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, val);
    } else if (key === 'className' || key === 'class') {
      el.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key === 'dataset' && typeof val === 'object') {
      Object.assign(el.dataset, val);
    } else if (key === 'htmlFor') {
      el.setAttribute('for', val);
    } else {
      el.setAttribute(key, val === true ? '' : val);
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

/**
 * Escapes raw strings for safe HTML insertion.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escaping tagged template string builder.
 * Interpolated values are escaped automatically unless marked safe.
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {string}
 */
export function html(strings, ...values) {
  return strings.reduce((acc, str, i) => {
    const val = values[i - 1];
    let safeVal = '';
    if (val !== undefined && val !== null) {
      safeVal = Array.isArray(val) ? val.map(escapeHtml).join('') : escapeHtml(val);
    }
    return acc + safeVal + str;
  });
}

/**
 * Mounts a component to a target container, clearing existing content.
 * @param {HTMLElement} target
 * @param {Node} element
 */
export function mount(target, element) {
  if (!target) return;
  target.replaceChildren(element);
}

/**
 * Debounce utility.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle utility.
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
