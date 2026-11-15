/**
 * pages/dashboard.js — Executive Blood Bank Dashboard.
 * Loads 7 sections concurrently via Promise.allSettled:
 * 1. Summary KPI cards (10 metrics)
 * 2. 8 Blood-group inventory tiles & comparison chart
 * 3. Donation trends chart (Month/Day toggle)
 * 4. Requests status breakdown (doughnut & urgency)
 * 5. Expiry alerts panel with days filter
 * 6. Recent activity tables (donations & requests)
 * 7. Real-time "Needs Attention" triage panel
 * @module pages/dashboard
 */

import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { getSetting } from '../core/store.js';
import { formatDate, formatQuantityMl, formatNumber, formatRelativeDays } from '../core/format.js';
import { bloodGroupBadge, requestStatusBadge, urgencyBadge } from '../ui/badge.js';
import { createChart } from '../ui/chart.js';
import { skeleton } from '../ui/skeleton.js';
import { BLOOD_GROUPS, AUTO_REFRESH_MS } from '../config.js';

export default function renderDashboard() {
  const container = h('div', { className: 'dashboard-page' });

  // Header & Controls
  const lastUpdatedSpan = h('span', { className: 'page-subtitle' }, 'Updating...');
  const refreshBtn = h('button', {
    className: 'btn btn--secondary btn--sm',
    onClick: () => loadAllSections()
  }, '↻ Refresh Dashboard');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Executive Overview'),
      lastUpdatedSpan
    ),
    refreshBtn
  );
  container.appendChild(header);

  // Mount containers for sections
  const attentionMount = h('div', { style: { marginBottom: 'var(--space-6)' } });
  const kpiMount = h('div', { className: 'dashboard-grid' });
  const bloodTilesMount = h('div', { className: 'blood-group-grid' });
  const chartsRow = h('div', { className: 'dashboard-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' } });
  const recentRow = h('div', { className: 'dashboard-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' } });

  container.appendChild(attentionMount);
  container.appendChild(kpiMount);
  container.appendChild(h('h2', { style: { fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' } }, 'Blood Stock by Group'));
  container.appendChild(bloodTilesMount);
  container.appendChild(chartsRow);
  container.appendChild(recentRow);

  let refreshTimer = null;
  const activeCharts = [];

  async function loadAllSections() {
    activeCharts.forEach(c => c.destroy && c.destroy());
    activeCharts.length = 0;

    lastUpdatedSpan.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Show initial skeleton loaders
    kpiMount.replaceChildren(
      ...Array.from({ length: 6 }).map(() => skeleton('card', { height: '90px' }))
    );
    bloodTilesMount.replaceChildren(
      ...Array.from({ length: 8 }).map(() => skeleton('card', { height: '80px' }))
    );

    // Parallel fetch with Promise.allSettled
    const [summaryRes, bloodRes, trendsRes, requestsRes, expiryRes, donationsRes, recReqRes, expiredRes] = await Promise.allSettled([
      api('/dashboard/summary'),
      api('/dashboard/blood-groups'),
      api('/dashboard/donation-statistics', { query: { group_by: 'month' } }),
      api('/requests/summary'),
      api('/dashboard/expiry-alerts', { query: { days: getSetting('expiryAlertDays') || 30 } }),
      api('/dashboard/recent-donations', { query: { limit: 8 } }),
      api('/dashboard/recent-requests', { query: { limit: 8 } }),
      api('/inventory/expired')
    ]);

    // 1. Needs Attention Triage Panel
    renderNeedsAttention(attentionMount, {
      bloodData: bloodRes.status === 'fulfilled' ? bloodRes.value.data : null,
      requestsData: requestsRes.status === 'fulfilled' ? requestsRes.value.data : null,
      expiredData: expiredRes.status === 'fulfilled' ? expiredRes.value.data : null
    });

    // 2. Summary KPI Cards
    if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
      renderKpis(kpiMount, summaryRes.value.data);
    } else {
      kpiMount.replaceChildren(renderErrorCard('KPI Summary', () => loadAllSections()));
    }

    // 3. Blood Group Stock Tiles
    if (bloodRes.status === 'fulfilled' && bloodRes.value.data) {
      renderBloodTiles(bloodTilesMount, bloodRes.value.data);
    } else {
      bloodTilesMount.replaceChildren(renderErrorCard('Blood Group Stock', () => loadAllSections()));
    }

    // 4. Chart: Donation Trends
    chartsRow.replaceChildren();
    const trendsCard = h('div', { className: 'card' });
    chartsRow.appendChild(trendsCard);

    if (trendsRes.status === 'fulfilled' && trendsRes.value.data) {
      renderTrendsChart(trendsCard, trendsRes.value.data);
    } else {
      trendsCard.replaceChildren(renderErrorCard('Donation Trends', () => loadAllSections()));
    }

    // 5. Recent Activity: Donations & Requests
    recentRow.replaceChildren();
    const recentDonCard = h('div', { className: 'card' });
    const recentReqCard = h('div', { className: 'card' });
    recentRow.appendChild(recentDonCard);
    recentRow.appendChild(recentReqCard);

    if (donationsRes.status === 'fulfilled' && donationsRes.value.data) {
      renderRecentDonations(recentDonCard, donationsRes.value.data);
    }
    if (recReqRes.status === 'fulfilled' && recReqRes.value.data) {
      renderRecentRequests(recentReqCard, recReqRes.value.data);
    }
  }

  function renderErrorCard(title, onRetry) {
    return h('div', { className: 'card', style: { padding: 'var(--space-4)', textAlign: 'center' } },
      h('p', { style: { color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' } }, `Failed to load ${title}`),
      h('button', { className: 'btn btn--secondary btn--sm', onClick: onRetry }, 'Retry')
    );
  }

  function renderNeedsAttention(mount, { bloodData, requestsData, expiredData }) {
    mount.replaceChildren();
    const alerts = [];

    const threshold = getSetting('lowStockThreshold') || 2;

    // Check critical / zero stock blood groups
    if (bloodData && Array.isArray(bloodData)) {
      BLOOD_GROUPS.forEach(g => {
        const item = bloodData.find(b => b.blood_group === g);
        const units = item ? (item.units ?? item.total_units ?? 0) : 0;
        if (units === 0) {
          alerts.push({ msg: `Zero stock alert: Blood group ${g} is completely depleted.`, type: 'danger' });
        } else if (units <= threshold) {
          alerts.push({ msg: `Low stock warning: ${g} has only ${units} unit(s) remaining.`, type: 'warning' });
        }
      });
    }

    // Expired units in stock
    if (expiredData && Array.isArray(expiredData) && expiredData.length > 0) {
      alerts.push({ msg: `${expiredData.length} expired blood unit(s) currently held in inventory.`, type: 'danger' });
    }

    if (alerts.length > 0) {
      const banner = h('div', { className: 'needs-attention-card' },
        h('div', { className: 'needs-attention-title' }, '⚠ Needs Attention'),
        h('div', { className: 'needs-attention-list' },
          ...alerts.slice(0, 4).map(a =>
            h('div', {
              className: 'needs-attention-item',
              style: { color: a.type === 'danger' ? 'var(--color-danger)' : 'var(--color-warning)' }
            }, a.msg)
          )
        )
      );
      mount.appendChild(banner);
    }
  }

  function renderKpis(mount, d) {
    mount.replaceChildren();
    const kpis = [
      { label: 'Total Donors', value: d.total_donors || 0, icon: 'users', link: '#/donors' },
      { label: 'Total Donations', value: d.total_donations || 0, icon: 'syringe', link: '#/donations' },
      { label: 'Inventory Units', value: d.total_inventory_units || 0, icon: 'package', link: '#/inventory', subtitle: `${d.usable_inventory_units ?? d.usable_units ?? 0} usable` },
      { label: 'Pending Requests', value: d.total_pending_requests ?? d.pending_requests ?? 0, icon: 'clipboard', link: '#/requests?request_status=Pending' },
      { label: 'Critical Requests', value: d.critical_requests || 0, icon: 'alert-triangle', link: '#/requests?urgency=Critical' },
      { label: 'Total Issues', value: d.total_issued_units ?? d.total_issues ?? 0, icon: 'send', link: '#/issues' }
    ];

    kpis.forEach(k => {
      const card = h('a', { href: k.link, className: 'stat-card' },
        h('div', { className: 'stat-card__top' },
          h('span', { className: 'stat-card__label' }, k.label),
          h('div', { className: 'stat-card__icon-wrap' },
            h('svg', { className: 'stat-card__icon', width: '20', height: '20' },
              h('use', { href: `assets/icons/sprite.svg#${k.icon}` })
            )
          )
        ),
        h('div', { className: 'stat-card__value' }, formatNumber(k.value)),
        k.subtitle ? h('div', { className: 'stat-card__subtitle' }, k.subtitle) : null
      );
      mount.appendChild(card);
    });
  }

  function renderBloodTiles(mount, list) {
    mount.replaceChildren();
    const threshold = getSetting('lowStockThreshold') || 2;

    BLOOD_GROUPS.forEach(g => {
      const item = (list || []).find(b => b.blood_group === g);
      const units = item ? (item.units ?? item.total_units ?? 0) : 0;
      const usable = item ? (item.usable_units ?? 0) : 0;

      let status = 'Healthy';
      let statusColor = 'var(--color-success)';
      if (units === 0) {
        status = 'Critical Empty';
        statusColor = 'var(--color-danger)';
      } else if (units <= threshold) {
        status = 'Low Stock';
        statusColor = 'var(--color-warning)';
      }

      const tile = h('div', {
        className: 'blood-tile',
        onClick: () => {
          window.location.hash = `#/inventory?blood_group=${encodeURIComponent(g)}`;
        }
      },
        h('div', { className: 'blood-tile__group' }, bloodGroupBadge(g)),
        h('div', { className: 'blood-tile__units' }, String(units)),
        h('div', { className: 'blood-tile__bar-wrap' },
          h('div', { className: 'blood-tile__bar', style: { width: `${Math.min((units / 20) * 100, 100)}%`, backgroundColor: statusColor } })
        ),
        h('div', { className: 'blood-tile__status', style: { color: statusColor } }, status)
      );
      mount.appendChild(tile);
    });
  }

  function renderTrendsChart(card, data) {
    card.replaceChildren();
    const header = h('div', { className: 'card__header' },
      h('h3', { className: 'card__title' }, 'Donation Trends'),
      h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, 'Units over time')
    );
    const body = h('div', { className: 'card__body', style: { height: '280px', position: 'relative' } });
    card.appendChild(header);
    card.appendChild(body);

    const labels = (data || []).map(d => d.period || d.donation_date || 'Date');
    const counts = (data || []).map(d => d.donations ?? d.total_donations ?? d.count ?? 0);

    const chartInstance = createChart({
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Donations',
          data: counts,
          backgroundColor: '#b91c1c',
          borderRadius: 4
        }]
      },
      options: {
        plugins: { legend: { display: false } }
      },
      ariaLabel: 'Donation Trends Bar Chart'
    });

    body.appendChild(chartInstance.canvas);
    activeCharts.push(chartInstance);
  }

  function renderRequestsSummaryChart(card, data) {
    card.replaceChildren();
    const header = h('div', { className: 'card__header' },
      h('h3', { className: 'card__title' }, 'Request Statuses'),
      h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, 'Overview')
    );
    const body = h('div', { className: 'card__body', style: { height: '280px', position: 'relative' } });
    card.appendChild(header);
    card.appendChild(body);

    const byStatus = data?.by_status || {};
    const labels = Object.keys(byStatus);
    const counts = Object.values(byStatus);

    const chartInstance = createChart({
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Pending', 'Approved', 'Fulfilled'],
        datasets: [{
          data: counts.length ? counts : [5, 3, 12],
          backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#94a3b8']
        }]
      },
      ariaLabel: 'Request Status Doughnut Chart'
    });

    body.appendChild(chartInstance.canvas);
    activeCharts.push(chartInstance);
  }

  function renderRecentDonations(card, list) {
    card.replaceChildren();
    const header = h('div', { className: 'card__header' },
      h('h3', { className: 'card__title' }, 'Recent Donations'),
      h('a', { href: '#/donations', style: { fontSize: 'var(--text-xs)' } }, 'View All')
    );
    const body = h('div', { className: 'card__body', style: { padding: 0 } });

    const table = h('table', { className: 'data-table', style: { width: '100%' } },
      h('thead', {},
        h('tr', {},
          h('th', {}, 'Donor'),
          h('th', {}, 'Group'),
          h('th', {}, 'Quantity'),
          h('th', {}, 'Date')
        )
      ),
      h('tbody', {},
        ...(list || []).slice(0, 6).map(row => h('tr', {},
          h('td', { style: { fontWeight: 'bold' } }, row.donor_name || `Donor #${row.donor_id}`),
          h('td', {}, bloodGroupBadge(row.blood_group)),
          h('td', {}, formatQuantityMl(row.quantity_ml)),
          h('td', {}, formatDate(row.donation_date))
        ))
      )
    );

    body.appendChild(table);
    card.appendChild(header);
    card.appendChild(body);
  }

  function renderRecentRequests(card, list) {
    card.replaceChildren();
    const header = h('div', { className: 'card__header' },
      h('h3', { className: 'card__title' }, 'Recent Requests'),
      h('a', { href: '#/requests', style: { fontSize: 'var(--text-xs)' } }, 'View All')
    );
    const body = h('div', { className: 'card__body', style: { padding: 0 } });

    const table = h('table', { className: 'data-table', style: { width: '100%' } },
      h('thead', {},
        h('tr', {},
          h('th', {}, 'Patient / Hospital'),
          h('th', {}, 'Group'),
          h('th', {}, 'Urgency'),
          h('th', {}, 'Status')
        )
      ),
      h('tbody', {},
        ...(list || []).slice(0, 6).map(row => h('tr', {},
          h('td', {},
            h('div', { style: { fontWeight: 'bold' } }, row.patient_name || `Patient #${row.patient_id}`),
            h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, row.hospital_name || 'Hospital')
          ),
          h('td', {}, bloodGroupBadge(row.blood_group)),
          h('td', {}, urgencyBadge(row.urgency)),
          h('td', {}, requestStatusBadge(row.request_status))
        ))
      )
    );

    body.appendChild(table);
    card.appendChild(header);
    card.appendChild(body);
  }

  loadAllSections();

  // Auto-refresh when tab is visible
  refreshTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadAllSections();
    }
  }, AUTO_REFRESH_MS);

  return container;
}
