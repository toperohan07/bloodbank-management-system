import { createCrudPage } from './crudPage.js';
import bloodbanksService from '../services/bloodbanks.js';
import { h } from '../core/dom.js';

export default createCrudPage({
  entityName: 'BloodBank',
  singularTitle: 'Blood Bank',
  pluralTitle: 'Blood Banks',
  routePath: 'bloodbanks',
  idKey: 'bank_id',
  titleKey: 'bank_name',
  service: bloodbanksService,
  columns: [
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Contact Phone' },
    { key: 'email', label: 'Email' }
  ],
  filters: [{ key: 'city', label: 'City', type: 'text' }],
  formFields: [
    { name: 'bank_name', label: 'Bank Name', required: true },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'city', label: 'City', required: true },
    { name: 'contact_number', label: 'Contact Phone', type: 'tel' },
    { name: 'email', label: 'Email', type: 'email' }
  ],
  detailFields: [
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Contact Number' },
    { key: 'email', label: 'Email' }
  ],
  detailTabs: [
    {
      key: 'inventory',
      label: 'Bank Inventory',
      render: async (id) => {
        const res = await bloodbanksService.getInventory(id);
        const items = res.data || [];
        if (items.length === 0) return h('div', { style: { padding: 'var(--space-6)', textAlign: 'center' } }, 'No inventory held at this bank.');
        return h('table', { className: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Stock ID'), h('th', {}, 'Group'), h('th', {}, 'Component'), h('th', {}, 'Units'))),
          h('tbody', {}, ...items.map(i => h('tr', {}, h('td', {}, `#${i.inventory_id}`), h('td', {}, i.blood_group), h('td', {}, i.component_type), h('td', {}, String(i.units_available)))))
        );
      }
    },
    {
      key: 'staff',
      label: 'Assigned Staff',
      render: async (id) => {
        const res = await bloodbanksService.getStaff(id);
        const staff = res.data || [];
        if (staff.length === 0) return h('div', { style: { padding: 'var(--space-6)', textAlign: 'center' } }, 'No staff assigned to this bank.');
        return h('table', { className: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Staff ID'), h('th', {}, 'Name'), h('th', {}, 'Designation'), h('th', {}, 'Phone'))),
          h('tbody', {}, ...staff.map(s => h('tr', {}, h('td', {}, `#${s.staff_id}`), h('td', {}, s.staff_name), h('td', {}, s.designation), h('td', {}, s.phone || '—'))))
        );
      }
    }
  ]
});
