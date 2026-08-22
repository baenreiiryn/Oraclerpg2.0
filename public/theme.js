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

  function ensureThemeFontStyles() {
    if (document.querySelector('link[data-oracle-theme-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/theme-fonts.css';
    link.dataset.oracleThemeFonts = 'true';
    document.head.appendChild(link);
  }

  function loadStyle(href, key) {
    if (document.querySelector(`link[data-oracle-enhancement="${key}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.oracleEnhancement = key;
    document.head.appendChild(link);
  }

  function loadScript(src, key) {
    const existing = document.querySelector(`script[data-oracle-enhancement="${key}"]`);
    if (existing) return existing.dataset.loaded === 'true' ? Promise.resolve() : new Promise((resolve) => existing.addEventListener('load', resolve, { once: true }));
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.dataset.oracleEnhancement = key;
      script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function loadOracleEnhancements() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const newCampaign = path.endsWith('/new-campaign.html');
    const campaign = path.endsWith('/campaign.html');
    const settings = path.endsWith('/settings.html');

    if (newCampaign) {
      loadStyle('/campaign-languages.css', 'campaign-languages-css');
      loadStyle('/dice-3d.css', 'dice-3d-css');
      loadScript('/dice-3d.js', 'dice-3d-js').catch(() => {});
      loadScript('/campaign-languages.js', 'campaign-languages-js').catch(() => {});
    }

    if (campaign) {
      loadStyle('/dice-3d.css', 'dice-3d-css');
      loadStyle('/dice-settings.css', 'dice-settings-css');
      loadStyle('/campaign-sheet-v2.css', 'campaign-sheet-v2-css');
      loadScript('/dice-3d.js', 'dice-3d-js')
        .then(() => loadScript('/dice-settings.js', 'dice-settings-js'))
        .then(() => loadScript('/campaign-sheet-v2.js', 'campaign-sheet-v2-js'))
        .catch(() => {});
    }

    if (settings) {
      loadStyle('/dice-3d.css', 'dice-3d-css');
      loadStyle('/dice-settings.css', 'dice-settings-css');
      loadScript('/dice-3d.js', 'dice-3d-js')
        .then(() => loadScript('/dice-settings.js', 'dice-settings-js'))
        .catch(() => {});
    }
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

  function bindHomeCampaignButton() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const isHome = path === '/' || path.endsWith('/index.html') || path === '/en';
    if (!isHome) return;

    const isEnglish = document.documentElement.lang === 'en';
    const selector = isEnglish ? '.actions > .card:first-child' : '.action-stack > .action-card:first-child';
    const button = document.querySelector(selector);
    if (!button) return;

    button.removeAttribute('aria-disabled');
    button.setAttribute('aria-label', isEnglish ? 'Start new campaign' : 'Iniciar nova campanha');
    button.style.cursor = 'pointer';
    button.addEventListener('click', () => {
      location.href = isEnglish ? './new-campaign.html' : 'new-campaign.html';
    });

    const note = document.querySelector(isEnglish ? '.note' : '.prototype');
    if (note) note.textContent = isEnglish
      ? 'Campaign creation now starts with system, name, and tone.'
      : 'A criação de campanha agora começa pela escolha do sistema, nome e tom.';
  }

  ensureRefinementStyles();
  ensureThemeFontStyles();
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
    bindHomeCampaignButton();
    loadOracleEnhancements();
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
