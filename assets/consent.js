(function () {
  'use strict';

  const STORAGE_KEY = 'sf_cookie_consent';
  const BANNER_ID = 'sf-cookie-consent';
  const STYLE_ID = 'sf-cookie-consent-style';
  const POLICY_PATH = '/cookie';
  const CONSENT_GRANTED = {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted'
  };
  const CONSENT_DENIED = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  };
  const COPY = {
    it: {
      title: 'Preferenze cookie',
      description: 'Usiamo cookie tecnici e, solo con il tuo consenso, il tag Google per misurare visite e conversioni. Puoi accettare tutto oppure mantenere solo i cookie necessari.',
      accept: 'Accetta tutto',
      reject: 'Solo necessari',
      policy: 'Cookie Policy'
    },
    en: {
      title: 'Cookie preferences',
      description: 'We use technical cookies and, only with your consent, the Google tag to measure visits and conversions. You can accept all cookies or keep only the necessary ones.',
      accept: 'Accept all',
      reject: 'Necessary only',
      policy: 'Cookie Policy'
    },
    es: {
      title: 'Preferencias de cookies',
      description: 'Usamos cookies tecnicas y, solo con tu consentimiento, la etiqueta de Google para medir visitas y conversiones. Puedes aceptarlas todas o mantener solo las necesarias.',
      accept: 'Aceptar todo',
      reject: 'Solo necesarias',
      policy: 'Politica de cookies'
    },
    fr: {
      title: 'Preferences cookies',
      description: 'Nous utilisons des cookies techniques et, uniquement avec votre consentement, la balise Google pour mesurer les visites et les conversions. Vous pouvez tout accepter ou conserver seulement les cookies necessaires.',
      accept: 'Tout accepter',
      reject: 'Necessaires uniquement',
      policy: 'Politique de cookies'
    },
    de: {
      title: 'Cookie-Einstellungen',
      description: 'Wir verwenden technische Cookies und nur mit deiner Einwilligung das Google-Tag, um Besuche und Conversions zu messen. Du kannst alle Cookies akzeptieren oder nur die notwendigen behalten.',
      accept: 'Alle akzeptieren',
      reject: 'Nur notwendige',
      policy: 'Cookie-Richtlinie'
    }
  };

  window.SkyFrost = window.SkyFrost || {};

  function readStoredConsent() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'accepted' || value === 'rejected' ? value : null;
    } catch {
      return null;
    }
  }

  function writeStoredConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore storage failures and keep the site usable.
    }
  }

  function getLanguage() {
    let storedLang = '';
    try {
      storedLang = localStorage.getItem('sf_lang') || '';
    } catch {
      storedLang = '';
    }

    const lang = (
      window.SkyFrost?.getLanguage?.()
      || storedLang
      || document.documentElement.lang
      || 'it'
    ).slice(0, 2).toLowerCase();
    return COPY[lang] ? lang : 'it';
  }

  function text() {
    return COPY[getLanguage()];
  }

  function gtagConsentUpdate(state) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('consent', 'update', state === 'accepted' ? CONSENT_GRANTED : CONSENT_DENIED);
  }

  function expireCookie(name, domain) {
    const parts = [
      `${name}=`,
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'path=/',
      'SameSite=Lax'
    ];
    if (domain) parts.push(`domain=${domain}`);
    document.cookie = parts.join('; ');
  }

  function clearGoogleCookies() {
    const names = ['_gcl_au', '_gcl_aw', '_gcl_dc', '_ga', '_gid', '_gat'];
    const hostname = window.location.hostname;
    const segments = hostname.split('.').filter(Boolean);
    const domains = new Set(['', hostname]);

    for (let index = 0; index < segments.length - 1; index += 1) {
      domains.add(`.${segments.slice(index).join('.')}`);
    }

    names.forEach((name) => {
      domains.forEach((domain) => expireCookie(name, domain));
    });

    Object.keys(document.cookie.split('; ').reduce((acc, cookie) => {
      const [rawName] = cookie.split('=');
      acc[rawName] = true;
      return acc;
    }, {})).forEach((name) => {
      if (name === '_ga' || name.startsWith('_ga_') || name.startsWith('_gcl_')) {
        domains.forEach((domain) => expireCookie(name, domain));
      }
    });
  }

  function applyConsentState(state) {
    document.documentElement.dataset.cookieConsent = state;
    gtagConsentUpdate(state);
    if (state !== 'accepted') clearGoogleCookies();
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BANNER_ID} {
        position: fixed;
        inset: auto 1rem 1rem 1rem;
        z-index: 12000;
        display: flex;
        justify-content: center;
        pointer-events: none;
      }
      #${BANNER_ID}[hidden] {
        display: none;
      }
      #${BANNER_ID} .sf-cookie-card {
        width: min(760px, 100%);
        pointer-events: auto;
        padding: 1rem 1.1rem;
        border-radius: 22px;
        border: 1px solid rgba(88, 194, 250, 0.18);
        background:
          radial-gradient(circle at top left, rgba(88, 194, 250, 0.18), transparent 42%),
          rgba(11, 14, 20, 0.94);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
      }
      #${BANNER_ID} .sf-cookie-title {
        margin: 0 0 0.35rem;
        color: var(--white, #f1f5f9);
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      #${BANNER_ID} .sf-cookie-desc {
        margin: 0;
        color: var(--text, #cbd5e1);
        font-size: 0.92rem;
        line-height: 1.6;
      }
      #${BANNER_ID} .sf-cookie-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-top: 1rem;
      }
      #${BANNER_ID} .sf-cookie-btn {
        appearance: none;
        border: 1px solid rgba(88, 194, 250, 0.22);
        border-radius: 999px;
        padding: 0.72rem 1rem;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      }
      #${BANNER_ID} .sf-cookie-btn:hover {
        transform: translateY(-1px);
      }
      #${BANNER_ID} .sf-cookie-btn-primary {
        background: var(--primary, #58c2fa);
        color: #ffffff;
        box-shadow: 0 0 18px rgba(88, 194, 250, 0.28);
      }
      #${BANNER_ID} .sf-cookie-btn-secondary {
        background: transparent;
        color: var(--text, #cbd5e1);
      }
      #${BANNER_ID} .sf-cookie-link {
        color: var(--primary, #58c2fa);
        font-size: 0.88rem;
        font-weight: 700;
        text-decoration: none;
      }
      #${BANNER_ID} .sf-cookie-link:hover {
        text-decoration: underline;
      }
      @media (max-width: 640px) {
        #${BANNER_ID} {
          inset-inline: 0.75rem;
          bottom: 0.75rem;
        }
        #${BANNER_ID} .sf-cookie-card {
          padding: 0.95rem;
          border-radius: 18px;
        }
        #${BANNER_ID} .sf-cookie-actions {
          flex-direction: column;
          align-items: stretch;
        }
        #${BANNER_ID} .sf-cookie-btn,
        #${BANNER_ID} .sf-cookie-link {
          width: 100%;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bannerElement() {
    return document.getElementById(BANNER_ID);
  }

  function closeBanner() {
    const banner = bannerElement();
    if (!banner) return;
    banner.hidden = true;
  }

  function updateBannerCopy() {
    const banner = bannerElement();
    if (!banner) return;

    const copy = text();
    const title = banner.querySelector('[data-cookie-copy="title"]');
    const description = banner.querySelector('[data-cookie-copy="description"]');
    const accept = banner.querySelector('[data-cookie-action="accept"]');
    const reject = banner.querySelector('[data-cookie-action="reject"]');
    const policy = banner.querySelector('[data-cookie-copy="policy"]');

    if (title) title.textContent = copy.title;
    if (description) description.textContent = copy.description;
    if (accept) accept.textContent = copy.accept;
    if (reject) reject.textContent = copy.reject;
    if (policy) policy.textContent = copy.policy;
  }

  function ensureBanner() {
    let banner = bannerElement();
    if (banner) {
      updateBannerCopy();
      return banner;
    }

    ensureStyles();
    const copy = text();

    banner = document.createElement('aside');
    banner.id = BANNER_ID;
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <div class="sf-cookie-card" role="dialog" aria-modal="false" aria-labelledby="${BANNER_ID}-title">
        <h2 class="sf-cookie-title" id="${BANNER_ID}-title" data-cookie-copy="title">${copy.title}</h2>
        <p class="sf-cookie-desc" data-cookie-copy="description">${copy.description}</p>
        <div class="sf-cookie-actions">
          <button type="button" class="sf-cookie-btn sf-cookie-btn-secondary" data-cookie-action="reject">${copy.reject}</button>
          <button type="button" class="sf-cookie-btn sf-cookie-btn-primary" data-cookie-action="accept">${copy.accept}</button>
          <a class="sf-cookie-link" href="${POLICY_PATH}" data-cookie-copy="policy">${copy.policy}</a>
        </div>
      </div>
    `;

    banner.querySelector('[data-cookie-action="accept"]').addEventListener('click', () => {
      writeStoredConsent('accepted');
      applyConsentState('accepted');
      closeBanner();
    });

    banner.querySelector('[data-cookie-action="reject"]').addEventListener('click', () => {
      writeStoredConsent('rejected');
      applyConsentState('rejected');
      closeBanner();
    });

    document.body.appendChild(banner);
    return banner;
  }

  function openBanner() {
    const banner = ensureBanner();
    banner.hidden = false;
  }

  function initBanner() {
    ensureBanner();
    if (!readStoredConsent()) openBanner();
    else closeBanner();
  }

  const initialConsent = readStoredConsent();
  if (initialConsent) applyConsentState(initialConsent);

  window.SkyFrost.openConsentSettings = function () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', openBanner, { once: true });
      return;
    }
    openBanner();
  };

  window.SkyFrost.getConsentState = readStoredConsent;

  document.addEventListener('skyfrost:languagechange', updateBannerCopy);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner, { once: true });
  } else {
    initBanner();
  }
})();
