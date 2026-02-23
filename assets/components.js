/* SKYFROST — components.js — shared nav + footer */
(function() {
  const PAGES = [
    { href:'index.html',     icon:'🏠', label:'Home' },
    { href:'store.html',     icon:'🛒', label:'Negozio' },
    { href:'staff.html',     icon:'👥', label:'Staff' },
    { href:'vote.html',      icon:'🗳', label:'Vota' },
    { href:'dashboard.html', icon:'📊', label:'Dashboard' },
  ];

  // NAV
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  nav.innerHTML =
    PAGES.map(p =>
      `<a href="${p.href}" data-page="${p.href}">${p.icon} ${p.label}</a>`
    ).join('') +
    `<div class="nav-auth">
       <a href="login.html"    class="btn-login">Accedi</a>
       <a href="register.html" class="btn-reg">Registrati</a>
     </div>`;

  // FOOTER
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <div class="fb-brand">❄ SkyFrost</div>
        <p class="fb-desc">SkyFrost è il server Hytale italiano per eccellenza. Community attiva, staff dedicato ed eventi continui.</p>
      </div>
      <div class="fc">
        <h4>Menu veloce</h4>
        ${PAGES.map(p=>`<a href="${p.href}">${p.icon} ${p.label}</a>`).join('')}
      </div>
      <div class="fc">
        <h4>Social Media</h4>
        <a href="#">📘 Facebook</a>
        <a href="#">📸 Instagram</a>
        <a href="#">🐦 X / Twitter</a>
        <a href="#">▶ YouTube</a>
        <a href="#">💬 Discord</a>
      </div>
      <div class="fc">
        <h4>Link</h4>
        <a href="register.html">Registrati</a>
        <a href="#">Supporto</a>
        <a href="#">Termini di Servizio</a>
        <a href="#">Privacy</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} SkyFrost — Tutti i diritti riservati</span>
      <span>Hytale è un marchio di Hypixel Studios</span>
    </div>`;

  const pw = document.querySelector('.page-wrapper');
  if (pw) { pw.prepend(nav); pw.appendChild(footer); }
})();
