/**
 * main.js — Application entry point.
 * Initializes the app shell, sidebar navigation, topbar health check, router, shortcuts, and global error handling.
 * @module main
 */

import { ROUTES, PROJECT_INFO } from './config.js';
import { getSettings, updateSettings } from './core/store.js';
import { on } from './core/events.js';
import { api } from './core/api.js';
import { registerRoutes, initRouter, navigate } from './core/router.js';
import { toast, notify } from './ui/toast.js';
import { openModal } from './ui/modal.js';
import { h } from './core/dom.js';

// Import all page controllers
import renderDashboard from './pages/dashboard.js';
import renderDonors from './pages/donors.js';
import renderDonations from './pages/donations.js';
import renderBloodTests from './pages/bloodtests.js';
import renderInventory from './pages/inventory.js';
import renderRequests from './pages/requests.js';
import renderIssues from './pages/issues.js';
import renderIssueWizard from './pages/issuewizard.js';
import renderBloodBanks from './pages/bloodbanks.js';
import renderHospitals from './pages/hospitals.js';
import renderPatients from './pages/patients.js';
import renderStaff from './pages/staff.js';
import renderSettings from './pages/settings.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme from settings
  const settings = getSettings();
  document.documentElement.setAttribute('data-theme', settings.theme || 'light');

  // 2. Build Sidebar Navigation Groups
  const navContainer = document.getElementById('main-nav');
  if (navContainer) {
    const groups = {};
    ROUTES.forEach(route => {
      if (!route.navGroup) return; // Hidden from primary nav (e.g. styleguide)
      if (!groups[route.navGroup]) groups[route.navGroup] = [];
      groups[route.navGroup].push(route);
    });

    for (const [groupName, routesInGroup] of Object.entries(groups)) {
      const groupEl = h('div', { className: 'nav-group' });
      groupEl.appendChild(h('div', { className: 'nav-group-title' }, groupName));

      routesInGroup.forEach(r => {
        const item = h('a', {
          href: r.path,
          className: 'nav-item',
          ariaLabel: r.title
        },
          h('svg', { ariaHidden: 'true', width: '20', height: '20' },
            h('use', { href: `assets/icons/sprite.svg#${r.icon}` })
          ),
          h('span', { className: 'nav-label' }, r.title)
        );

        item.addEventListener('click', () => {
          // Close mobile drawer on route click
          document.getElementById('sidebar')?.classList.remove('mobile-open');
          document.getElementById('sidebar-overlay')?.setAttribute('hidden', '');
        });

        groupEl.appendChild(item);
      });

      navContainer.appendChild(groupEl);
    }
  }

  // 3. Setup Shell Interactions
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const globalSearch = document.getElementById('global-search');
  const offlineBanner = document.getElementById('offline-banner');
  const offlineRetryBtn = document.getElementById('offline-retry-btn');
  const apiStatusPill = document.getElementById('api-status-pill');

  // Sidebar collapse state persistence
  const savedCollapsed = localStorage.getItem('bb-sidebar-collapsed') === 'true';
  if (savedCollapsed && sidebar) {
    sidebar.classList.add('collapsed');
  }

  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('bb-sidebar-collapsed', sidebar.classList.contains('collapsed'));
    });
  }

  // Mobile menu toggle
  if (menuToggleBtn && sidebar && sidebarOverlay) {
    menuToggleBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      sidebarOverlay.removeAttribute('hidden');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.setAttribute('hidden', '');
    });
  }

  // Theme toggle button
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      updateSettings({ theme: next });
    });
  }

  // Quick search shortcut ('/')
  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
      !document.activeElement?.isContentEditable
    ) {
      e.preventDefault();
      globalSearch?.focus();
    }
  });

  // 4. API Health Check and Status Monitoring
  async function checkApiHealth() {
    try {
      const res = await api('/health');
      if (res.data?.status === 'healthy' || res.message) {
        apiStatusPill?.classList.remove('offline');
        apiStatusPill?.classList.add('online');
        offlineBanner?.setAttribute('hidden', '');

        const versionSpan = document.getElementById('backend-version');
        if (versionSpan && res.data?.version) {
          versionSpan.textContent = `Backend v${res.data.version}`;
        }
      }
    } catch {
      apiStatusPill?.classList.remove('online');
      apiStatusPill?.classList.add('offline');
      offlineBanner?.removeAttribute('hidden');
    }
  }

  checkApiHealth();
  setInterval(checkApiHealth, 30000);
  window.addEventListener('focus', checkApiHealth);

  if (offlineRetryBtn) {
    offlineRetryBtn.addEventListener('click', checkApiHealth);
  }

  on('api:offline', () => {
    apiStatusPill?.classList.remove('online');
    apiStatusPill?.classList.add('offline');
    offlineBanner?.removeAttribute('hidden');
  });

  on('api:online', () => {
    apiStatusPill?.classList.remove('offline');
    apiStatusPill?.classList.add('online');
    offlineBanner?.setAttribute('hidden', '');
  });

  // 5. Global Error Boundary
  window.addEventListener('error', (e) => {
    console.error('Unhandled runtime error:', e.error);
    notify.error('An unexpected error occurred. Please refresh or retry.');
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled Promise rejection:', e.reason);
    notify.error(e.reason?.message || 'Network or application error.');
  });

  // 6. Router Setup
  const appMountPoint = document.getElementById('app');

  const routeDefinitions = [
    { path: '/dashboard', title: 'Dashboard', handler: renderDashboard },
    { path: '/donors', title: 'Donors', handler: renderDonors },
    { path: '/donors/:id', title: 'Donor Details', handler: renderDonors },
    { path: '/donations', title: 'Donations', handler: renderDonations },
    { path: '/bloodtests', title: 'Blood Tests', handler: renderBloodTests },
    { path: '/inventory', title: 'Inventory', handler: renderInventory },
    { path: '/requests', title: 'Blood Requests', handler: renderRequests },
    { path: '/requests/:id', title: 'Request Details', handler: renderRequests },
    { path: '/issue', title: 'Issue Blood Wizard', handler: renderIssueWizard },
    { path: '/issues', title: 'Issue History', handler: renderIssues },
    { path: '/bloodbanks', title: 'Blood Banks', handler: renderBloodBanks },
    { path: '/bloodbanks/:id', title: 'Blood Bank Details', handler: renderBloodBanks },
    { path: '/hospitals', title: 'Hospitals', handler: renderHospitals },
    { path: '/hospitals/:id', title: 'Hospital Details', handler: renderHospitals },
    { path: '/patients', title: 'Patients', handler: renderPatients },
    { path: '/patients/:id', title: 'Patient Details', handler: renderPatients },
    { path: '/staff', title: 'Staff', handler: renderStaff },
    { path: '/staff/:id', title: 'Staff Details', handler: renderStaff },
    { path: '/settings', title: 'Settings', handler: renderSettings }
  ];

  function render404() {
    return h('div', { className: 'empty-state' },
      h('div', { className: 'empty-state__icon' }, '⚠️'),
      h('h1', { className: 'empty-state__title' }, '404 — Page Not Found'),
      h('p', { className: 'empty-state__description' }, 'The page you requested does not exist or may have been moved.'),
      h('button', { className: 'btn btn--primary', onClick: () => navigate('/dashboard') }, 'Back to Dashboard')
    );
  }

  registerRoutes(routeDefinitions, render404);
  initRouter(appMountPoint);

  // Sync breadcrumbs on route change
  on('route:changed', (route) => {
    const breadcrumbs = document.getElementById('breadcrumbs');
    if (breadcrumbs) {
      breadcrumbs.replaceChildren();
      breadcrumbs.appendChild(h('a', { href: '#/dashboard' }, 'Home'));
      breadcrumbs.appendChild(h('span', {}, '/'));
      breadcrumbs.appendChild(h('span', { className: 'current' }, route.title || 'Page'));
    }
  });

  console.log(`${PROJECT_INFO.name} v${PROJECT_INFO.version} initialized.`);
});
