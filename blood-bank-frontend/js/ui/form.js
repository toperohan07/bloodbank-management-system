/**
 * ui/form.js — Declarative Form Builder with Partial Update Diffing & API Error Mapping.
 * Converts empty strings to null, integers to numbers, and sends ONLY changed fields on PUT.
 * @module ui/form
 */

import { openModal } from './modal.js';
import { searchableSelect } from './select.js';
import { h } from '../core/dom.js';
import { ApiError } from '../core/api.js';
import { cleanPhoneNumber } from '../core/format.js';
import { PHONE_REGEX, EMAIL_REGEX } from '../config.js';

// Maximum text lengths that mirror the database column sizes.
const MAX_LENGTH_BY_FIELD = {
  donor_name: 100, patient_name: 100, staff_name: 100, bank_name: 100, hospital_name: 100,
  email: 100, address: 200, city: 50, designation: 50, gender: 10, component_type: 30
};

/**
 * Checks every field before anything is sent to the server.
 * @returns {Record<string, string>} field name -> error message (empty when valid)
 */
function validateFields(fields, values) {
  const errors = {};
  fields.forEach(f => {
    if (f.readOnly) return;
    const val = values[f.name];
    const label = f.label.replace(/\s*\(.*\)\s*$/, '');

    if (val === null || val === undefined || val === '') {
      if (f.required) errors[f.name] = `${label} is required`;
      return;
    }
    if (f.type === 'number') {
      if (typeof val !== 'number') errors[f.name] = `${label} must be a whole number`;
      else if (f.min !== undefined && val < f.min) errors[f.name] = `${label} must be at least ${f.min}`;
      else if (f.max !== undefined && val > f.max) errors[f.name] = `${label} must be at most ${f.max}`;
      return;
    }
    if (f.type === 'tel' && !PHONE_REGEX.test(val)) {
      errors[f.name] = `${label} must be 7 to 15 digits (optional leading +)`;
    } else if (f.type === 'email' && !EMAIL_REGEX.test(val)) {
      errors[f.name] = `${label} is not a valid email address`;
    } else if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      errors[f.name] = `${label} must be a valid date`;
    } else if (typeof val === 'string') {
      const max = f.maxLength || MAX_LENGTH_BY_FIELD[f.name];
      if (max && val.length > max) errors[f.name] = `${label} must be at most ${max} characters`;
    }
    if (!errors[f.name] && f.validate) {
      const message = f.validate(val, values);
      if (message) errors[f.name] = message;
    }
  });
  return errors;
}

function isIdField(f) {
  return f.valueType === 'int' || ((f.type === 'select' || f.type === 'searchSelect') && /_id$/.test(f.name));
}

/**
 * Opens a declarative form dialog.
 * @param {object} options
 * @param {string} options.title - Dialog title
 * @param {Array<object>} options.fields - Field definitions
 * @param {object} [options.initialValues={}] - Existing data (edit mode)
 * @param {'create'|'edit'} [options.mode='create']
 * @param {Function} options.onSubmit - (formData: object) => Promise<any>
 * @returns {Promise<any>}
 */
export function formDialog({ title, fields, initialValues = {}, mode = 'create', onSubmit }) {
  return new Promise((resolve, reject) => {
    const errorAlert = h('div', { className: 'alert alert--danger', style: { display: 'none' } });
    const fieldElements = new Map();

    const form = h('form', { noValidate: true });
    form.appendChild(errorAlert);

    fields.forEach(f => {
      const group = h('div', { className: 'form-group' });
      const label = h('label', { className: 'form-label', htmlFor: f.name },
        f.label,
        f.required ? h('span', { className: 'required' }, '*') : null
      );
      group.appendChild(label);

      let input = null;
      const initialVal = initialValues[f.name] !== undefined ? initialValues[f.name] : (f.default !== undefined ? f.default : '');

      if (f.type === 'select') {
        input = h('select', { className: 'form-control', id: f.name, name: f.name, disabled: !!f.readOnly },
          h('option', { value: '' }, 'Select...'),
          ...(f.options || []).map(opt => {
            const v = typeof opt === 'object' ? opt.value : opt;
            const l = typeof opt === 'object' ? opt.label : opt;
            const el = h('option', { value: v }, l);
            if (String(initialVal) === String(v)) el.selected = true;
            return el;
          })
        );
        if (f.onChange) input.addEventListener('change', () => f.onChange(input.value));
      } else if (f.type === 'searchSelect') {
        input = searchableSelect({
          id: f.name,
          name: f.name,
          value: initialVal,
          options: f.options || [],
          loadOptions: f.loadOptions,
          onChange: f.onChange
        });
      } else if (f.type === 'textarea') {
        input = h('textarea', {
          className: 'form-control',
          id: f.name,
          name: f.name,
          readOnly: !!f.readOnly
        }, String(initialVal || ''));
      } else {
        input = h('input', {
          type: f.type || 'text',
          className: 'form-control',
          id: f.name,
          name: f.name,
          value: initialVal !== null && initialVal !== undefined ? String(initialVal) : '',
          min: f.min,
          max: f.max,
          maxLength: f.type === 'number' || f.type === 'date' ? undefined : (f.maxLength || MAX_LENGTH_BY_FIELD[f.name]),
          readOnly: !!f.readOnly
        });
      }

      group.appendChild(input);

      const fieldError = h('div', { className: 'form-error', style: { display: 'none' } });
      group.appendChild(fieldError);

      if (f.help) {
        group.appendChild(h('div', { className: 'form-help' }, f.help));
      }

      fieldElements.set(f.name, { group, input, fieldError, config: f });
      form.appendChild(group);
    });

    const cancelBtn = h('button', {
      type: 'button',
      className: 'btn btn--secondary',
      onClick: () => {
        modal.close();
        resolve(null);
      }
    }, 'Cancel');

    const submitBtn = h('button', {
      type: 'submit',
      className: 'btn btn--primary'
    }, mode === 'edit' ? 'Save Changes' : 'Create Record');

    form.appendChild(h('div', { className: 'modal__footer', style: { padding: 'var(--space-4) 0 0 0' } }, cancelBtn, submitBtn));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.style.display = 'none';

      // Clear previous field errors
      fieldElements.forEach(({ fieldError, input }) => {
        fieldError.style.display = 'none';
        input.classList.remove('is-invalid');
      });

      // Collect and normalize values
      const rawData = {};
      const fd = new FormData(form);

      fields.forEach(f => {
        let val = fd.get(f.name);
        if (typeof val === 'string') {
          val = val.trim();
          if (val === '') val = null;
        }

        if ((f.type === 'number' || isIdField(f)) && val !== null) {
          // The server wants real integers (not "5"). Keep non-integers as text so validation can reject them.
          const n = Number(val);
          if (Number.isInteger(n)) val = n;
        } else if (f.type === 'tel' && val !== null) {
          val = cleanPhoneNumber(val) || val;  // if nothing usable is left, keep the text so validation flags it
        }

        rawData[f.name] = val;
      });

      // Validate everything first so the user sees ALL problems at once, without a server round trip
      const fieldErrors = validateFields(fields, rawData);
      const failing = Object.keys(fieldErrors);
      if (failing.length > 0) {
        failing.forEach(name => {
          const item = fieldElements.get(name);
          item.fieldError.textContent = fieldErrors[name];
          item.fieldError.style.display = 'block';
          item.input.classList.add('is-invalid');
        });
        const first = fieldElements.get(failing[0]).input;
        const focusable = first.querySelector ? (first.querySelector('input,select,textarea') || first) : first;
        focusable.focus();
        return;
      }

      // If Edit Mode: Send ONLY changed fields (diff against initialValues)
      let payload = rawData;
      if (mode === 'edit') {
        payload = {};
        for (const [k, v] of Object.entries(rawData)) {
          const orig = initialValues[k] !== undefined ? initialValues[k] : null;
          if (String(v ?? '') !== String(orig ?? '')) {
            payload[k] = v;
          }
        }

        if (Object.keys(payload).length === 0) {
          modal.close();
          resolve(initialValues);
          return;
        }
      }

      // Submit state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      try {
        const result = await onSubmit(payload);
        modal.close();
        resolve(result);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'edit' ? 'Save Changes' : 'Create Record';

        if (err instanceof ApiError) {
          if (err.field && fieldElements.has(err.field)) {
            const fItem = fieldElements.get(err.field);
            fItem.fieldError.textContent = err.message;
            fItem.fieldError.style.display = 'block';
            fItem.input.classList.add('is-invalid');
            fItem.input.focus();
          } else {
            errorAlert.textContent = err.message;
            errorAlert.style.display = 'block';
          }
        } else {
          errorAlert.textContent = err.message || 'Operation failed';
          errorAlert.style.display = 'block';
        }
      }
    });

    const modal = openModal({
      title,
      content: form,
      closeOnEscape: true
    });
  });
}
