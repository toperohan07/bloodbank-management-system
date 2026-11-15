/**
 * pages/donors.js — Donor management views: list, search, filters, CRUD, and comprehensive profile details.
 * Calculates advisory eligibility based on configurable waiting period (default 90 days).
 * @module pages/donors
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { notify } from '../ui/toast.js';
import { bloodGroupBadge } from '../ui/badge.js';
import { formatDate, formatRelativeDays, getInitials, daysFromToday, formatQuantityMl } from '../core/format.js';
import { getSetting } from '../core/store.js';
import donorsService from '../services/donors.js';
import { BLOOD_GROUPS, GENDERS, DONOR_MIN_AGE, DONOR_MAX_AGE } from '../config.js';
import { navigate } from '../core/router.js';

export default function renderDonors(params, query) {
  if (params && params.id) {
    return renderDonorDetail(params.id);
  }
  return renderDonorList();
}

function renderDonorList() {
  const container = h('div', { className: 'donors-page' });

  const createBtn = h('button', {
    className: 'btn btn--primary',
    onClick: () => openDonorForm()
  }, '+ Register Donor');

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Donors Directory'),
      h('p', { className: 'page-subtitle' }, 'Browse, search, register, and manage blood donors.')
    ),
    createBtn
  );
  container.appendChild(header);

  const eligibilityDays = getSetting('donorEligibilityDays') || 90;

  const table = dataTable({
    columns: [
      { key: 'donor_id', label: 'ID' },
      {
        key: 'donor_name',
        label: 'Donor',
        render: (name, row) => h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' } },
          h('div', { className: 'avatar avatar--sm' }, getInitials(name)),
          h('span', { style: { fontWeight: 'var(--font-medium)' } }, name)
        )
      },
      {
        key: 'blood_group',
        label: 'Group',
        render: (g) => bloodGroupBadge(g)
      },
      { key: 'age', label: 'Age', render: (a) => a !== null ? `${a} yrs` : '—' },
      { key: 'gender', label: 'Gender' },
      { key: 'city', label: 'City' },
      { key: 'phone', label: 'Phone' },
      {
        key: 'last_donation_date',
        label: 'Last Donation',
        render: (d) => d ? `${formatDate(d)} (${formatRelativeDays(d)})` : 'Never'
      },
      {
        key: 'eligibility',
        label: 'Eligibility (Advisory)',
        render: (_, row) => {
          if (!row.last_donation_date) {
            return h('span', { className: 'badge badge--success' }, 'Eligible');
          }
          const daysSince = Math.abs(daysFromToday(row.last_donation_date) || 0);
          if (daysSince >= eligibilityDays) {
            return h('span', { className: 'badge badge--success' }, 'Eligible');
          }
          const remaining = eligibilityDays - daysSince;
          return h('span', {
            className: 'badge badge--warning',
            title: `Advisory waiting period: ${eligibilityDays} days between donations.`
          }, `Eligible in ${remaining}d`);
        }
      }
    ],
    fetchPage: (p, signal) => donorsService.list(p, signal),
    filters: [
      { key: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS },
      { key: 'city', label: 'City', type: 'text' }
    ],
    rowActions: [
      {
        label: 'View',
        onClick: (row) => navigate(`/donors/${row.donor_id}`)
      },
      {
        label: 'Edit',
        onClick: (row) => openDonorForm(row)
      },
      {
        label: 'Delete',
        danger: true,
        onClick: async (row) => {
          const ok = await confirm({
            title: 'Delete Donor',
            message: `Are you sure you want to delete ${row.donor_name}? This action cannot be undone.`,
            confirmText: 'Delete',
            danger: true
          });
          if (ok) {
            try {
              await donorsService.remove(row.donor_id);
              notify.success('Donor deleted successfully');
              navigate('/donors');
            } catch (err) {
              if (err.status === 409) {
                notify.error('Cannot delete: This donor has existing donation records in the system.');
              } else {
                notify.error(err.message || 'Failed to delete donor');
              }
            }
          }
        }
      }
    ],
    exportName: 'donors_list',
    onRowClick: (row) => navigate(`/donors/${row.donor_id}`)
  });

  container.appendChild(table);
  return container;
}

function openDonorForm(existing = null) {
  const isEdit = !!existing;

  formDialog({
    title: isEdit ? `Edit Donor #${existing.donor_id}` : 'Register New Donor',
    mode: isEdit ? 'edit' : 'create',
    initialValues: existing || { blood_group: 'O+' },
    fields: [
      { name: 'donor_name', label: 'Full Name', required: true, help: 'Maximum 100 characters' },
      { name: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS, required: true },
      { name: 'age', label: 'Age', type: 'number', min: DONOR_MIN_AGE, max: DONOR_MAX_AGE, help: `Between ${DONOR_MIN_AGE} and ${DONOR_MAX_AGE}` },
      { name: 'gender', label: 'Gender', type: 'select', options: GENDERS },
      { name: 'phone', label: 'Phone Number', type: 'tel', help: '7 to 15 digits' },
      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'city', label: 'City' }
    ],
    onSubmit: async (data) => {
      if (isEdit) {
        await donorsService.update(existing.donor_id, data);
        notify.success('Donor updated successfully');
      } else {
        const res = await donorsService.create(data);
        notify.success('Donor registered successfully');
        if (res.data?.donor_id) {
          navigate(`/donors/${res.data.donor_id}`);
        }
      }
    }
  });
}

async function renderDonorDetail(donorId) {
  const container = h('div', { className: 'donor-detail-view' });

  // Back button & header
  const backBtn = h('button', {
    className: 'btn btn--ghost btn--sm',
    style: { marginBottom: 'var(--space-4)' },
    onClick: () => navigate('/donors')
  }, '← Back to Donors');
  container.appendChild(backBtn);

  const mount = h('div', {});
  container.appendChild(mount);

  try {
    const [donorRes, donationsRes] = await Promise.all([
      donorsService.get(donorId),
      donorsService.getDonations(donorId)
    ]);

    const donor = donorRes.data;
    const donations = donationsRes.data || [];

    const totalMl = donations.reduce((acc, d) => acc + (d.quantity_ml || 0), 0);

    const profileCard = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } },
      h('div', { className: 'card__body' },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)' } },
            h('div', { className: 'avatar avatar--lg' }, getInitials(donor.donor_name)),
            h('div', {},
              h('h1', { className: 'page-title', style: { fontSize: 'var(--text-xl)' } }, donor.donor_name),
              h('div', { style: { display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-1)' } },
                bloodGroupBadge(donor.blood_group),
                h('span', { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' } }, `${donor.age || '—'} yrs, ${donor.gender || 'Unknown'}`),
                h('span', { style: { color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' } }, `• ${donor.city || 'No city'}`)
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: 'var(--space-2)' } },
            h('button', {
              className: 'btn btn--secondary btn--sm',
              onClick: () => openDonorForm(donor)
            }, 'Edit Details'),
            h('button', {
              className: 'btn btn--primary btn--sm',
              onClick: () => navigate(`/donations?donor_id=${donor.donor_id}`)
            }, 'Record Donation')
          )
        ),
        // Stat strip
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)'
          }
        },
          h('div', {},
            h('div', { className: 'stat-card__label' }, 'Total Donations'),
            h('div', { style: { fontSize: 'var(--text-xl)', fontWeight: 'bold' } }, String(donations.length))
          ),
          h('div', {},
            h('div', { className: 'stat-card__label' }, 'Total Volume Given'),
            h('div', { style: { fontSize: 'var(--text-xl)', fontWeight: 'bold' } }, formatQuantityMl(totalMl))
          ),
          h('div', {},
            h('div', { className: 'stat-card__label' }, 'Last Donation'),
            h('div', { style: { fontSize: 'var(--text-xl)', fontWeight: 'bold' } }, donor.last_donation_date ? formatDate(donor.last_donation_date) : 'Never')
          ),
          h('div', {},
            h('div', { className: 'stat-card__label' }, 'Phone / Email'),
            h('div', { style: { fontSize: 'var(--text-sm)' } }, donor.phone || 'No phone'),
            h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, donor.email || 'No email')
          )
        )
      )
    );
    mount.appendChild(profileCard);

    // Donation History Table
    const historyCard = h('div', { className: 'card' },
      h('div', { className: 'card__header' },
        h('h2', { className: 'card__title' }, 'Donation History')
      ),
      h('div', { className: 'card__body', style: { padding: 0 } },
        donations.length === 0
          ? h('div', { className: 'empty-state', style: { padding: 'var(--space-6)' } },
              h('p', {}, 'No donations recorded for this donor yet.')
            )
          : h('table', { className: 'data-table' },
              h('thead', {},
                h('tr', {},
                  h('th', {}, 'Donation ID'),
                  h('th', {}, 'Date'),
                  h('th', {}, 'Quantity'),
                  h('th', {}, 'Blood Bank'),
                  h('th', {}, 'Status')
                )
              ),
              h('tbody', {},
                ...donations.map(d => h('tr', {},
                  h('td', {}, `#${d.donation_id}`),
                  h('td', {}, formatDate(d.donation_date)),
                  h('td', {}, formatQuantityMl(d.quantity_ml)),
                  h('td', {}, d.bank_name || `Bank #${d.bank_id}`),
                  h('td', {}, h('span', { className: 'badge badge--success' }, d.donation_status || 'Accepted'))
                ))
              )
            )
      )
    );
    mount.appendChild(historyCard);

  } catch (err) {
    mount.replaceChildren(h('div', { className: 'empty-state' },
      h('h2', { className: 'empty-state__title' }, 'Donor Not Found'),
      h('p', { className: 'empty-state__description' }, err.message || 'Unable to retrieve donor record.'),
      h('button', { className: 'btn btn--primary', onClick: () => navigate('/donors') }, 'Back to Donors')
    ));
  }

  return container;
}
