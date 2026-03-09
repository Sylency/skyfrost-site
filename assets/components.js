/* ═══════════════════════════════════════════════
   SKYFROST — COMPONENTS.JS
   Injects navbar + footer, exposes shared UI utils
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  const ROUTE_PATHS = {
    home: '/',
    store: '/store',
    staff: '/staff',
    vote: '/vote',
    supporto: '/supporto',
    wiki: '/wiki',
    login: '/login',
    privacy: '/privacy',
    cookie: '/cookie',
    terms: '/terms'
  };
  const BRAND_LOGO_PRIMARY = '/assets/skyfrost-logo.png';
  const BRAND_LOGO_FALLBACK = '/assets/skyfrost-crest.svg';

  function applyBrandLogo(src) {
    document.documentElement.style.setProperty('--brand-logo-url', `url('${src}')`);
    document.querySelectorAll('img[data-brand-logo]').forEach((img) => {
      img.src = src;
      img.onerror = function () {
        if (this.dataset.brandFallbackApplied === '1') return;
        this.dataset.brandFallbackApplied = '1';
        this.src = BRAND_LOGO_FALLBACK;
      };
    });
  }

  function hydrateBrandLogo() {
    const probe = new Image();
    probe.onload = () => applyBrandLogo(BRAND_LOGO_PRIMARY);
    probe.onerror = () => applyBrandLogo(BRAND_LOGO_FALLBACK);
    probe.src = `${BRAND_LOGO_PRIMARY}?v=1`;
  }

  /* ── ACTIVE PAGE DETECTION ── */
  function getActivePage() {
    const cleanedPath = window.location.pathname.replace(/\/+$/, '');
    if (!cleanedPath) return 'home';
    const lastSegment = cleanedPath.split('/').pop().toLowerCase();
    const withoutExt = lastSegment.endsWith('.html') ? lastSegment.slice(0, -5) : lastSegment;
    return withoutExt === 'index' || !withoutExt ? 'home' : withoutExt;
  }

  function navLink(page, label, active) {
    const href = ROUTE_PATHS[page] || '/';
    const isActive = active === page;
    return `<li><a href="${href}"${isActive ? ' class="active" aria-current="page"' : ''}>${label}</a></li>`;
  }

  function mobileLink(page, label, active) {
    const href = ROUTE_PATHS[page] || '/';
    const isActive = active === page;
    return `<a href="${href}"${isActive ? ' class="active" aria-current="page"' : ''}>${label}</a>`;
  }

  /* ── NAVBAR ── */
  function injectNav() {
    const active = getActivePage();
    const nav = document.createElement('nav');
    nav.id = 'site-nav';
    nav.innerHTML = `
      <a class="nav-logo" href="${ROUTE_PATHS.home}">
        <span class="nav-logo-mark" aria-hidden="true">
          <img data-brand-logo src="${BRAND_LOGO_FALLBACK}" alt="" />
        </span>
        <span class="nav-logo-wordmark">Sky<span>Frost</span></span>
      </a>

      <ul class="nav-links">
        ${navLink('home',     'Home',      active)}
        ${navLink('store',    'Store',     active)}
        ${navLink('staff',    'Staff',     active)}
        ${navLink('vote',     'Vota',      active)}
        ${navLink('supporto', 'Supporto',  active)}
        ${navLink('wiki',     'Wiki',      active)}
      </ul>

      <div class="nav-ctas">
        <a href="${ROUTE_PATHS.login}" class="btn btn-ghost btn-sm">Accedi</a>
        <a href="${ROUTE_PATHS.supporto}" class="btn btn-primary btn-sm">Apri Ticket</a>
      </div>

      <button
        class="nav-hamburger"
        id="hamburger"
        aria-label="Menu"
        aria-controls="mobile-overlay"
        aria-expanded="false"
        aria-haspopup="dialog"
      >
        <span></span><span></span><span></span>
      </button>
    `;
    document.body.prepend(nav);

    /* Mobile overlay */
    const overlay = document.createElement('div');
    overlay.className = 'nav-mobile-overlay';
    overlay.id = 'mobile-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Menu principale');
    overlay.hidden = true;
    overlay.innerHTML = `
      ${mobileLink('home', 'Home', active)}
      ${mobileLink('store', 'Store', active)}
      ${mobileLink('staff', 'Staff', active)}
      ${mobileLink('vote', 'Vota', active)}
      ${mobileLink('supporto', 'Supporto', active)}
      ${mobileLink('wiki', 'Wiki', active)}
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <a href="${ROUTE_PATHS.login}" class="btn btn-ghost">Accedi</a>
        <a href="${ROUTE_PATHS.supporto}" class="btn btn-primary">Apri Ticket</a>
      </div>
    `;
    document.body.appendChild(overlay);

    const hamburger = document.getElementById('hamburger');
    let lastFocusedElement = null;

    function menuFocusableElements() {
      return Array.from(overlay.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    }

    function setMenuOpen(isOpen) {
      overlay.classList.toggle('open', isOpen);
      overlay.hidden = !isOpen;
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        lastFocusedElement = document.activeElement;
        const first = menuFocusableElements()[0];
        if (first) first.focus();
        return;
      }

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      } else {
        hamburger.focus();
      }
    }

    hamburger.addEventListener('click', () => {
      setMenuOpen(!overlay.classList.contains('open'));
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) setMenuOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (!overlay.classList.contains('open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = menuFocusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && overlay.classList.contains('open')) {
        setMenuOpen(false);
      }
    });

    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => setMenuOpen(false));
    });
  }

  /* ── FOOTER ── */
  function injectFooter() {
    const footer = document.createElement('footer');
    footer.id = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="${ROUTE_PATHS.home}" class="footer-logo">
            <span class="footer-brand-mark" aria-hidden="true">
              <img data-brand-logo src="${BRAND_LOGO_FALLBACK}" alt="" />
            </span>
            <span class="footer-logo-wordmark">SkyFrost</span>
          </a>
          <p>Il server Hytale italiano. Entra nel gelo e lascia il tuo segno.</p>
        </div>
        <div class="footer-col">
          <h4>Navigazione</h4>
          <ul>
            <li><a href="${ROUTE_PATHS.home}">Home</a></li>
            <li><a href="${ROUTE_PATHS.store}">Store</a></li>
            <li><a href="${ROUTE_PATHS.staff}">Staff</a></li>
            <li><a href="${ROUTE_PATHS.vote}">Vota</a></li>
            <li><a href="${ROUTE_PATHS.wiki}">Wiki</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Community</h4>
          <ul>
            <li><a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer">discord.skyfrost.it</a></li>
            <li><a href="${ROUTE_PATHS.supporto}">Supporto Ticket</a></li>
            <li><a href="${ROUTE_PATHS.login}">Login Discord</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legale</h4>
          <ul>
            <li><a href="${ROUTE_PATHS.privacy}">Privacy Policy</a></li>
            <li><a href="${ROUTE_PATHS.cookie}">Cookie Policy</a></li>
            <li><a href="${ROUTE_PATHS.terms}">Termini di Servizio</a></li>
            <li><a href="sitemap.xml">Sitemap</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom" style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);max-width:1200px;margin-left:auto;margin-right:auto;display:flex;align-items:center;justify-content:space-between;">
        <div class="footer-legal">
          <span class="footer-copy">© 2026 SkyFrost — Tutti i diritti riservati</span>
          <span class="footer-disclaimer">Questo sito non e affiliato ad Hypixel Studios.</span>
        </div>
        <div class="footer-social">
          <a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer" title="Discord">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056A19.9 19.9 0 0 0 6.1 21.01a.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </a>
          <a href="https://store.skyfrost.it" target="_blank" rel="noopener noreferrer" title="Store">🛒</a>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
  }

  /* ── PARTICLE CANVAS ── */
  function initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'bg-canvas';
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 88;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.7 + 0.35,
      vx: (Math.random() - 0.5) * 0.28,
      vy: Math.random() * 0.45 + 0.08,
      alpha: Math.random() * 0.48 + 0.08
    }));

    function drawBg() {
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, 'rgba(10,27,62,1)');
      sky.addColorStop(0.36, 'rgba(5,16,39,1)');
      sky.addColorStop(1, 'rgba(2,8,21,1)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const aurora = ctx.createRadialGradient(
        canvas.width * 0.36, canvas.height * 0.12, 0,
        canvas.width * 0.36, canvas.height * 0.12, canvas.width * 0.62
      );
      aurora.addColorStop(0, 'rgba(120,214,255,0.22)');
      aurora.addColorStop(0.4, 'rgba(64,126,255,0.12)');
      aurora.addColorStop(1, 'rgba(4,10,24,0)');
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rim = ctx.createRadialGradient(
        canvas.width * 0.8, canvas.height * 0.2, 0,
        canvas.width * 0.8, canvas.height * 0.2, canvas.width * 0.5
      );
      rim.addColorStop(0, 'rgba(149,235,255,0.12)');
      rim.addColorStop(1, 'rgba(4,10,24,0)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function animate() {
      drawBg();
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138,229,255,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > canvas.height + 5) {
          p.y = -5;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ── SCROLL REVEAL ── */
  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  /* ── TOAST ── */
  window.SkyFrost = window.SkyFrost || {};
  window.SkyFrost.toast = function (message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', info: '❄️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '❄️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', () => {
    document.body.dataset.page = getActivePage();
    initCanvas();
    injectNav();
    injectFooter();
    hydrateBrandLogo();
    initReveal();
  });

})();
