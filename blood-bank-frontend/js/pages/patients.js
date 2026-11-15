import { createCrudPage } from './crudPage.js';
import patientsService from '../services/patients.js';
import { bloodGroupBadge, requestStatusBadge } from '../ui/badge.js';
import { api } from '../core/api.js';
import { h } from '../core/dom.js';
import { BLOOD_GROUPS, GENDERS } from '../config.js';

export default createCrudPage({
  entityName: 'Patient',
  singularTitle: 'Patient',
  pluralTitle: 'Patients',
  routePath: 'patients',
  idKey: 'patient_id',
  titleKey: 'patient_name',
  service: patientsService,
  columns: [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'blood_group', label: 'Group', render: (g) => bloodGroupBadge(g) },
    { key: 'age', label: 'Age', render: (a) => a !== null ? `${a} yrs` : '—' },
    { key: 'gender', label: 'Gender' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Contact Phone' }
  ],
  filters: [
    { key: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS },
    { key: 'city', label: 'City', type: 'text' }
  ],
  formFields: [
    { name: 'patient_name', label: 'Full Name', required: true },
    { name: 'blood_group', label: 'Blood Group', type: 'select', options: BLOOD_GROUPS, required: true },
    { name: 'age', label: 'Age', type: 'number', min: 0, max: 120 },
    { name: 'gender', label: 'Gender', type: 'select', options: GENDERS },
    { name: 'city', label: 'City' },
    { name: 'contact_number', label: 'Contact Phone', type: 'tel' }
  ],
  detailFields: [
    { key: 'blood_group', label: 'Blood Group', render: (g) => bloodGroupBadge(g) },
    { key: 'age', label: 'Age', render: (a) => `${a} yrs` },
    { key: 'gender', label: 'Gender' },
    { key: 'city', label: 'City' },
    { key: 'contact_number', label: 'Contact Phone' }
  ],
  detailTabs: [
    {
      key: 'requests',
      label: 'Patient Requests',
      render: async (id) => {
        // API has no direct patient_id filter on /requests endpoint; fetching first page and filtering client-side
        const res = await api('/requests', { query: { limit: 200 } });
        const reqs = (res.data || []).filter(r => String(r.patient_id) === String(id));
        if (reqs.length === 0) return h('div', { style: { padding: 'var(--space-6)', textAlign: 'center' } }, 'No requests associated with this patient.');
        return h('table', { className: 'data-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Req #'), h('th', {}, 'Hospital'), h('th', {}, 'Units'), h('th', {}, 'Status'))),
          h('tbody', {}, ...reqs.map(r => h('tr', {}, h('td', {}, `#${r.request_id}`), h('td', {}, r.hospital_name || 'Hospital'), h('td', {}, String(r.units_required)), h('td', {}, requestStatusBadge(r.request_status)))))
        );
      }
    }
  ]
});
