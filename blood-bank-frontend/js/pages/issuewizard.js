/**
 * pages/issuewizard.js — 3-Step Guided Blood Issue Wizard with FEFO Sorting & Slip Printing.
 * Enforces strict transactional safety: request not closed, test is Safe, unexpired, exact blood group match.
 * @module pages/issuewizard
 */

import { h } from '../core/dom.js';
import { api } from '../core/api.js';
import { notify } from '../ui/toast.js';
import { bloodGroupBadge, urgencyBadge } from '../ui/badge.js';
import { formatDate, pluralize } from '../core/format.js';
import requestsService from '../services/requests.js';
import lookupsService from '../services/lookups.js';
import issuesService from '../services/issues.js';
import { navigate } from '../core/router.js';

export default function renderIssueWizard(params, query) {
  const container = h('div', { className: 'issue-wizard-page' });

  // Wizard state
  let currentStep = 1;
  const state = {
    request: null,
    stock: null,
    unitsToIssue: 1,
    staffId: null,
    issueDate: new Date().toISOString().slice(0, 10),
    result: null
  };

  const prefillRequestId = query ? query.get('request') : null;

  // Stepper Header
  const stepper = h('div', { className: 'wizard-stepper' },
    renderStepIndicator(1, 'Select Request', currentStep),
    renderStepIndicator(2, 'Select Stock (FEFO)', currentStep),
    renderStepIndicator(3, 'Verify & Issue', currentStep)
  );
  container.appendChild(stepper);

  const stepMount = h('div', { className: 'card', style: { padding: 'var(--space-6)', minHeight: '360px' } });
  container.appendChild(stepMount);

  function updateStepper() {
    stepper.replaceChildren(
      renderStepIndicator(1, 'Select Request', currentStep),
      renderStepIndicator(2, 'Select Stock (FEFO)', currentStep),
      renderStepIndicator(3, 'Verify & Issue', currentStep)
    );
  }

  function renderStepIndicator(stepNum, label, activeStep) {
    const isCompleted = stepNum < activeStep;
    const isActive = stepNum === activeStep;

    let cls = 'wizard-step';
    if (isActive) cls += ' active';
    if (isCompleted) cls += ' completed';

    return h('div', { className: cls },
      h('div', { className: 'wizard-step__circle' }, isCompleted ? '✓' : String(stepNum)),
      h('span', { className: 'wizard-step__label' }, label)
    );
  }

  // --- Step 1: Select Request ---
  async function renderStep1() {
    stepMount.replaceChildren(h('div', { style: { textAlign: 'center', padding: 'var(--space-6)' } }, 'Loading eligible requests...'));

    try {
      const res = await requestsService.list({ limit: 100 });
      const allRequests = res.data || [];

      // Filter to open requests (Pending or Approved with remaining units > 0)
      const openRequests = allRequests.filter(r => {
        const remaining = r.units_required - (r.units_issued || 0);
        const isOpenStatus = r.request_status === 'Pending' || r.request_status === 'Approved';
        return isOpenStatus && remaining > 0;
      });

      // Auto-select if prefilled
      if (prefillRequestId && !state.request) {
        const found = allRequests.find(r => String(r.request_id) === String(prefillRequestId));
        if (found) {
          const rem = found.units_required - (found.units_issued || 0);
          if (rem > 0 && (found.request_status === 'Pending' || found.request_status === 'Approved')) {
            state.request = found;
            currentStep = 2;
            updateStepper();
            renderStep2();
            return;
          }
        }
      }

      stepMount.replaceChildren();
      stepMount.appendChild(h('h2', { style: { fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' } }, 'Step 1: Choose Blood Request to Fulfill'));
      stepMount.appendChild(h('p', { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' } },
        'Displaying active hospital requests requiring matching donor units.'
      ));

      if (openRequests.length === 0) {
        stepMount.appendChild(h('div', { className: 'empty-state' },
          h('h3', { className: 'empty-state__title' }, 'No Open Requests Awaiting Issue'),
          h('p', { className: 'empty-state__description' }, 'All existing requests are either fulfilled, closed, or seed-locked.'),
          h('button', { className: 'btn btn--primary', onClick: () => navigate('/requests') }, 'Raise a New Request')
        ));
        return;
      }

      const listEl = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' } });
      openRequests.forEach(req => {
        const remaining = req.units_required - (req.units_issued || 0);
        const isSelected = state.request && state.request.request_id === req.request_id;

        const card = h('div', {
          className: 'card',
          style: {
            padding: 'var(--space-4)',
            cursor: 'pointer',
            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)'
          },
          onClick: () => {
            state.request = req;
            currentStep = 2;
            updateStepper();
            renderStep2();
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' } },
            bloodGroupBadge(req.blood_group),
            h('div', {},
              h('div', { style: { fontWeight: 'bold' } }, req.patient_name || `Patient #${req.patient_id}`),
              h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, `${req.hospital_name || 'Hospital'} • Requested: ${formatDate(req.request_date)}`)
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)' } },
            urgencyBadge(req.urgency),
            h('div', { style: { textAlign: 'right' } },
              h('div', { style: { fontWeight: 'bold', fontSize: 'var(--text-base)' } }, `${remaining} unit(s) needed`),
              h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' } }, `(${req.units_issued || 0} already fulfilled)`)
            ),
            h('button', { className: 'btn btn--primary btn--sm' }, 'Select →')
          )
        );
        listEl.appendChild(card);
      });

      stepMount.appendChild(listEl);
    } catch (err) {
      stepMount.replaceChildren(h('div', { className: 'empty-state' },
        h('h3', {}, 'Failed to load requests'),
        h('p', {}, err.message)
      ));
    }
  }

  // --- Step 2: Select Stock (FEFO) ---
  async function renderStep2() {
    stepMount.replaceChildren(h('div', { style: { textAlign: 'center', padding: 'var(--space-6)' } }, 'Screening inventory for matching, safe, unexpired units...'));

    try {
      const bloodGroup = state.request.blood_group;
      const res = await api('/inventory', {
        query: {
          blood_group: bloodGroup,
          limit: 200
        }
      });

      const allStock = res.data || [];

      // Strict issuance qualification:
      // 1. Not expired: expiry_status in ('valid', 'expiring_soon')
      // 2. Test status is Safe
      // 3. units_available > 0
      const issuable = allStock.filter(item => {
        const notExpired = item.expiry_status === 'valid' || item.expiry_status === 'expiring_soon';
        const isSafe = item.test_status === 'Safe';
        const hasStock = item.units_available > 0;
        return notExpired && isSafe && hasStock;
      });

      // Sort soonest expiry first (FEFO)
      issuable.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

      stepMount.replaceChildren();
      stepMount.appendChild(h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' } },
        h('div', {},
          h('h2', { style: { fontSize: 'var(--text-xl)' } }, `Step 2: Choose Stock for ${bloodGroup} Patient`),
          h('p', { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' } },
            'Units are sorted FEFO (First-Expiring-First-Out) to optimize transfusion shelf life.'
          )
        ),
        h('button', {
          className: 'btn btn--secondary btn--sm',
          onClick: () => {
            currentStep = 1;
            updateStepper();
            renderStep1();
          }
        }, '← Change Request')
      ));

      if (issuable.length === 0) {
        stepMount.appendChild(h('div', { className: 'card', style: { padding: 'var(--space-6)', textAlign: 'center' } },
          h('h3', { style: { color: 'var(--color-danger)', marginBottom: 'var(--space-2)' } }, `No Qualified ${bloodGroup} Units Available`),
          h('p', { style: { fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' } },
            allStock.length > 0
              ? `Note: ${allStock.length} total ${bloodGroup} unit(s) exist in inventory, but none are currently both tested "Safe" and unexpired.`
              : `No units of blood group ${bloodGroup} currently exist in inventory.`
          ),
          h('button', {
            className: 'btn btn--secondary',
            onClick: () => {
              currentStep = 1;
              updateStepper();
              renderStep1();
            }
          }, '← Choose a Different Request')
        ));
        return;
      }

      const listEl = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' } });
      issuable.forEach((stk, idx) => {
        const isSelected = state.stock && state.stock.inventory_id === stk.inventory_id;
        const remainingForReq = state.request.units_required - (state.request.units_issued || 0);

        const card = h('div', {
          className: 'card',
          style: {
            padding: 'var(--space-4)',
            cursor: 'pointer',
            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)'
          },
          onClick: () => {
            state.stock = stk;
            state.unitsToIssue = Math.min(stk.units_available, remainingForReq);
            currentStep = 3;
            updateStepper();
            renderStep3();
          }
        },
          h('div', {},
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' } },
              h('span', { style: { fontWeight: 'bold' } }, `Inventory #${stk.inventory_id}`),
              h('span', { className: 'badge badge--success' }, 'Lab Verified Safe'),
              idx === 0 ? h('span', { className: 'badge badge--info' }, 'Recommended: Earliest Expiry') : null
            ),
            h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' } },
              `${stk.bank_name || 'Bank'} • Component: ${stk.component_type || 'Whole Blood'} • Collected: ${formatDate(stk.collection_date)}`
            )
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-4)' } },
            h('div', { style: { textAlign: 'right' } },
              h('div', { style: { fontWeight: 'bold' } }, `${stk.units_available} unit(s) available`),
              h('div', { style: { fontSize: 'var(--text-xs)', color: stk.expiry_status === 'expiring_soon' ? 'var(--color-warning)' : 'var(--color-success)' } },
                `Expires: ${formatDate(stk.expiry_date)}`
              )
            ),
            h('button', { className: 'btn btn--primary btn--sm' }, 'Select Stock →')
          )
        );
        listEl.appendChild(card);
      });

      stepMount.appendChild(listEl);
    } catch (err) {
      stepMount.replaceChildren(h('div', { className: 'empty-state' },
        h('h3', {}, 'Failed to screen stock'),
        h('p', {}, err.message)
      ));
    }
  }

  // --- Step 3: Verify & Issue ---
  async function renderStep3() {
    stepMount.replaceChildren(h('div', { style: { textAlign: 'center', padding: 'var(--space-6)' } }, 'Loading issuing staff...'));

    const staffList = await lookupsService.getStaff();
    const staffOptions = staffList.map(s => ({ value: s.staff_id, label: `${s.staff_name} (${s.designation || 'Staff'})` }));

    // Default to first staff member
    if (!state.staffId && staffOptions.length > 0) {
      state.staffId = staffOptions[0].value;
    }

    const remainingForReq = state.request.units_required - (state.request.units_issued || 0);
    const maxIssuable = Math.min(state.stock.units_available, remainingForReq);

    stepMount.replaceChildren();
    stepMount.appendChild(h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' } },
      h('h2', { style: { fontSize: 'var(--text-xl)' } }, 'Step 3: Verification & Authorization'),
      h('button', {
        className: 'btn btn--secondary btn--sm',
        onClick: () => {
          currentStep = 2;
          updateStepper();
          renderStep2();
        }
      }, '← Change Stock')
    ));

    // Summary Card
    const reviewCard = h('div', {
      className: 'card',
      style: {
        backgroundColor: 'var(--color-bg-secondary)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)'
      }
    },
      h('div', {},
        h('span', { className: 'stat-card__label' }, 'Recipient Patient'),
        h('div', { style: { fontWeight: 'bold' } }, state.request.patient_name),
        h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, state.request.hospital_name)
      ),
      h('div', {},
        h('span', { className: 'stat-card__label' }, 'Blood Group Compatibility'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' } },
          bloodGroupBadge(state.request.blood_group),
          h('span', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'bold' } }, '✓ Exact Match')
        )
      ),
      h('div', {},
        h('span', { className: 'stat-card__label' }, 'Stock Source'),
        h('div', { style: { fontWeight: 'bold' } }, `Inventory #${state.stock.inventory_id}`),
        h('div', { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' } }, state.stock.bank_name)
      ),
      h('div', {},
        h('span', { className: 'stat-card__label' }, 'Expiration Status'),
        h('div', { style: { fontWeight: 'bold' } }, formatDate(state.stock.expiry_date)),
        h('span', { className: 'badge badge--success' }, 'Valid & Non-Expired')
      )
    );
    stepMount.appendChild(reviewCard);

    // Form controls: Quantity and Staff
    const unitsInput = h('input', {
      type: 'number',
      className: 'form-control',
      value: String(state.unitsToIssue),
      min: '1',
      max: String(maxIssuable),
      style: { maxWidth: '160px' }
    });

    const staffSelect = h('select', { className: 'form-control' },
      ...staffOptions.map(s => {
        const opt = h('option', { value: s.value }, s.label);
        if (s.value === state.staffId) opt.selected = true;
        return opt;
      })
    );

    const formRow = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' } },
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label' }, 'Units to Issue (Max: ' + maxIssuable + ')'),
        unitsInput
      ),
      h('div', { className: 'form-group' },
        h('label', { className: 'form-label' }, 'Authorizing Staff'),
        staffSelect
      )
    );
    stepMount.appendChild(formRow);

    // Submission button
    const confirmBtn = h('button', {
      className: 'btn btn--primary btn--lg',
      onClick: async () => {
        const qty = parseInt(unitsInput.value, 10);
        if (isNaN(qty) || qty < 1 || qty > maxIssuable) {
          notify.error(`Please enter a quantity between 1 and ${maxIssuable}`);
          return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Transacting in database...';

        try {
          const res = await issuesService.create({
            request_id: state.request.request_id,
            inventory_id: state.stock.inventory_id,
            staff_id: parseInt(staffSelect.value, 10),
            units_issued: qty,
            issue_date: state.issueDate
          });

          state.result = res.data;
          renderSuccessScreen();
        } catch (err) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Authorize & Issue Blood';
          notify.error(err.message || 'Transaction conflict or failure');
        }
      }
    }, 'Authorize & Issue Blood');

    stepMount.appendChild(confirmBtn);
  }

  // --- Success Screen & Slip Print ---
  function renderSuccessScreen() {
    stepMount.replaceChildren();

    const slip = h('div', { className: 'issue-slip' },
      h('div', { className: 'issue-slip__title' }, 'BLOOD ISSUE & TRANSFUSION SLIP'),
      h('div', { className: 'issue-slip__subtitle' }, 'Blood Bank & Donor Management System'),
      h('div', { className: 'issue-slip__grid' },
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Issue Ref #'),
          h('span', { className: 'issue-slip__val' }, `#${state.result?.issue_id || 'NEW'}`)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Hospital / Ward'),
          h('span', { className: 'issue-slip__val' }, state.request.hospital_name)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Recipient Patient'),
          h('span', { className: 'issue-slip__val' }, `${state.request.patient_name} (#${state.request.patient_id})`)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Blood Group'),
          h('span', { className: 'issue-slip__val' }, state.request.blood_group)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Issuing Blood Bank'),
          h('span', { className: 'issue-slip__val' }, state.stock.bank_name)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Units Issued'),
          h('span', { className: 'issue-slip__val' }, `${state.unitsToIssue} unit(s)`)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Remaining Stock'),
          h('span', { className: 'issue-slip__val' }, `${state.result?.units_remaining_in_inventory || 0} unit(s)`)
        ),
        h('div', { className: 'issue-slip__item' },
          h('span', { className: 'issue-slip__label' }, 'Fulfillment'),
          h('span', { className: 'issue-slip__val' }, state.result?.request_fulfilled ? 'FULLY FULFILLED' : 'PARTIALLY FULFILLED')
        )
      ),
      h('div', { className: 'issue-slip__signatures' },
        h('div', { className: 'issue-slip__sig-line' }, `Issued: ${formatDate(state.issueDate)}`),
        h('div', { className: 'issue-slip__sig-line' }, `Staff #${staffSelectValue()}`),
        h('div', { className: 'issue-slip__sig-line' }, 'Receiving Signature')
      ),
      h('div', { className: 'issue-slip__footer' },
        'This is a computer-generated document. No signature is required for records.'
      )
    );

    stepMount.appendChild(h('div', { style: { textAlign: 'center', marginBottom: 'var(--space-6)' } },
      h('h2', { style: { color: 'var(--color-success)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)' } }, '✓ Blood Issued Successfully!'),
      h('p', { style: { color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' } },
        'The database transaction completed with row-locking. Inventory stock decreased and request status updated.'
      )
    ));

    stepMount.appendChild(slip);

    const actionRow = h('div', { style: { display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' } },
      h('button', {
        className: 'btn btn--primary',
        onClick: () => window.print()
      }, '🖨 Print Issue Slip'),
      h('button', {
        className: 'btn btn--secondary',
        onClick: () => navigate('/requests')
      }, 'Return to Requests'),
      h('button', {
        className: 'btn btn--ghost',
        onClick: () => navigate('/issues')
      }, 'View Issue History')
    );
    stepMount.appendChild(actionRow);
  }

  function staffSelectValue() {
    return state.staffId || 'Staff';
  }

  // Start at step 1
  renderStep1();
  return container;
}
