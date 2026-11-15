/**
 * core/events.js — Pub/sub event bus for decoupled cross-module communication.
 * @module core/events
 */

const listeners = new Map();

/**
 * Subscribes to an event channel.
 * @param {string} event - Event name (e.g. 'data:changed:donors')
 * @param {Function} handler - Event callback function
 * @returns {Function} Unsubscribe function
 */
export function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

/**
 * Unsubscribes from an event channel.
 * @param {string} event - Event name
 * @param {Function} handler - Registered callback
 */
export function off(event, handler) {
  if (listeners.has(event)) {
    listeners.get(event).delete(handler);
  }
}

/**
 * Publishes an event to all subscribers.
 * @param {string} event - Event name
 * @param {any} [data] - Event payload
 */
export function emit(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    });
  }
}
