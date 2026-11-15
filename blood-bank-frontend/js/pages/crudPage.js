/**
 * pages/crudPage.js — Universal Master-Data CRUD View Factory.
 * Eliminates code duplication across Blood Banks, Hospitals, Patients, and Staff.
 * Generates searchable/paginated lists, create/edit forms, delete with 409 conflict explanation,
 * CSV export, and deep-linkable tabbed detail views.
 * @module pages/crudPage
 */

import { h } from '../core/dom.js';
import { dataTable } from '../ui/table.js';
import { formDialog } from '../ui/form.js';
import { confirm } from '../ui/confirm.js';
import { notify } from '../ui/toast.js';
import { navigate } from '../core/router.js';

/**
 * Creates a complete CRUD page controller from a configuration schema.
 * @param {object} config
 * @returns {(params: object, query: URLSearchParams) => Promise<HTMLElement>|HTMLElement}
 */
export function createCrudPage(config) {
  return function render(params, query) {
    if (params && params.id) {
      return renderDetail(params.id, query);
    }
    return renderList();
  };

  function renderList() {
    const container = h('div', { className: `${config.entityName.toLowerCase()}-page` });

    const createBtn = h('button', {
      className: 'btn btn--primary',
      onClick: () => openForm()
    }, `+ Add ${config.singularTitle}`);

    const header = h('div', { className: 'page-header' },
      h('div', {},
        h('h1', { className: 'page-title' }, config.pluralTitle),
        h('p', { className: 'page-subtitle' }, config.subtitle || `Manage master records for ${config.pluralTitle.toLowerCase()}.`)
      ),
      createBtn
    );
    container.appendChild(header);

    const table = dataTable({
      columns: [
        { key: config.idKey, label: 'ID' },
        ...config.columns
      ],
      fetchPage: (p, signal) => config.service.list(p, signal),
      filters: config.filters || [],
      rowActions: [
        {
          label: 'View',
          onClick: (row) => navigate(`/${config.routePath}/${row[config.idKey]}`)
        },
        {
          label: 'Edit',
          onClick: (row) => openForm(row)
        },
        {
          label: 'Delete',
          danger: true,
          onClick: async (row) => {
            const ok = await confirm({
              title: `Delete ${config.singularTitle}`,
              message: `Delete ${row[config.titleKey] || config.singularTitle}? If referenced by other records, deletion will be safely rejected.`,
              danger: true
            });
            if (ok) {
              try {
                await config.service.remove(row[config.idKey]);
                notify.success(`${config.singularTitle} deleted`);
                navigate(`/${config.routePath}`);
              } catch (err) {
                if (err.status === 409) {
                  notify.error(`Cannot delete: This ${config.singularTitle.toLowerCase()} is referenced by active operational records.`);
                } else {
                  notify.error(err.message || 'Delete operation failed');
                }
              }
            }
          }
        }
      ],
      exportName: `${config.entityName.toLowerCase()}_export`,
      onRowClick: (row) => navigate(`/${config.routePath}/${row[config.idKey]}`)
    });

    container.appendChild(table);
    return container;
  }

  function openForm(existing = null) {
    const isEdit = !!existing;

    formDialog({
      title: isEdit ? `Edit ${config.singularTitle} #${existing[config.idKey]}` : `Add New ${config.singularTitle}`,
      mode: isEdit ? 'edit' : 'create',
      initialValues: existing || {},
      fields: config.formFields,
      onSubmit: async (data) => {
        if (isEdit) {
          await config.service.update(existing[config.idKey], data);
          notify.success(`${config.singularTitle} updated`);
        } else {
          const res = await config.service.create(data);
          notify.success(`${config.singularTitle} created`);
          if (res.data && res.data[config.idKey]) {
            navigate(`/${config.routePath}/${res.data[config.idKey]}`);
            return;
          }
        }
        navigate(`/${config.routePath}`);
      }
    });
  }

  async function renderDetail(id, query) {
    const container = h('div', { className: 'crud-detail-page' });

    const backBtn = h('button', {
      className: 'btn btn--ghost btn--sm',
      style: { marginBottom: 'var(--space-4)' },
      onClick: () => navigate(`/${config.routePath}`)
    }, `← Back to ${config.pluralTitle}`);
    container.appendChild(backBtn);

    const mount = h('div', {});
    container.appendChild(mount);

    try {
      const res = await config.service.get(id);
      const record = res.data;

      // Header card
      const headerCard = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } },
        h('div', { className: 'card__header' },
          h('div', {},
            h('h1', { className: 'card__title' }, record[config.titleKey] || `${config.singularTitle} #${id}`),
            h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, `ID: #${record[config.idKey]}`)
          ),
          h('div', { style: { display: 'flex', gap: 'var(--space-2)' } },
            h('button', {
              className: 'btn btn--secondary btn--sm',
              onClick: () => openForm(record)
            }, 'Edit')
          )
        ),
        h('div', { className: 'card__body' },
          h('div', {
            style: {
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)'
            }
          },
            ...config.detailFields.map(df => h('div', {},
              h('span', { className: 'stat-card__label' }, df.label),
              h('div', { style: { fontSize: 'var(--text-base)', fontWeight: 'bold' } },
                df.render ? df.render(record[df.key], record) : (record[df.key] || '—')
              )
            ))
          )
        )
      );
      mount.appendChild(headerCard);

      // Detail Tabs if configured
      if (config.detailTabs && config.detailTabs.length > 0) {
        const activeTabKey = (query && query.get('tab')) || config.detailTabs[0].key;

        const tabsNav = h('div', { className: 'tabs' });
        config.detailTabs.forEach(t => {
          tabsNav.appendChild(h('div', {
            className: `tab ${activeTabKey === t.key ? 'active' : ''}`,
            onClick: () => navigate(`/${config.routePath}/${id}?tab=${t.key}`)
          }, t.label));
        });
        mount.appendChild(tabsNav);

        const tabBody = h('div', { className: 'card' });
        mount.appendChild(tabBody);

        const activeTabDef = config.detailTabs.find(t => t.key === activeTabKey) || config.detailTabs[0];
        if (activeTabDef && activeTabDef.render) {
          const tabContent = await activeTabDef.render(id, record);
          tabBody.replaceChildren(tabContent);
        }
      }

    } catch (err) {
      mount.replaceChildren(h('div', { className: 'empty-state' },
        h('h2', { className: 'empty-state__title' }, `${config.singularTitle} Not Found`),
        h('p', { className: 'empty-state__description' }, err.message),
        h('button', { className: 'btn btn--primary', onClick: () => navigate(`/${config.routePath}`) }, `Back to ${config.pluralTitle}`)
      ));
    }

    return container;
  }
}
