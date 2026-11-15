/**
 * pages/bloodtests.js — Laboratory blood testing and safety verification.
 * Enforces safety rule: Overall status is Safe ONLY IF HIV, Hepatitis, and Malaria are all Negative.
 * @module pages/bloodtests
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { notify } from '../ui/toast.js';
import { testStatusBadge } from '../ui/badge.js';
import { formatDate, localDateString } from '../core/format.js';
import bloodtestsService from '../services/bloodtests.js';
import donationsService from '../services/donations.js';
import { TEST_RESULTS, OVERALL_STATUSES } from '../config.js';
import { navigate } from '../core/router.js';

export default function renderBloodTests(params, query) {
  const container = h('div', { className: 'bloodtests-page' });

  const recordBtn = h('button', {
    className: 'btn btn--primary',
    onClick: () => openTestForm()
  }, '+ Record Test Result');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Laboratory Blood Testing'),
      h('p', { className: 'page-subtitle' }, 'Safety screening for HIV, Hepatitis, and Malaria before stock release.')
    ),
    recordBtn
  );
  container.appendChild(header);

  // Safety Rule Banner
  const banner = h('div', {
    className: 'alert alert--info',
    style: { marginBottom: 'var(--space-4)' }
  },
    h('span', { style: { fontWeight: 'bold' } }, 'Safety Protocol:'),
    h('span', {}, 'Only blood units whose laboratory test is verified "Safe" can be issued to hospitals and patients. A single positive result flags the donation as Unsafe.')
  );
  container.appendChild(banner);

  // Tabs: All / Safe / Unsafe
  const urlTab = (query && query.get('tab')) || 'all';
  const tabs = h('div', { className: 'tabs' },
    h('div', {
      className: `tab ${urlTab === 'all' ? 'active' : ''}`,
      onClick: () => navigate('/bloodtests?tab=all')
    }, 'All Tests'),
    h('div', {
      className: `tab ${urlTab === 'safe' ? 'active' : ''}`,
      onClick: () => navigate('/bloodtests?tab=safe')
    }, 'Safe Units'),
    h('div', {
      className: `tab ${urlTab === 'unsafe' ? 'active' : ''}`,
      onClick: () => navigate('/bloodtests?tab=unsafe')
    }, 'Unsafe / Positive')
  );
  container.appendChild(tabs);

  const fetchEndpoint = (p, signal) => {
    if (urlTab === 'safe') return bloodtestsService.safe(p, signal);
    if (urlTab === 'unsafe') return bloodtestsService.unsafe(p, signal);
    return bloodtestsService.list(p, signal);
  };

  const table = dataTable({
    columns: [
      { key: 'test_id', label: 'Test ID' },
      {
        key: 'donation_id',
        label: 'Donation',
        render: (dId) => `#${dId}`
      },
      {
        key: 'donor_name',
        label: 'Donor Name',
        render: (name, row) => name || `Donor (Donation #${row.donation_id})`
      },
      {
        key: 'test_date',
        label: 'Test Date',
        render: (d) => formatDate(d)
      },
      {
        key: 'hiv_result',
        label: 'HIV',
        render: (r) => renderTestBadge(r)
      },
      {
        key: 'hepatitis_result',
        label: 'Hepatitis',
        render: (r) => renderTestBadge(r)
      },
      {
        key: 'malaria_result',
        label: 'Malaria',
        render: (r) => renderTestBadge(r)
      },
      {
        key: 'overall_status',
        label: 'Overall Status',
        render: (s) => testStatusBadge(s)
      }
    ],
    fetchPage: fetchEndpoint,
    rowActions: [
      {
        label: 'Edit',
        onClick: (row) => openTestForm(row)
      },
      {
        label: 'Delete',
        danger: true,
        onClick: async (row) => {
          const ok = await confirm({
            title: 'Delete Blood Test',
            message: `Delete test #${row.test_id} for donation #${row.donation_id}?`,
            danger: true
          });
          if (ok) {
            try {
              await bloodtestsService.remove(row.test_id);
              notify.success('Test record deleted');
              navigate('/bloodtests');
            } catch (err) {
              notify.error(err.message || 'Failed to delete test');
            }
          }
        }
      }
    ],
    searchable: false,
    exportName: `blood_tests_${urlTab}`
  });

  container.appendChild(table);

  // "Record Test" on the donations page links here with ?donation_id=<id>
  const prefillDonationId = query && query.get('donation_id');
  if (prefillDonationId) setTimeout(() => openTestForm(null, prefillDonationId), 0);

  return container;
}

function renderTestBadge(result) {
  if (result === 'Negative') return h('span', { className: 'badge badge--success' }, 'Negative');
  if (result === 'Positive') return h('span', { className: 'badge badge--danger' }, 'Positive');
  return h('span', { className: 'badge badge--warning' }, 'Pending');
}

// Donations that still have NO blood test (a donation can only have one), newest first.
async function loadUntestedDonations() {
  const [donations, tests] = await Promise.all([
    donationsService.history({ limit: 200 }),
    bloodtestsService.list({ limit: 200 })
  ]);
  const tested = new Set((tests.data || []).map(t => t.donation_id));
  return (donations.data || []).filter(d => !tested.has(d.donation_id));
}

async function openTestForm(existing = null, prefillDonationId = null) {
  const isEdit = !!existing;
  const todayStr = localDateString();

  let untested = [];
  if (!isEdit) {
    try {
      untested = await loadUntestedDonations();
    } catch (err) {
      notify.error(err.message || 'Could not load donations');
      return;
    }
    if (prefillDonationId && !untested.some(d => String(d.donation_id) === String(prefillDonationId))) {
      notify.warning(`Donation #${prefillDonationId} already has a blood test (or does not exist).`);
      prefillDonationId = null;
    }
  }
  const toOption = (d) => ({
    value: d.donation_id,
    label: `Donation #${d.donation_id} — ${d.donor_name} (${d.blood_group})`,
    subtitle: `${d.quantity_ml} ml • ${formatDate(d.donation_date)}`
  });

  formDialog({
    title: isEdit ? `Edit Test #${existing.test_id}` : 'Record Blood Test Result',
    mode: isEdit ? 'edit' : 'create',
    initialValues: existing || {
      donation_id: prefillDonationId ? Number(prefillDonationId) : undefined,
      test_date: todayStr,
      hiv_result: 'Negative',
      hepatitis_result: 'Negative',
      malaria_result: 'Negative',
      overall_status: 'Safe'
    },
    fields: [
      {
        name: 'donation_id',
        label: 'Donation ID',
        type: isEdit ? 'number' : 'searchSelect',
        required: true,
        readOnly: isEdit,
        options: untested.map(toOption),
        loadOptions: async (query) => {
          const q = (query || '').toLowerCase();
          return untested
            .filter(d => !q || `#${d.donation_id} ${d.donor_name}`.toLowerCase().includes(q))
            .slice(0, 30)
            .map(toOption);
        }
      },
      { name: 'test_date', label: 'Test Date', type: 'date', default: todayStr, required: true },
      { name: 'hiv_result', label: 'HIV Screening', type: 'select', options: TEST_RESULTS, default: 'Negative', required: true },
      { name: 'hepatitis_result', label: 'Hepatitis Screening', type: 'select', options: TEST_RESULTS, default: 'Negative', required: true },
      { name: 'malaria_result', label: 'Malaria Screening', type: 'select', options: TEST_RESULTS, default: 'Negative', required: true },
      {
        name: 'overall_status',
        label: 'Overall Status',
        type: 'select',
        options: OVERALL_STATUSES,
        default: 'Safe',
        required: true,
        help: 'Safety rule: Can ONLY be Safe if HIV, Hepatitis, and Malaria are all Negative.'
      }
    ],
    onSubmit: async (data) => {
      // Client-side rule verification. In edit mode `data` holds only the CHANGED fields,
      // so check the full record (stored values + changes).
      const full = { ...(existing || {}), ...data };
      const isAllNegative = full.hiv_result === 'Negative' && full.hepatitis_result === 'Negative' && full.malaria_result === 'Negative';
      if (!isAllNegative && full.overall_status === 'Safe') {
        throw new Error('Overall status cannot be "Safe" when any test is Positive or Pending.');
      }

      if (isEdit) {
        await bloodtestsService.update(existing.test_id, data);
        notify.success('Test record updated');
      } else {
        await bloodtestsService.create(data);
        notify.success('Blood test result recorded successfully');
      }
      navigate('/bloodtests');
    }
  });
}
