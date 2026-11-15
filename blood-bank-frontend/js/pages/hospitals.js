import { createCrudPage } from './crudPage.js';
import hospitalsService from '../services/hospitals.js';
import { h } from '../core/dom.js';
import { requestStatusBadge } from '../ui/badge.js';

export default createCrudPage({
  entityName: 'Hospital',
  singularTitle: 'Hospital',
  pluralTitle: 'Hospitals',
  routePath: 'hospitals',
  idKey: 'hospital_id',
  titleKey: 'hospital_name',
  service: hospitalsService,
  columns: [
    { key: 'hospital_name', label: 'Hospital Name' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Contact Phone' },
    { key: 'email', label: 'Email' }
  ],
  filters: [{ key: 'city', label: 'City', type: 'text' }],
  formFields: [
    { name: 'hospital_name', label: 'Hospital Name', required: true },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'city', label: 'City', required: true },
    { name: 'contact_number', label: 'Contact Phone', type: 'tel' },
    { name: 'email', label: 'Email', type: 'email' }
  ],
  detailFields: [
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Phone' },
    { key: 'email', label: 'Email' }
  ],
  detailTabs: [
    {
      key: 'requests',
      label: 'Hospital Requests',
      render: async (id) => {
        const res = await hospitalsService.getRequests(id);
        const reqs = res.data || [];
        if (reqs.length === 0) return h('div', { style: { padding: 'var(--space-6)', textAlign: 'center' } }, 'No requests raised by this hospital.');
        return h('table', { className: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Req #'), h('th', {}, 'Patient'), h('th', {}, 'Group'), h('th', {}, 'Units Req'), h('th', {}, 'Status'))),
          h('tbody', {}, ...reqs.map(r => h('tr', {}, h('td', {}, `#${r.request_id}`), h('td', {}, r.patient_name || `Patient #${r.patient_id}`), h('td', {}, r.blood_group), h('td', {}, String(r.units_required)), h('td', {}, requestStatusBadge(r.request_status)))))
        );
      }
    }
  ]
});
