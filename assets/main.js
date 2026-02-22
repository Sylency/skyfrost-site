/* ============================================================
   SKYFROST — main.js
   ============================================================ */

/* ── Particles ─────────────────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawnParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - .5) * .3,
      vy: -Math.random() * .4 - .1,
      alpha: Math.random() * .5 + .1,
      color: Math.random() > .5 ? '#44aeff' : '#00e5ff',
    };
  }

  function init() {
    particles = Array.from({ length: 80 }, spawnParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= .001;
      if (p.y < -5 || p.alpha <= 0) Object.assign(p, spawnParticle(), { y: H + 5 });
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();
  window.addEventListener('resize', () => { resize(); init(); });
})();

/* ── Nav active link ────────────────────────────────────────── */
(function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* ── Animated counter ───────────────────────────────────────── */
function animateCount(el, from, to, duration = 1200, suffix = '') {
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * ease) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Intersection fade-up observer ─────────────────────────── */
(function initObserver() {
  const items = document.querySelectorAll('.card, .fade-up');
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  items.forEach(el => {
    if (!el.classList.contains('fade-up')) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity .45s ease, transform .45s ease';
    }
    obs.observe(el);
  });
})();

/* ── Expose ─────────────────────────────────────────────────── */
window.SF = { animateCount };