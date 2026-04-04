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
    licenses: '/licenses',
    login: '/login',
    privacy: '/privacy',
    cookie: '/cookie',
    terms: '/terms'
  };
  const BRAND_LOGO = '/assets/skyfrost-logo.png';

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
          <img src="${BRAND_LOGO}" alt="" />
        </span>
        <span class="nav-logo-wordmark">Sky<span>Frost</span></span>
      </a>

      <ul class="nav-links">
        ${navLink('home',     '<span data-i18n="nav_home">Home</span>',      active)}
        ${navLink('store',    '<span data-i18n="nav_store">Store</span>',     active)}
        ${navLink('staff',    '<span data-i18n="nav_staff">Staff</span>',     active)}
        ${navLink('vote',     '<span data-i18n="nav_vote">Vota</span>',      active)}
        ${navLink('supporto', '<span data-i18n="nav_support">Supporto</span>',  active)}
        ${navLink('wiki',     '<span data-i18n="nav_wiki">Wiki</span>',      active)}
        <li id="desktop-nav-licenses" style="display:none;">
          <a href="${ROUTE_PATHS.licenses}"${active === 'licenses' ? ' class="active" aria-current="page"' : ''} data-i18n="nav_licenses">Licenze</a>
        </li>
      </ul>

      <div class="nav-ctas" id="desktop-nav-cta">
        <div id="lang-selector-container"></div>
        <a href="${ROUTE_PATHS.login}" class="btn btn-primary btn-sm" data-i18n="nav_login">Accedi con Discord</a>
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
      ${mobileLink('home', '<span data-i18n="nav_home">Home</span>', active)}
      ${mobileLink('store', '<span data-i18n="nav_store">Store</span>', active)}
      ${mobileLink('staff', '<span data-i18n="nav_staff">Staff</span>', active)}
      ${mobileLink('vote', '<span data-i18n="nav_vote">Vota</span>', active)}
      ${mobileLink('supporto', '<span data-i18n="nav_support">Supporto</span>', active)}
      ${mobileLink('wiki', '<span data-i18n="nav_wiki">Wiki</span>', active)}
      <a href="${ROUTE_PATHS.licenses}" id="mobile-nav-licenses" style="display:none;"${active === 'licenses' ? ' class="active" aria-current="page"' : ''} data-i18n="nav_licenses">Licenze</a>
      <div id="mob-lang-selector-container"></div>
      <div style="display:flex;gap:.75rem;margin-top:1rem;" id="mobile-nav-cta">
        <a href="${ROUTE_PATHS.login}" class="btn btn-primary" data-i18n="nav_login">Accedi con Discord</a>
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
      <!-- CTA BANNER -->
      <div class="footer-cta">
        <h2 data-i18n="footer_cta_title">Pronto a unirti a SkyFrost?</h2>
        <p data-i18n="footer_cta_desc">Entra nella community, esplora lo store e fai sentire la tua voce con un voto!</p>
        <div class="footer-cta-actions">
          <a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer" class="btn btn-cyan" data-i18n="footer_btn_discord">Unisciti al Discord</a>
          <a href="${ROUTE_PATHS.store}" class="btn btn-outline" data-i18n="footer_btn_store">Visita lo Store</a>
        </div>
      </div>

      <div class="footer-inner">
        <div class="footer-brand">
          <a href="${ROUTE_PATHS.home}" class="footer-logo">
            <span class="footer-brand-mark" aria-hidden="true">
              <img src="${BRAND_LOGO}" alt="" />
            </span>
            <span class="footer-logo-wordmark">SkyFrost</span>
          </a>
          <p data-i18n="footer_desc">SkyFrost Network unisce server Minecraft e Hytale in un'unica community. Entra nel gelo e lascia il tuo segno.</p>
        </div>
        <div class="footer-col">
          <h4><span data-i18n="footer_nav">Navigazione</span></h4>
          <ul>
            <li><a href="${ROUTE_PATHS.home}" data-i18n="nav_home">Home</a></li>
            <li><a href="${ROUTE_PATHS.store}" data-i18n="nav_store">Store</a></li>
            <li><a href="${ROUTE_PATHS.staff}" data-i18n="nav_staff">Staff</a></li>
            <li><a href="${ROUTE_PATHS.vote}" data-i18n="nav_vote">Vota</a></li>
            <li><a href="${ROUTE_PATHS.wiki}" data-i18n="nav_wiki">Wiki</a></li>
            <li><a href="${ROUTE_PATHS.licenses}" data-i18n="nav_licenses">Licenze</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4 data-i18n="footer_community">Community</h4>
          <ul>
            <li><a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer">discord.skyfrost.it</a></li>
            <li><a href="${ROUTE_PATHS.supporto}" data-i18n="footer_support_link">Supporto Ticket</a></li>
            <li><a href="${ROUTE_PATHS.login}" data-i18n="footer_login_link">Login Discord</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4 data-i18n="footer_legal">Legale</h4>
          <ul>
            <li><a href="${ROUTE_PATHS.privacy}" data-i18n="footer_privacy_link">Privacy Policy</a></li>
            <li><a href="${ROUTE_PATHS.cookie}" data-i18n="footer_cookie_link">Cookie Policy</a></li>
            <li><a href="${ROUTE_PATHS.terms}" data-i18n="footer_terms_link">Termini di Servizio</a></li>
            <li><a href="sitemap.xml" data-i18n="footer_sitemap_link">Sitemap</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="footer-legal">
          <span class="footer-copy" data-i18n="footer_rights">© 2026 SkyFrost — Tutti i diritti riservati</span>
          <span class="footer-disclaimer" data-i18n="footer_disclaimer">SkyFrost Network e una community indipendente e non e affiliata a Mojang Studios, Microsoft o Hypixel Studios.</span>
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
      sky.addColorStop(0, '#0b0e14');
      sky.addColorStop(0.4, '#0a0d13');
      sky.addColorStop(1, '#070a10');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const aurora = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * -0.15, 0,
        canvas.width * 0.5, canvas.height * -0.15, canvas.width * 0.7
      );
      aurora.addColorStop(0, 'rgba(88,194,250,0.12)');
      aurora.addColorStop(0.5, 'rgba(88,194,250,0.04)');
      aurora.addColorStop(1, 'rgba(11,14,20,0)');
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rim = ctx.createRadialGradient(
        canvas.width * 0.8, canvas.height * 0.2, 0,
        canvas.width * 0.8, canvas.height * 0.2, canvas.width * 0.5
      );
      rim.addColorStop(0, 'rgba(88,194,250,0.04)');
      rim.addColorStop(1, 'rgba(11,14,20,0)');
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function animate() {
      drawBg();
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88,194,250,${p.alpha})`;
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
    const icons = { success: '<i class="bi bi-check-circle-fill"></i>', error: '<i class="bi bi-x-circle-fill"></i>', info: '<i class="bi bi-info-circle-fill"></i>' };
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

  document.addEventListener('DOMContentLoaded', async () => {
    document.body.dataset.page = getActivePage();
    initCanvas();
    injectNav();
    injectFooter();
    initReveal();

    // Append i18n script dynamically
    const i18nScript = document.createElement('script');
    i18nScript.src = 'assets/i18n.js?v=2';
    document.body.appendChild(i18nScript);

    if (typeof SkyFrost !== 'undefined' && typeof SkyFrost.fetchAuthSession === 'function') {
      try {
        const session = await SkyFrost.fetchAuthSession();
        if (session && session.authenticated && session.user) {
          const avatar = session.user.avatar 
            ? `https://cdn.discordapp.com/avatars/${session.user.id}/${session.user.avatar}.png`
            : "https://cdn.discordapp.com/embed/avatars/0.png";
          
          const lang = localStorage.getItem('sf_lang') || 'it';
          const helloStr = {it:'Ciao,', en:'Hello,', es:'Hola,', fr:'Salut,', de:'Hallo,'}[lang] || 'Ciao,';
          const nameStr = session.user.displayName || session.user.username;

          const userHtml = `
            <div class="nav-userbox">
              <span class="userbox-hello" data-i18n="nav_hello">${helloStr}</span>
              <img src="${avatar}" class="nav-avatar" alt="" crossorigin="anonymous" />
              <strong class="nav-username">${nameStr}</strong>
              <a href="#" onclick="event.preventDefault(); fetch('/api/auth?action=logout', {method:'POST'}).then(function(){ location.reload(); });" class="btn-logout" title="Logout"><i class="bi bi-box-arrow-right"></i></a>
            </div>
          `;

          const deskCtaBtn = document.querySelector('#desktop-nav-cta .btn');
          if (deskCtaBtn) {
            deskCtaBtn.outerHTML = userHtml;
          }
          const mobCta = document.getElementById('mobile-nav-cta');
          if (mobCta) {
            mobCta.innerHTML = userHtml;
          }
          
          const roles = Array.isArray(session.user.roles) ? session.user.roles : [];
          const ALLOWED_ROLES = ['1463926392109662350', '1463926392109662348'];
          const isStaff = roles.some(r => ALLOWED_ROLES.includes(r));
          if (isStaff) {
            const deskLic = document.getElementById('desktop-nav-licenses');
            if (deskLic) deskLic.style.display = '';
            const mobLic = document.getElementById('mobile-nav-licenses');
            if (mobLic) mobLic.style.display = '';
          }
        }
      } catch (err) {
        console.error('NavBar Auth Error:', err);
      }
    }
  });

})();

