/* SKYFROST — components.js — shared nav + footer */
(function() {
  const PAGES = [
    { href:'index.html',     icon:'<i class="bi bi-house-fill"></i>',       label:'Home' },
    { href:'store.html',     icon:'<i class="bi bi-cart-fill"></i>',         label:'Negozio' },
    { href:'staff.html',     icon:'<i class="bi bi-people-fill"></i>',       label:'Staff' },
    { href:'vote.html',      icon:'<i class="bi bi-check2-square"></i>',     label:'Vota' },
    { href:'dashboard.html', icon:'<i class="bi bi-speedometer2"></i>',      label:'Dashboard' },
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
        <div class="fb-brand"><i class="bi bi-snow"></i> SkyFrost</div>
        <p class="fb-desc">SkyFrost è il server Hytale italiano per eccellenza. Community attiva, staff dedicato ed eventi continui.</p>
      </div>
      <div class="fc">
        <h4>Menu veloce</h4>
        ${PAGES.map(p=>`<a href="${p.href}">${p.icon} ${p.label}</a>`).join('')}
      </div>
      <div class="fc">
        <h4>Social Media</h4>
        <a href="#"><i class="bi bi-facebook"></i> Facebook</a>
        <a href="#"><i class="bi bi-instagram"></i> Instagram</a>
        <a href="#"><i class="bi bi-twitter-x"></i> X / Twitter</a>
        <a href="#"><i class="bi bi-youtube"></i> YouTube</a>
        <a href="#"><i class="bi bi-discord"></i> Discord</a>
      </div>
      <div class="fc">
        <h4>Link</h4>
        <a href="register.html"><i class="bi bi-person-plus-fill"></i> Registrati</a>
        <a href="#"><i class="bi bi-headset"></i> Supporto</a>
        <a href="#"><i class="bi bi-file-text-fill"></i> Termini di Servizio</a>
        <a href="#"><i class="bi bi-shield-lock-fill"></i> Privacy</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} SkyFrost — Tutti i diritti riservati</span>
      <span>Hytale è un marchio di Hypixel Studios</span>
    </div>`;

  const pw = document.querySelector('.page-wrapper');
  if (pw) { pw.prepend(nav); pw.appendChild(footer); }
})();
