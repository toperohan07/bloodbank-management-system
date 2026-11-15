/**
 * icon.js — SVG icon component. Renders icons from the local sprite sheet.
 */

const SPRITE_PATH = 'assets/icons/sprite.svg';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/**
 * Create an SVG icon element from the sprite sheet.
 * @param {string} name - Icon name (matches symbol id in sprite.svg)
 * @param {Object} [options] - Options
 * @param {number} [options.size=20] - Width and height in pixels
 * @param {string} [options.className] - Additional CSS class
 * @param {string} [options.ariaLabel] - Accessible label (makes icon visible to screen readers)
 * @returns {SVGElement} The SVG element
 */
export function icon(name, options = {}) {
  const size = options.size || 20;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);

  if (options.className) {
    svg.setAttribute('class', options.className);
  }

  if (options.ariaLabel) {
    svg.setAttribute('aria-label', options.ariaLabel);
    svg.setAttribute('role', 'img');
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttributeNS(XLINK_NS, 'href', `${SPRITE_PATH}#${name}`);

  svg.appendChild(use);
  return svg;
}

/**
 * Get icon HTML string for static insertion contexts.
 * @param {string} name - Icon name
 * @param {Object} [options] - Same as icon() options
 * @returns {string} SVG HTML string
 */
export function iconHtml(name, options = {}) {
  const size = options.size || 20;

  const classAttr = options.className ? ` class="${options.className}"` : '';

  const ariaAttrs = options.ariaLabel
    ? ` aria-label="${options.ariaLabel}" role="img"`
    : ' aria-hidden="true"';

  return (
    `<svg xmlns="${SVG_NS}" width="${size}" height="${size}"${classAttr}${ariaAttrs}>` +
    `<use href="${SPRITE_PATH}#${name}"></use>` +
    `</svg>`
  );
}
