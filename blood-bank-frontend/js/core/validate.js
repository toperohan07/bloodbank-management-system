/**
 * core/validate.js — Validation rules mirroring backend constraints.
 * Provides clear English error messages before making network requests.
 * @module core/validate
 */

import { PHONE_REGEX, EMAIL_REGEX, DONOR_MIN_AGE, DONOR_MAX_AGE, PATIENT_MIN_AGE, PATIENT_MAX_AGE, BLOOD_GROUPS } from '../config.js';
import { cleanPhoneNumber } from './format.js';

/**
 * Validates donor attributes.
 * @param {object} donor
 * @returns {{isValid: boolean, errors: Record<string, string>}}
 */
export function validateDonor(donor) {
  const errors = {};

  if (!donor.donor_name || !donor.donor_name.trim()) {
    errors.donor_name = 'Donor name is required';
  } else if (donor.donor_name.trim().length > 100) {
    errors.donor_name = 'Donor name must be at most 100 characters';
  }

  if (donor.age !== undefined && donor.age !== null && donor.age !== '') {
    const age = Number(donor.age);
    if (!Number.isInteger(age) || age < DONOR_MIN_AGE || age > DONOR_MAX_AGE) {
      errors.age = `Age must be between ${DONOR_MIN_AGE} and ${DONOR_MAX_AGE}`;
    }
  }

  if (!donor.blood_group) {
    errors.blood_group = 'Blood group is required';
  } else if (!BLOOD_GROUPS.includes(donor.blood_group)) {
    errors.blood_group = 'Invalid blood group';
  }

  if (donor.phone) {
    const cleaned = cleanPhoneNumber(donor.phone);
    if (!PHONE_REGEX.test(cleaned)) {
      errors.phone = 'Phone must be 7 to 15 digits (optional leading +)';
    }
  }

  if (donor.email && !EMAIL_REGEX.test(donor.email.trim())) {
    errors.email = 'Invalid email address format';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates blood request fields.
 * @param {object} req
 * @returns {{isValid: boolean, errors: Record<string, string>}}
 */
export function validateRequest(req) {
  const errors = {};

  if (!req.patient_id) errors.patient_id = 'Patient is required';
  if (!req.hospital_id) errors.hospital_id = 'Hospital is required';
  if (!req.blood_group) errors.blood_group = 'Blood group is required';

  const units = Number(req.units_required);
  if (!Number.isInteger(units) || units < 1) {
    errors.units_required = 'Units required must be at least 1';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
