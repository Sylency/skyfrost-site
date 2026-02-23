/* SKYFROST — main.js */
(function() {
  // Active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.top-nav a[data-page]').forEach(a => {
    if (a.dataset.page === path) a.classList.add('active');
  });

  // Animated counter
  window.animCount = function(el, to, dur=1100, suffix='') {
    const start = performance.now();
    (function step(now) {
      const t = Math.min((now-start)/dur, 1);
      const ease = 1 - Math.pow(1-t, 3);
      el.textContent = Math.round(to * ease) + suffix;
      if (t < 1) requestAnimationFrame(step);
    })(performance.now());
  };

  // Scroll reveal
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.news-item, .s-card, .staff-c, .v-card, .widget-card, .d-stat').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'opacity .38s ease, transform .38s ease';
    obs.observe(el);
  });
})();
