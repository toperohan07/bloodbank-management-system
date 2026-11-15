/**
 * pages/donations.js — Blood donation tracking, history, and registration workflows.
 * Links directly to post-donation testing with automatic prompt.
 * @module pages/donations
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { notify } from '../ui/toast.js';
import { bloodGroupBadge, donationStatusBadge } from '../ui/badge.js';
import { formatDate, formatQuantityMl, localDateString } from '../core/format.js';
import donationsService from '../services/donations.js';
import lookupsService from '../services/lookups.js';
import { BLOOD_GROUPS, DONATION_STATUSES, DEFAULT_QUANTITY_ML, MIN_QUANTITY_ML, MAX_QUANTITY_ML } from '../config.js';
import donorsService from '../services/donors.js';
import { navigate } from '../core/router.js';

export default function renderDonations(params, query) {
  const container = h('div', { className: 'donations-page' });

  const registerBtn = h('button', {
    className: 'btn btn--primary',
    onClick: () => openDonationForm()
  }, '+ Record Donation');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Donation Records'),
      h('p', { className: 'page-subtitle' }, 'Track collections, donor intakes, and workflow handover to testing.')
    ),
    registerBtn
  );
  container.appendChild(header);

  const table = dataTable({
    columns: [
      { key: 'donation_id', label: 'ID' },
      {
        key: 'donor_name',
        label: 'Donor',
        render: (name, row) => h('a', {
          href: `#/donors/${row.donor_id}`,
          style: { fontWeight: 'var(--font-medium)' }
        }, name || `Donor #${row.donor_id}`)
      },
      {
        key: 'blood_group',
        label: 'Group',
        render: (g) => bloodGroupBadge(g)
      },
      {
        key: 'donation_date',
        label: 'Date',
        render: (d) => formatDate(d)
      },
      {
        key: 'quantity_ml',
        label: 'Quantity',
        render: (q) => formatQuantityMl(q)
      },
      { key: 'bank_name', label: 'Blood Bank' },
      { key: 'staff_name', label: 'Attending Staff' },
      {
        key: 'donation_status',
        label: 'Status',
        render: (s) => donationStatusBadge(s)
      }
    ],
    fetchPage: (p, signal) => donationsService.history(p, signal),
    filters: [
      { key: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS },
      { key: 'donation_status', label: 'Status', type: 'select', options: DONATION_STATUSES }
    ],
    rowActions: [
      {
        label: 'Record Test',
        onClick: (row) => navigate(`/bloodtests?donation_id=${row.donation_id}`)
      },
      {
        label: 'Delete',
        danger: true,
        onClick: async (row) => {
          const ok = await confirm({
            title: 'Delete Donation',
            message: `Delete donation #${row.donation_id}? This is only allowed if no test or inventory records exist.`,
            danger: true
          });
          if (ok) {
            try {
              await donationsService.remove(row.donation_id);
              notify.success('Donation deleted');
              navigate('/donations');
            } catch (err) {
              if (err.status === 409) {
                notify.error('Cannot delete: A blood test or inventory item is already associated with this donation.');
              } else {
                notify.error(err.message || 'Delete failed');
              }
            }
          }
        }
      }
    ],
    searchable: false,
    exportName: 'donations_history'
  });

  container.appendChild(table);

  // "Record Donation" button on a donor profile links here with ?donor_id=<id>
  const prefillDonorId = query && query.get('donor_id');
  if (prefillDonorId) setTimeout(() => openDonationForm(prefillDonorId), 0);

  return container;
}

async function openDonationForm(prefillDonorId = null) {
  const [banks, staffList] = await Promise.all([
    lookupsService.getBloodBanks(),
    lookupsService.getStaff()
  ]);

  const bankOptions = banks.map(b => ({ value: b.bank_id, label: `${b.bank_name} (${b.city || 'City'})` }));
  const staffOptions = staffList.map(s => ({ value: s.staff_id, label: `${s.staff_name} — ${s.designation || 'Staff'}` }));

  const todayStr = localDateString();

  // If we came from a donor profile, pre-select that donor
  let prefillOptions = [];
  if (prefillDonorId) {
    try {
      const d = (await donorsService.get(prefillDonorId)).data;
      prefillOptions = [{ value: d.donor_id, label: `${d.donor_name} (#${d.donor_id})` }];
    } catch {
      prefillDonorId = null;
    }
  }

  formDialog({
    title: 'Register New Donation',
    initialValues: prefillDonorId ? { donor_id: Number(prefillDonorId) } : {},
    fields: [
      {
        name: 'donor_id',
        label: 'Donor',
        type: 'searchSelect',
        required: true,
        options: prefillOptions,
        loadOptions: async (query) => {
          const donorList = await donorsService.list({ search: query, limit: 10 });
          return (donorList.data || []).map(d => ({
            value: d.donor_id,
            label: `${d.donor_name} (#${d.donor_id})`,
            subtitle: `Group ${d.blood_group} • ${d.city || ''}`
          }));
        }
      },
      { name: 'bank_id', label: 'Blood Bank', type: 'select', options: bankOptions, required: true },
      { name: 'staff_id', label: 'Staff Member', type: 'select', options: staffOptions, required: true },
      { name: 'donation_date', label: 'Donation Date', type: 'date', default: todayStr, required: true },
      { name: 'quantity_ml', label: 'Quantity (ml)', type: 'number', min: MIN_QUANTITY_ML, max: MAX_QUANTITY_ML, default: DEFAULT_QUANTITY_ML, required: true, help: `Between ${MIN_QUANTITY_ML} and ${MAX_QUANTITY_ML} ml` },
      { name: 'donation_status', label: 'Status', type: 'select', options: DONATION_STATUSES, default: 'Accepted', required: true }
    ],
    onSubmit: async (data) => {
      const res = await donationsService.create(data);
      const donationId = res.data?.donation_id;
      notify.success('Donation recorded successfully!');

      if (donationId) {
        const testOk = await confirm({
          title: 'Next Step: Record Blood Test',
          message: `Donation #${donationId} saved. Would you like to record laboratory test results for this donation now?`,
          confirmText: 'Record Test Now',
          cancelText: 'Later'
        });
        if (testOk) {
          navigate(`/bloodtests?donation_id=${donationId}`);
        }
      }
    }
  });
}
