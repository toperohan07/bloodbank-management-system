/**
 * core/store.js — Settings persistence and state store.
 * Synchronizes user settings to localStorage with memory fallback and change subscribers.
 * @module core/store
 */

import { DEFAULT_SETTINGS } from '../config.js';
import { emit } from './events.js';

const STORAGE_KEY = 'bb-settings';
let memoryStore = { ...DEFAULT_SETTINGS };

/**
 * Reads all settings with fallback to defaults.
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return { ...memoryStore };
  }
}

/**
 * Reads a single setting value.
 * @param {string} key
 * @returns {any}
 */
export function getSetting(key) {
  const current = getSettings();
  return current[key] !== undefined ? current[key] : DEFAULT_SETTINGS[key];
}

/**
 * Updates partial settings and notifies subscribers.
 * @param {Partial<typeof DEFAULT_SETTINGS>} updates
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function updateSettings(updates) {
  const current = getSettings();
  const next = { ...current, ...updates };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    memoryStore = { ...next };
  }

  emit('settings:changed', next);
  return next;
}
