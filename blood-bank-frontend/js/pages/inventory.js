/**
 * pages/inventory.js — Blood Inventory management, expiration tracking, stock intake, and audit inspection.
 * Uses backend expiry_status and provides FEFO (first-expiring-first-out) visibility.
 * @module pages/inventory
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { openDrawer } from '../ui/drawer.js';
import { notify } from '../ui/toast.js';
import { bloodGroupBadge, expiryBadge, testStatusBadge } from '../ui/badge.js';
import { formatDate, formatRelativeDays } from '../core/format.js';
import inventoryService from '../services/inventory.js';
import donationsService from '../services/donations.js';
import lookupsService from '../services/lookups.js';
import { api } from '../core/api.js';
import { BLOOD_GROUPS, COMPONENT_TYPES, EXPIRY_STATUSES } from '../config.js';
import { navigate } from '../core/router.js';

export default function renderInventory(params, query) {
  const container = h('div', { className: 'inventory-page' });

  const addStockBtn = h('button', {
    className: 'btn btn--primary',
    onClick: () => openAddStockForm()
  }, '+ Intake Stock');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Blood Inventory & Stock'),
      h('p', { className: 'page-subtitle' }, 'Track usable, expiring, and quarantine blood components across banks.')
    ),
    addStockBtn
  );
  container.appendChild(header);

  // Summary KPI Mini-Strip
  const summaryStrip = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } });
  container.appendChild(summaryStrip);
  loadSummaryStrip(summaryStrip);

  // Tabs: All / Expiring Soon / Expired
  const urlTab = (query && query.get('tab')) || 'all';
  const tabs = h('div', { className: 'tabs' },
    h('div', {
      className: `tab ${urlTab === 'all' ? 'active' : ''}`,
      onClick: () => navigate('/inventory?tab=all')
    }, 'All Inventory'),
    h('div', {
      className: `tab ${urlTab === 'expiring' ? 'active' : ''}`,
      onClick: () => navigate('/inventory?tab=expiring&days=30')
    }, 'Expiring Soon (30d)'),
    h('div', {
      className: `tab ${urlTab === 'expired' ? 'active' : ''}`,
      onClick: () => navigate('/inventory?tab=expired')
    }, 'Expired Units')
  );
  container.appendChild(tabs);

  const fetchEndpoint = (p, signal) => {
    if (urlTab === 'expiring') {
      const days = (query && query.get('days')) || 30;
      return inventoryService.expiring(days, signal);
    }
    if (urlTab === 'expired') {
      return inventoryService.expired(signal);
    }
    return inventoryService.list(p, signal);
  };

  const table = dataTable({
    columns: [
      { key: 'inventory_id', label: 'ID' },
      {
        key: 'blood_group',
        label: 'Group',
        render: (g) => bloodGroupBadge(g)
      },
      { key: 'component_type', label: 'Component' },
      {
        key: 'units_available',
        label: 'Units Avail.',
        render: (u) => u === 0
          ? h('span', { className: 'badge badge--danger' }, 'Out of Stock')
          : h('span', { style: { fontWeight: 'bold' } }, String(u))
      },
      { key: 'bank_name', label: 'Blood Bank' },
      {
        key: 'expiry_date',
        label: 'Expiry',
        render: (exp, row) => h('div', {},
          h('div', {}, formatDate(exp)),
          expiryBadge(row.expiry_status)
        )
      },
      {
        key: 'test_status',
        label: 'Test Status',
        render: (status) => testStatusBadge(status)
      }
    ],
    fetchPage: fetchEndpoint,
    filters: [
      { key: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS },
      { key: 'expiry_status', label: 'Expiry Status', type: 'select', options: EXPIRY_STATUSES }
    ],
    rowActions: [
      {
        label: 'Inspect',
        onClick: (row) => openInventoryDrawer(row)
      },
      {
        label: 'Delete',
        danger: true,
        onClick: async (row) => {
          const ok = await confirm({
            title: 'Delete Inventory Unit',
            message: `Delete stock #${row.inventory_id}? Blocked if any units were already issued.`,
            danger: true
          });
          if (ok) {
            try {
              await inventoryService.remove(row.inventory_id);
              notify.success('Inventory deleted');
              navigate('/inventory');
            } catch (err) {
              if (err.status === 409) {
                notify.error('Cannot delete: Units from this stock item have already been issued.');
              } else {
                notify.error(err.message || 'Failed to delete');
              }
            }
          }
        }
      }
    ],
    exportName: `inventory_${urlTab}`,
    onRowClick: (row) => openInventoryDrawer(row)
  });

  container.appendChild(table);
  return container;
}

async function loadSummaryStrip(mount) {
  try {
    const res = await inventoryService.summary();
    const d = res.data;
    if (!d) return;

    mount.replaceChildren(
      h('div', { className: 'card__body', style: { display: 'flex', gap: 'var(--space-6)', justifyContent: 'space-around', flexWrap: 'wrap' } },
        h('div', {},
          h('span', { className: 'stat-card__label' }, 'Total Stock Units'),
          h('div', { style: { fontSize: 'var(--text-2xl)', fontWeight: 'bold' } }, String(d.total_units || 0))
        ),
        h('div', {},
          h('span', { className: 'stat-card__label' }, 'Usable & Safe'),
          h('div', { style: { fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)' } }, String(d.usable_units || 0))
        ),
        h('div', {},
          h('span', { className: 'stat-card__label' }, 'Expired Stock'),
          h('div', { style: { fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-danger)' } }, String(d.expired_units || 0))
        )
      )
    );
  } catch {
    mount.style.display = 'none';
  }
}

async function openAddStockForm() {
  const [banks, donations] = await Promise.all([
    lookupsService.getBloodBanks(),
    donationsService.history({ limit: 100 })
  ]);

  const bankOptions = banks.map(b => ({ value: b.bank_id, label: `${b.bank_name} (${b.city || ''})` }));
  const componentOptions = Object.keys(COMPONENT_TYPES).map(c => ({ value: c, label: `${c} (${COMPONENT_TYPES[c]}d shelf life)` }));

  const todayStr = new Date().toISOString().slice(0, 10);
  // Default Whole Blood expiry (+35 days)
  const defaultExp = new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10);

  formDialog({
    title: 'Intake Blood Stock to Inventory',
    fields: [
      {
        name: 'donation_id',
        label: 'Donation',
        type: 'searchSelect',
        required: true,
        loadOptions: async (query) => {
          return (donations.data || []).map(d => ({
            value: d.donation_id,
            label: `Donation #${d.donation_id} — ${d.donor_name} (${d.blood_group})`,
            subtitle: `Collected ${formatDate(d.donation_date)} • Bank #${d.bank_id}`
          }));
        }
      },
      { name: 'blood_group', label: 'Blood Group (Locked to Donor)', type: 'select', options: BLOOD_GROUPS, required: true },
      { name: 'bank_id', label: 'Blood Bank Storage', type: 'select', options: bankOptions, required: true },
      { name: 'component_type', label: 'Component Type', type: 'select', options: componentOptions, default: 'Whole Blood', required: true },
      { name: 'units_available', label: 'Units to Intake', type: 'number', default: 1, min: 1, required: true },
      { name: 'collection_date', label: 'Collection Date', type: 'date', default: todayStr, required: true },
      { name: 'expiry_date', label: 'Expiry Date', type: 'date', default: defaultExp, required: true }
    ],
    onSubmit: async (data) => {
      await inventoryService.create(data);
      notify.success('Inventory stock added successfully');
      navigate('/inventory');
    }
  });
}

async function openInventoryDrawer(item) {
  const drawerContent = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      h('span', { style: { fontSize: 'var(--text-lg)', fontWeight: 'bold' } }, `Inventory #${item.inventory_id}`),
      bloodGroupBadge(item.blood_group)
    ),
    h('div', { className: 'card', style: { padding: 'var(--space-3)' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Component:'),
        h('span', { style: { fontWeight: 'bold' } }, item.component_type || 'Whole Blood')
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Units Available:'),
        h('span', { style: { fontWeight: 'bold' } }, String(item.units_available))
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Blood Bank:'),
        h('span', {}, item.bank_name || `Bank #${item.bank_id}`)
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Collection Date:'),
        h('span', {}, formatDate(item.collection_date))
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Expiry Date:'),
        h('span', {}, `${formatDate(item.expiry_date)} (${formatRelativeDays(item.expiry_date)})`)
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' } },
        h('span', { style: { color: 'var(--color-text-tertiary)' } }, 'Lab Test Safety:'),
        testStatusBadge(item.test_status)
      )
    ),
    h('h3', { style: { fontSize: 'var(--text-md)', fontWeight: 'bold', marginTop: 'var(--space-2)' } }, 'Issue History for This Unit'),
    h('div', { id: 'drawer-issue-history', style: { fontSize: 'var(--text-xs)' } }, 'Loading issue history...')
  );

  openDrawer({
    title: 'Inventory Item Details',
    content: drawerContent
  });

  try {
    const issuesRes = await api('/issues', { query: { inventory_id: item.inventory_id } });
    const issues = issuesRes.data || [];
    const target = drawerContent.querySelector('#drawer-issue-history');

    if (issues.length === 0) {
      target.textContent = 'No issues recorded from this inventory unit yet.';
    } else {
      target.replaceChildren();
      const list = h('ul', { style: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' } });
      issues.forEach(iss => {
        list.appendChild(h('li', {
          style: {
            padding: 'var(--space-2)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-sm)'
          }
        },
          h('div', { style: { fontWeight: 'bold' } }, `Issue #${iss.issue_id} — ${iss.units_issued} unit(s)`),
          h('div', { style: { color: 'var(--color-text-tertiary)' } }, `Issued on ${formatDate(iss.issue_date)} by Staff #${iss.staff_id}`)
        ));
      });
      target.appendChild(list);
    }
  } catch {
    const target = drawerContent.querySelector('#drawer-issue-history');
    if (target) target.textContent = 'Unable to load issue history.';
  }
}
