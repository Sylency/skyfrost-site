/* SKYFROST — main.js */

/* ══ SNOW ANIMATION ══════════════════════════════════════════ */
(function initSnow() {
  const canvas = document.createElement('canvas');
  canvas.id = 'snow-canvas';
  canvas.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 2; opacity: 0.55;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, flakes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomFlake() {
    return {
      x:     Math.random() * W,
      y:     Math.random() * -H,          // start above viewport
      r:     Math.random() * 2.2 + 0.5,   // radius 0.5–2.7px
      speed: Math.random() * 0.8 + 0.25,  // fall speed
      drift: (Math.random() - 0.5) * 0.4, // horizontal drift
      alpha: Math.random() * 0.5 + 0.25,  // opacity
      wobble:      Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.015 + 0.005,
    };
  }

  function init() {
    // Spawn flakes spread across the whole height so it feels alive immediately
    flakes = Array.from({ length: 160 }, () => {
      const f = randomFlake();
      f.y = Math.random() * H; // pre-populate screen
      return f;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      // Wobble side-to-side
      f.wobble += f.wobbleSpeed;
      f.x += Math.sin(f.wobble) * 0.4 + f.drift;
      f.y += f.speed;

      // Reset when out of screen
      if (f.y > H + 10) {
        f.x     = Math.random() * W;
        f.y     = -8;
        f.r     = Math.random() * 2.2 + 0.5;
        f.speed = Math.random() * 0.8 + 0.25;
        f.alpha = Math.random() * 0.5 + 0.25;
      }
      if (f.x > W + 10) f.x = -5;
      if (f.x < -10)    f.x = W + 5;

      // Draw snowflake dot with soft glow
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 220, 255, ${f.alpha})`;
      ctx.shadowColor = 'rgba(100, 180, 255, 0.6)';
      ctx.shadowBlur  = f.r * 2;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }

  resize();
  init();
  draw();
  window.addEventListener('resize', () => { resize(); init(); });
})();

/* ══ ACTIVE NAV LINK ═════════════════════════════════════════ */
(function() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.top-nav a[data-page]').forEach(a => {
    if (a.dataset.page === path) a.classList.add('active');
  });
})();

/* ══ ANIMATED COUNTER ════════════════════════════════════════ */
window.animCount = function(el, to, dur = 1100) {
  if (!el) return;
  const start = performance.now();
  (function step(now) {
    const t    = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(to * ease);
    if (t < 1) requestAnimationFrame(step);
  })(performance.now());
};

/* ══ SCROLL REVEAL ═══════════════════════════════════════════ */
(function() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity    = '1';
        e.target.style.transform  = 'none';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll(
    '.news-item, .s-card, .staff-c, .v-card, .widget-card, .d-stat, .fp-card'
  ).forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity .38s ease, transform .38s ease';
    obs.observe(el);
  });
})();
