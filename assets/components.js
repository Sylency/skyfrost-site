/* ═══════════════════════════════════════════════
   SKYFROST — COMPONENTS.JS
   Injects navbar + footer, exposes shared UI utils
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── ACTIVE PAGE DETECTION ── */
  function getActivePage() {
    const p = window.location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  function navLink(href, label, active) {
    return `<li><a href="${href}"${active === href ? ' class="active"' : ''}>${label}</a></li>`;
  }

  /* ── NAVBAR ── */
  function injectNav() {
    const active = getActivePage();
    const nav = document.createElement('nav');
    nav.id = 'site-nav';
    nav.innerHTML = `
      <a class="nav-logo" href="index.html">Sky<span>Frost</span></a>

      <ul class="nav-links">
        ${navLink('index.html',     'Home',      active)}
        ${navLink('store.html',     'Store',     active)}
        ${navLink('staff.html',     'Staff',     active)}
        ${navLink('vote.html',      'Vota',      active)}
        ${navLink('supporto.html',  'Supporto',  active)}
        ${navLink('wiki.html',      'Wiki',      active)}
      </ul>

      <div class="nav-ctas">
        <a href="login.html"    class="btn btn-ghost btn-sm">Accedi</a>
        <a href="supporto.html" class="btn btn-primary btn-sm">Apri Ticket</a>
      </div>

      <button class="nav-hamburger" id="hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    `;
    document.body.prepend(nav);

    /* Mobile overlay */
    const overlay = document.createElement('div');
    overlay.className = 'nav-mobile-overlay';
    overlay.id = 'mobile-overlay';
    overlay.innerHTML = `
      <a href="index.html">Home</a>
      <a href="store.html">Store</a>
      <a href="staff.html">Staff</a>
      <a href="vote.html">Vota</a>
      <a href="supporto.html">Supporto</a>
      <a href="wiki.html">Wiki</a>
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <a href="login.html"    class="btn btn-ghost">Accedi</a>
        <a href="supporto.html" class="btn btn-primary">Apri Ticket</a>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('hamburger').addEventListener('click', () => {
      overlay.classList.toggle('open');
    });
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => overlay.classList.remove('open'));
    });
  }

  /* ── FOOTER ── */
  function injectFooter() {
    const footer = document.createElement('footer');
    footer.id = 'site-footer';
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="index.html" class="footer-logo">SkyFrost</a>
          <p>Il server Hytale italiano. Entra nel gelo e lascia il tuo segno.</p>
        </div>
        <div class="footer-col">
          <h4>Navigazione</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="store.html">Store</a></li>
            <li><a href="staff.html">Staff</a></li>
            <li><a href="vote.html">Vota</a></li>
            <li><a href="wiki.html">Wiki</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Community</h4>
          <ul>
            <li><a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer">Discord</a></li>
            <li><a href="supporto.html">Supporto Ticket</a></li>
            <li><a href="login.html">Login Discord</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legale</h4>
          <ul>
            <li><a href="privacy.html">Privacy Policy</a></li>
            <li><a href="cookie.html">Cookie Policy</a></li>
            <li><a href="terms.html">Termini di Servizio</a></li>
            <li><a href="sitemap.xml">Sitemap</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom" style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);max-width:1200px;margin-left:auto;margin-right:auto;display:flex;align-items:center;justify-content:space-between;">
        <span class="footer-copy">© 2026 SkyFrost — Tutti i diritti riservati</span>
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
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 70;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -Math.random() * 0.35 - 0.08,
      alpha: Math.random() * 0.45 + 0.08
    }));

    function drawBg() {
      const g = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.25, 0,
        canvas.width * 0.5, canvas.height * 0.25, canvas.width * 0.9
      );
      g.addColorStop(0, 'rgba(10,20,50,1)');
      g.addColorStop(0.45, 'rgba(8,13,26,1)');
      g.addColorStop(1, 'rgba(5,8,16,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function animate() {
      drawBg();
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(94,231,255,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
      });
      requestAnimationFrame(animate);
    }
    if (reducedMotion) {
      drawBg();
      return;
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
    initCanvas();
    injectNav();
    injectFooter();
    initReveal();
  });

})();
