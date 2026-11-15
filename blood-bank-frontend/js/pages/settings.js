/**
 * pages/settings.js — Simple settings page: API Base URL (with Test connection) and Theme mode.
 * @module pages/settings
 */

import { h } from '../core/dom.js';
import { getSettings, updateSettings } from '../core/store.js';
import { DEFAULT_SETTINGS, PROJECT_INFO } from '../config.js';
import { api } from '../core/api.js';
import { notify } from '../ui/toast.js';

export default function renderSettings() {
  const container = h('div', { className: 'settings-page' });
  const settings = getSettings();

  const header = h('div', { className: 'page-header' },
    h('div', {},
      h('h1', { className: 'page-title' }, 'Settings'),
      h('p', { className: 'page-subtitle' }, 'Configure API connection and display theme.')
    )
  );
  container.appendChild(header);

  // 1. API Connection Section
  const apiUrlInput = h('input', {
    id: 'setting-api-url',
    type: 'text',
    className: 'form-control',
    value: settings.apiBaseUrl,
    style: { maxWidth: '420px' }
  });

  const testBtn = h('button', {
    className: 'btn btn--secondary btn--sm',
    onClick: async () => {
      const url = apiUrlInput.value.trim();
      updateSettings({ apiBaseUrl: url });

      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
      const startTime = performance.now();

      try {
        const res = await api('/health');
        const latency = Math.round(performance.now() - startTime);
        notify.success(`Connected! Latency: ${latency}ms (Status: ${res.data?.status || 'OK'})`);
      } catch (err) {
        notify.error(`Cannot connect to ${url}: ${err.message}`);
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = '⚡ Test Connection';
      }
    }
  }, '⚡ Test Connection');

  const resetBtn = h('button', {
    className: 'btn btn--ghost btn--sm',
    onClick: () => {
      apiUrlInput.value = DEFAULT_SETTINGS.apiBaseUrl;
      updateSettings({ apiBaseUrl: DEFAULT_SETTINGS.apiBaseUrl });
      notify.info('API URL reset to default');
    }
  }, 'Reset to Default');

  const connSection = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } },
    h('div', { className: 'card__header' }, h('h2', { className: 'card__title' }, 'Backend API Connection')),
    h('div', { className: 'card__body' },
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label', htmlFor: 'setting-api-url' }, 'API Base URL'),
        apiUrlInput,
        h('div', { className: 'form-help' }, 'Default: http://127.0.0.1:5000/api')
      ),
      h('div', { style: { display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', alignItems: 'center' } },
        testBtn,
        resetBtn
      )
    )
  );
  container.appendChild(connSection);

  // 2. Appearance Section (Theme Only)
  const themeSelect = h('select', {
    className: 'form-control',
    style: { maxWidth: '240px' },
    onChange: (e) => {
      document.documentElement.setAttribute('data-theme', e.target.value);
      updateSettings({ theme: e.target.value });
    }
  },
    h('option', { value: 'light', selected: settings.theme === 'light' }, 'Light Theme'),
    h('option', { value: 'dark', selected: settings.theme === 'dark' }, 'Dark Theme')
  );

  const themeSection = h('div', { className: 'card', style: { marginBottom: 'var(--space-6)' } },
    h('div', { className: 'card__header' }, h('h2', { className: 'card__title' }, 'Appearance')),
    h('div', { className: 'card__body' },
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label' }, 'Color Theme'),
        themeSelect,
        h('div', { className: 'form-help' }, 'Choose between clean light mode or high-contrast dark mode.')
      )
    )
  );
  container.appendChild(themeSection);

  // 3. System Info
  const infoSection = h('div', { className: 'card' },
    h('div', { className: 'card__header' }, h('h2', { className: 'card__title' }, 'About System')),
    h('div', { className: 'card__body' },
      h('p', { style: { fontSize: 'var(--text-sm)' } },
        h('strong', {}, PROJECT_INFO.name),
        ` — Version ${PROJECT_INFO.version}`
      )
    )
  );
  container.appendChild(infoSection);

  return container;
}
