/**
 * pages/requests.js — Hospital blood request lifecycle, prioritization queue, and fulfillment tracking.
 * Features issued/required progress bars and seed-data quirk resolution.
 * @module pages/requests
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { notify } from '../ui/toast.js';
import { bloodGroupBadge, requestStatusBadge, urgencyBadge } from '../ui/badge.js';
import { formatDate, pluralize, localDateString } from '../core/format.js';
import requestsService from '../services/requests.js';
import lookupsService from '../services/lookups.js';
import { api } from '../core/api.js';
import { BLOOD_GROUPS, URGENCY_LEVELS, REQUEST_STATUSES } from '../config.js';
import { navigate } from '../core/router.js';

export default function renderRequests(params, query) {
  if (params && params.id) {
    return renderRequestDetail(params.id);
  }
  return renderRequestList(query);
}

function renderRequestList(query) {
  const container = h('div', { className: 'requests-page' });

  const raiseBtn = h('button', {
    className: 'btn btn--primary',
    onClick: () => openRequestForm()
  }, '+ Raise Blood Request');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Hospital Blood Requests'),
      h('p', { className: 'page-subtitle' }, 'Track patient demands, triage critical needs, and coordinate fulfillment.')
    ),
    raiseBtn
  );
  container.appendChild(header);

  // Tabs: All / Pending Queue
  const urlTab = (query && query.get('tab')) || 'all';
  const tabs = h('div', { className: 'tabs' },
    h('div', {
      className: `tab ${urlTab === 'all' ? 'active' : ''}`,
      onClick: () => navigate('/requests?tab=all')
    }, 'All Requests'),
    h('div', {
      className: `tab ${urlTab === 'pending' ? 'active' : ''}`,
      onClick: () => navigate('/requests?tab=pending')
    }, 'Pending Priority Queue')
  );
  container.appendChild(tabs);

  const fetchEndpoint = (p, signal) => {
    if (urlTab === 'pending') {
      return requestsService.pending(p, signal);
    }
    return requestsService.list(p, signal);
  };

  const table = dataTable({
    columns: [
      { key: 'request_id', label: 'ID' },
      {
        key: 'patient_name',
        label: 'Patient',
        render: (name, row) => h('div', {},
          h('div', { style: { fontWeight: 'bold' } }, name || `Patient #${row.patient_id}`),
          h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, row.hospital_name || `Hospital #${row.hospital_id}`)
        )
      },
      {
        key: 'blood_group',
        label: 'Group',
        render: (g) => bloodGroupBadge(g)
      },
      {
        key: 'progress',
        label: 'Issued / Required',
        render: (_, row) => {
          const req = row.units_required || 1;
          const iss = row.units_issued || 0;
          const pct = Math.min(100, Math.round((iss / req) * 100));

          let barColor = 'var(--color-primary)';
          if (pct >= 100) barColor = 'var(--color-success)';

          const progressEl = h('div', { style: { minWidth: '120px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '2px' } },
              h('span', { style: { fontWeight: 'bold' } }, `${iss} / ${req}`),
              h('span', { style: { color: 'var(--color-text-tertiary)' } }, `${pct}%`)
            ),
            h('div', { className: 'progress' },
              h('div', { className: 'progress__bar', style: { width: `${pct}%`, backgroundColor: barColor } })
            )
          );

          // Seed quirk notice: fully issued but Pending
          if (row.request_status === 'Pending' && iss >= req) {
            progressEl.appendChild(h('button', {
              className: 'btn btn--ghost btn--sm',
              style: { fontSize: '10px', padding: '1px 4px', marginTop: '2px', color: 'var(--color-info)' },
              onClick: async (e) => {
                e.stopPropagation();
                const ok = await confirm({
                  title: 'Seed Data Helper',
                  message: 'This sample request is already fully issued. Would you like to mark its status as Fulfilled?'
                });
                if (ok) {
                  try {
                    await requestsService.update(row.request_id, { request_status: 'Fulfilled' });
                    notify.success('Request marked as Fulfilled');
                    navigate('/requests');
                  } catch (err) {
                    notify.error(err.message || 'Could not update the request');
                  }
                }
              }
            }, 'Mark Fulfilled?'));
          }

          return progressEl;
        }
      },
      {
        key: 'urgency',
        label: 'Urgency',
        render: (u) => urgencyBadge(u)
      },
      {
        key: 'request_status',
        label: 'Status',
        render: (s) => requestStatusBadge(s)
      },
      {
        key: 'request_date',
        label: 'Date',
        render: (d) => formatDate(d)
      }
    ],
    fetchPage: fetchEndpoint,
    filters: [
      { key: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS },
      { key: 'urgency', label: 'Urgency', type: 'select', options: URGENCY_LEVELS },
      ...(urlTab === 'all' ? [{ key: 'request_status', label: 'Status', type: 'select', options: REQUEST_STATUSES }] : [])
    ],
    searchable: false,
    rowActions: [
      {
        label: 'Issue Blood',
        onClick: (row) => navigate(`/issue?request=${row.request_id}`)
      },
      {
        label: 'Details',
        onClick: (row) => navigate(`/requests/${row.request_id}`)
      }
    ],
    exportName: `blood_requests_${urlTab}`,
    onRowClick: (row) => navigate(`/requests/${row.request_id}`)
  });

  container.appendChild(table);
  return container;
}

async function openRequestForm() {
  const [patients, hospitals] = await Promise.all([
    lookupsService.getPatients(),
    lookupsService.getHospitals()
  ]);

  const hospitalOptions = hospitals.map(h => ({ value: h.hospital_id, label: `${h.hospital_name} (${h.city || ''})` }));
  const todayStr = localDateString();

  formDialog({
    title: 'Raise Blood Request',
    fields: [
      {
        name: 'patient_id',
        label: 'Patient',
        type: 'searchSelect',
        required: true,
        loadOptions: async (query) => {
          return patients
            .filter(p => !query || p.patient_name.toLowerCase().includes(query.toLowerCase()))
            .map(p => ({
              value: p.patient_id,
              label: `${p.patient_name} (#${p.patient_id})`,
              subtitle: `Group ${p.blood_group} • ${p.age || '—'} yrs`,
              bloodGroup: p.blood_group
            }));
        },
        // The requested group normally equals the patient's group, so pre-fill it
        onChange: (value, item) => {
          const el = document.getElementById('blood_group');
          if (el && item.bloodGroup) el.value = item.bloodGroup;
        }
      },
      { name: 'hospital_id', label: 'Requesting Hospital', type: 'select', options: hospitalOptions, required: true },
      { name: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS, required: true },
      { name: 'units_required', label: 'Units Required', type: 'number', min: 1, max: 50, default: 1, required: true },
      { name: 'urgency', label: 'Urgency Level', type: 'select', options: URGENCY_LEVELS, default: 'Normal', required: true },
      { name: 'request_date', label: 'Request Date', type: 'date', default: todayStr, required: true }
    ],
    onSubmit: async (data) => {
      const res = await requestsService.create(data);
      notify.success('Blood request raised successfully');
      if (res.data?.request_id) {
        navigate(`/requests/${res.data.request_id}`);
      }
    }
  });
}

// Runs a status change and shows the server's message if it fails (instead of failing silently).
async function changeStatus(requestId, status, successMessage) {
  try {
    await requestsService.update(requestId, { request_status: status });
    notify.success(successMessage);
    navigate(`/requests/${requestId}`);
  } catch (err) {
    notify.error(err.message || 'Could not update the request');
  }
}

async function renderRequestDetail(requestId) {
  const container = h('div', { className: 'request-detail-view' });

  const backBtn = h('button', {
    className: 'btn btn--ghost btn--sm',
    style: { marginBottom: 'var(--space-4)' },
    onClick: () => navigate('/requests')
  }, '← Back to Requests');
  container.appendChild(backBtn);

  const mount = h('div', {});
  container.appendChild(mount);

  try {
    const [reqRes, issuesRes] = await Promise.all([
      requestsService.get(requestId),
      api('/issues/history', { query: { request_id: requestId } })
    ]);

    const req = reqRes.data;
    const issues = issuesRes.data || [];

    const unitsIssued = req.units_issued || 0;
    const unitsRemaining = Math.max(0, req.units_required - unitsIssued);
    const isClosed = req.request_status === 'Fulfilled' || req.request_status === 'Rejected' || req.request_status === 'Cancelled';
    const canIssue = !isClosed && unitsRemaining > 0;

    const card = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } },
      h('div', { className: 'card__header' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' } },
          h('h1', { className: 'card__title' }, `Request #${req.request_id}`),
          bloodGroupBadge(req.blood_group),
          urgencyBadge(req.urgency),
          requestStatusBadge(req.request_status)
        ),
        h('div', { style: { display: 'flex', gap: 'var(--space-2)' } },
          canIssue
            ? h('button', {
                className: 'btn btn--primary',
                onClick: () => navigate(`/issue?request=${req.request_id}`)
              }, 'Issue Blood Now')
            : h('button', {
                className: 'btn btn--secondary',
                disabled: true,
                title: isClosed ? 'Request is already closed.' : 'All required units have already been issued.'
              }, 'Fully Issued / Closed')
        )
      ),
      h('div', { className: 'card__body' },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' } },
          h('div', {},
            h('span', { className: 'stat-card__label' }, 'Patient'),
            h('div', { style: { fontSize: 'var(--text-lg)', fontWeight: 'bold' } }, req.patient_name || `Patient #${req.patient_id}`),
          ),
          h('div', {},
            h('span', { className: 'stat-card__label' }, 'Hospital'),
            h('div', { style: { fontSize: 'var(--text-lg)', fontWeight: 'bold' } }, req.hospital_name || `Hospital #${req.hospital_id}`)
          ),
          h('div', {},
            h('span', { className: 'stat-card__label' }, 'Required / Remaining'),
            h('div', { style: { fontSize: 'var(--text-lg)', fontWeight: 'bold' } }, `${req.units_required} required (${unitsRemaining} remaining)`),
            h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-success)' } }, `${unitsIssued} units fulfilled`)
          ),
          h('div', {},
            h('span', { className: 'stat-card__label' }, 'Request Date'),
            h('div', { style: { fontSize: 'var(--text-base)' } }, formatDate(req.request_date))
          )
        ),

        // Status Transition Actions
        h('div', {
          style: {
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 'var(--space-2)'
          }
        },
          req.request_status === 'Pending'
            ? h('button', {
                className: 'btn btn--secondary btn--sm',
                onClick: () => changeStatus(req.request_id, 'Approved', 'Request approved')
              }, '✓ Approve Request')
            : null,
          req.request_status === 'Pending' || req.request_status === 'Approved'
            ? h('button', {
                className: 'btn btn--danger btn--sm',
                onClick: async () => {
                  const ok = await confirm({ title: 'Reject Request', message: 'Mark this request as Rejected?', danger: true });
                  if (ok) await changeStatus(req.request_id, 'Rejected', 'Request marked as Rejected');
                }
              }, '✕ Reject')
            : null,
          req.request_status === 'Pending' || req.request_status === 'Approved'
            ? h('button', {
                className: 'btn btn--secondary btn--sm',
                onClick: async () => {
                  const ok = await confirm({ title: 'Cancel Request', message: 'Mark this request as Cancelled?', danger: true });
                  if (ok) await changeStatus(req.request_id, 'Cancelled', 'Request marked as Cancelled');
                }
              }, 'Cancel Request')
            : null
        )
      )
    );
    mount.appendChild(card);

    // Issues against this request
    const issuesCard = h('div', { className: 'card' },
      h('div', { className: 'card__header' },
        h('h2', { className: 'card__title' }, 'Issues Fulfilled Against This Request')
      ),
      h('div', { className: 'card__body', style: { padding: 0 } },
        issues.length === 0
          ? h('div', { className: 'empty-state', style: { padding: 'var(--space-6)' } },
              h('p', {}, 'No units issued against this request yet.')
            )
          : h('table', { className: 'data-table' },
              h('thead', {},
                h('tr', {},
                  h('th', {}, 'Issue ID'),
                  h('th', {}, 'Units'),
                  h('th', {}, 'Stock Inventory ID'),
                  h('th', {}, 'Issuing Staff'),
                  h('th', {}, 'Date')
                )
              ),
              h('tbody', {},
                ...issues.map(iss => h('tr', {},
                  h('td', {}, `#${iss.issue_id}`),
                  h('td', { style: { fontWeight: 'bold' } }, pluralize(iss.units_issued, 'unit')),
                  h('td', {}, `Inventory #${iss.inventory_id}`),
                  h('td', {}, iss.staff_name || `Staff #${iss.staff_id}`),
                  h('td', {}, formatDate(iss.issue_date))
                ))
              )
            )
      )
    );
    mount.appendChild(issuesCard);

  } catch (err) {
    mount.replaceChildren(h('div', { className: 'empty-state' },
      h('h2', { className: 'empty-state__title' }, 'Request Not Found'),
      h('p', { className: 'empty-state__description' }, err.message || 'Unable to retrieve blood request details.'),
      h('button', { className: 'btn btn--primary', onClick: () => navigate('/requests') }, 'Back to Requests')
    ));
  }

  return container;
}
