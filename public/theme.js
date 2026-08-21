(function () {
  'use strict';

  const STORAGE_KEY = 'oraclerpg.theme';
  const THEMES = Object.freeze(['oracle', 'fantasy', 'horror', 'cyberpunk']);
  const META_COLORS = Object.freeze({
    oracle: '#0b090c',
    fantasy: '#17100a',
    horror: '#07100d',
    cyberpunk: '#070b0e'
  });

  function ensureRefinementStyles() {
    if (document.querySelector('link[data-oracle-theme-refinements]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/theme-refinements.css';
    link.dataset.oracleThemeRefinements = 'true';
    document.head.appendChild(link);
  }

  function normalizeTheme(value) {
    return THEMES.includes(value) ? value : 'oracle';
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return 'oracle';
    }
  }

  function writeStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // The theme still applies for the current page when storage is unavailable.
    }
  }

  function syncThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META_COLORS[theme] || META_COLORS.oracle);
  }

  function syncThemeButtons(theme) {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      const active = button.dataset.themeOption === theme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function applyTheme(value, options) {
    const theme = normalizeTheme(value);
    const persist = !options || options.persist !== false;

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = 'dark';
    syncThemeColor(theme);
    syncThemeButtons(theme);

    if (persist) writeStoredTheme(theme);

    window.dispatchEvent(new CustomEvent('oraclerpg:themechange', {
      detail: { theme }
    }));

    return theme;
  }

  function bindThemeButtons() {
    document.querySelectorAll('[data-theme-option]').forEach((button) => {
      button.addEventListener('click', () => applyTheme(button.dataset.themeOption));
    });
  }

  ensureRefinementStyles();
  const initialTheme = readStoredTheme();
  document.documentElement.dataset.theme = initialTheme;

  window.OracleTheme = Object.freeze({
    get: () => normalizeTheme(document.documentElement.dataset.theme),
    set: (theme) => applyTheme(theme),
    themes: THEMES
  });

  const ready = () => {
    const currentTheme = normalizeTheme(document.documentElement.dataset.theme);
    syncThemeColor(currentTheme);
    syncThemeButtons(currentTheme);
    bindThemeButtons();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(event.newValue, { persist: false });
    }
  });
})();