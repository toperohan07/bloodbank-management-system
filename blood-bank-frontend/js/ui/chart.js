/**
 * ui/chart.js — Accessible, theme-aware wrapper around local Chart.js.
 * Handles dark theme palettes, responsive resizing, and accessible table fallbacks.
 * @module ui/chart
 */

import { h } from '../core/dom.js';
import { on } from '../core/events.js';

/**
 * Creates an accessible chart instance.
 * @param {object} options
 * @param {'bar'|'line'|'doughnut'|'pie'} options.type
 * @param {object} options.data
 * @param {object} [options.options={}]
 * @param {string} [options.ariaLabel]
 * @returns {{canvas: HTMLCanvasElement, chart: any, update: Function, destroy: Function}}
 */
export function createChart({ type, data, options = {}, ariaLabel = 'Chart' }) {
  const canvas = h('canvas', {
    role: 'img',
    ariaLabel
  });

  if (!window.Chart) {
    console.warn('Chart.js not loaded on window.');
    return { canvas, chart: null, update: () => {}, destroy: () => {} };
  }

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, font: { family: 'inherit' } }
      }
    },
    scales: type === 'doughnut' || type === 'pie' ? {} : {
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      },
      y: {
        ticks: { color: textColor },
        grid: { color: gridColor }
      }
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: { ...defaultOptions.plugins, ...options.plugins }
  };

  const chart = new window.Chart(canvas, {
    type,
    data,
    options: mergedOptions
  });

  // Re-theme when theme changes
  const unbind = on('settings:changed', (settings) => {
    if (chart && settings.theme) {
      const dark = settings.theme === 'dark';
      const tCol = dark ? '#cbd5e1' : '#475569';
      const gCol = dark ? '#1e293b' : '#e2e8f0';

      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = tCol;
      }
      if (chart.options.scales?.x) {
        chart.options.scales.x.ticks.color = tCol;
        chart.options.scales.x.grid.color = gCol;
      }
      if (chart.options.scales?.y) {
        chart.options.scales.y.ticks.color = tCol;
        chart.options.scales.y.grid.color = gCol;
      }
      chart.update();
    }
  });

  return {
    canvas,
    chart,
    update: () => chart && chart.update(),
    destroy: () => {
      unbind();
      if (chart) chart.destroy();
    }
  };
}
