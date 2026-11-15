/**
 * core/router.js — Hash-based SPA Router.
 * Handles parameters (#/donors/:id), query strings, title updates, and focus management.
 * @module core/router
 */

import { emit } from './events.js';

let routes = [];
let notFoundHandler = () => document.createElement('div');
let beforeLeaveHook = null;

export function registerRoutes(newRoutes, on404) {
  routes = newRoutes;
  if (on404) notFoundHandler = on404;
}

export function setBeforeLeave(hook) {
  beforeLeaveHook = hook;
}

/**
 * Parses current hash into path, params, and query.
 * @returns {{path: string, params: Record<string, string>, query: URLSearchParams}}
 */
export function getRouteState() {
  const hash = window.location.hash || '#/dashboard';
  const [pathPart, queryPart] = hash.slice(1).split('?');
  const query = new URLSearchParams(queryPart || '');

  for (const route of routes) {
    const paramNames = [];
    const regexPath = route.path.replace(/\/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '/([^/]+)';
    });

    const match = pathPart.match(new RegExp(`^${regexPath}$`));
    if (match) {
      const params = {};
      paramNames.forEach((name, idx) => {
        params[name] = decodeURIComponent(match[idx + 1]);
      });
      return { path: route.path, handler: route.handler, title: route.title, params, query };
    }
  }

  return { path: pathPart, handler: notFoundHandler, title: 'Not Found', params: {}, query };
}

/**
 * Navigates to a new hash location.
 * @param {string} hash
 */
export function navigate(hash) {
  if (beforeLeaveHook && !beforeLeaveHook()) {
    return;
  }
  window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
}

export function initRouter(appMountPoint) {
  const renderCurrent = async () => {
    const route = getRouteState();

    if (route.title) {
      document.title = `${route.title} — Blood Bank & Donor System`;
    }

    // Scroll to top
    window.scrollTo(0, 0);

    // Active navigation sync
    document.querySelectorAll('#main-nav .nav-item').forEach(el => {
      const href = el.getAttribute('href');
      if (href && href.startsWith(route.path.split('/:')[0])) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Render page
    const view = await route.handler(route.params, route.query);
    appMountPoint.replaceChildren(view);

    // Focus h1 if exists for accessibility
    const h1 = appMountPoint.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus();
    }

    emit('route:changed', route);
  };

  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}
