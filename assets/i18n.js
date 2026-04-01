(function () {
  'use strict';

  window.SkyFrost = window.SkyFrost || {};

  const SUPPORTED_LANGS = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];
  const DEFAULT_LANG = 'it';
  const LANG_KEY = 'sf_lang';

  let currentLang = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  if (!SUPPORTED_LANGS.find(l => l.code === currentLang)) currentLang = DEFAULT_LANG;
  
  let dictionary = {};

  async function loadDictionary() {
    try {
      const res = await fetch('/assets/lang.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load lang.json');
      dictionary = await res.json();
    } catch (err) {
      console.error('i18n Load Error:', err);
    }
  }

  function applyTranslations() {
    const texts = dictionary[currentLang] || dictionary[DEFAULT_LANG] || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (texts[key]) {
        // Handle specific attributes if needed, otherwise innerHTML
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder') !== null) {
          el.setAttribute('placeholder', texts[key]);
        } else {
          el.innerHTML = texts[key];
        }
      }
    });
    document.documentElement.lang = currentLang;
  }

  function setLanguage(langCode) {
    if (!SUPPORTED_LANGS.find(l => l.code === langCode)) return;
    currentLang = langCode;
    localStorage.setItem(LANG_KEY, langCode);
    applyTranslations();
  }

  SkyFrost.initI18n = async function () {
    await loadDictionary();
    applyTranslations();

    // Setup language selector in navbar
    const selectorContainer = document.getElementById('lang-selector-container');
    if (selectorContainer) {
      const select = document.createElement('select');
      select.className = 'lang-select';
      select.setAttribute('aria-label', 'Seleziona lingua');
      
      SUPPORTED_LANGS.forEach(l => {
        const option = document.createElement('option');
        option.value = l.code;
        option.textContent = l.flag + ' ' + l.code.toUpperCase();
        if (l.code === currentLang) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
      selectorContainer.appendChild(select);
    }
    
    const mobContainer = document.getElementById('mob-lang-selector-container');
    if (mobContainer) {
      const select = document.createElement('select');
      select.className = 'lang-select mob';
      select.setAttribute('aria-label', 'Seleziona lingua');
      
      SUPPORTED_LANGS.forEach(l => {
        const option = document.createElement('option');
        option.value = l.code;
        option.textContent = l.flag + ' ' + l.name;
        if (l.code === currentLang) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        setLanguage(e.target.value);
        // Also update the desktop selector to match
        const deskSelect = document.querySelector('.lang-select:not(.mob)');
        if (deskSelect) deskSelect.value = e.target.value;
      });
      mobContainer.innerHTML = '';
      mobContainer.appendChild(select);
    }
  };

  // CSS for selector
  const style = document.createElement('style');
  style.textContent = `
    .lang-select {
      background: rgba(15, 23, 42, 0.6);
      color: var(--text-dim);
      border: 1px solid rgba(88,194,250,0.12);
      border-radius: var(--radius-sm);
      padding: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: all var(--transition);
      margin-left: 0.5rem;
    }
    .lang-select:hover {
      border-color: var(--primary);
      color: var(--white);
      background: rgba(15, 23, 42, 0.9);
    }
    .lang-select option {
      background: var(--bg-1);
      color: var(--white);
    }
    .lang-select.mob {
      width: 100%;
      margin: 1rem 0 0 0;
      padding: 0.6rem;
      font-size: 1rem;
    }
  `;
  document.head.appendChild(style);

  // Initialize after DOM load
  document.addEventListener('DOMContentLoaded', () => {
    SkyFrost.initI18n();
  });

})();
