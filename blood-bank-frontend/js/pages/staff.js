import { createCrudPage } from './crudPage.js';
import staffService from '../services/staff.js';
import lookupsService from '../services/lookups.js';
import { h } from '../core/dom.js';
import { formatDate } from '../core/format.js';

export default createCrudPage({
  entityName: 'Staff',
  singularTitle: 'Staff Member',
  pluralTitle: 'Staff Directory',
  routePath: 'staff',
  idKey: 'staff_id',
  titleKey: 'staff_name',
  service: staffService,
  columns: [
    { key: 'staff_name', label: 'Staff Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'bank_name', label: 'Blood Bank', render: (b) => b || 'Unassigned' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' }
  ],
  filters: [
    { key: 'designation', label: 'Designation', type: 'text' }
  ],
  formFields: [
    { name: 'staff_name', label: 'Full Name', required: true },
    { name: 'designation', label: 'Designation', required: true },
    {
      name: 'bank_id',
      label: 'Assigned Blood Bank',
      type: 'searchSelect',
      loadOptions: async (query) => {
        const banks = await lookupsService.getBloodBanks();
        return banks.map(b => ({ value: b.bank_id, label: b.bank_name, subtitle: b.city }));
      }
    },
    { name: 'phone', label: 'Phone Number', type: 'tel' },
    { name: 'email', label: 'Email Address', type: 'email' }
  ],
  detailFields: [
    { key: 'designation', label: 'Designation' },
    { key: 'bank_name', label: 'Blood Bank', render: (b) => b || 'Unassigned' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' }
  ],
  detailTabs: [
    {
      key: 'donations',
      label: 'Donations Handled',
      render: async (id) => {
        const res = await staffService.getDonations(id);
        const donations = res.data || [];
        if (donations.length === 0) return h('div', { style: { padding: 'var(--space-6)', textAlign: 'center' } }, 'No donations handled by this staff member.');
        return h('table', { className: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Donation #'), h('th', {}, 'Date'), h('th', {}, 'Quantity'), h('th', {}, 'Status'))),
          h('tbody', {}, ...donations.map(d => h('tr', {}, h('td', {}, `#${d.donation_id}`), h('td', {}, formatDate(d.donation_date)), h('td', {}, `${d.quantity_ml}ml`), h('td', {}, d.donation_status || 'Accepted'))))
        );
      }
    }
  ]
});
