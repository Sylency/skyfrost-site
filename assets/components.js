/* ============================================================
   SKYFROST — components.js
   Shared navbar & footer injected into every page
   ============================================================ */

(function injectLayout() {
  const LINKS = [
    { href: 'index.html',     label: 'Home' },
    { href: 'store.html',     label: 'Store' },
    { href: 'staff.html',     label: 'Staff' },
    { href: 'vote.html',      label: 'Vote' },
    { href: 'dashboard.html', label: 'Dashboard' },
  ];

  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <a href="index.html" class="navbar__logo">
      <div class="logo-icon">❄</div>
      Sky<span>Frost</span>
    </a>
    <div class="navbar__links">
      ${LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
    </div>
    <div class="navbar__actions">
      <a href="login.html"    class="btn btn-outline btn-sm">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    </div>`;

  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer__inner">
      <div class="footer__brand">
        <div class="navbar__logo" style="font-size:1.2rem">
          <div class="logo-icon" style="width:28px;height:28px;font-size:.9rem">❄</div>
          Sky<span>Frost</span>
        </div>
        <p>Il server Hytale dedicato alla community italiana. Unisciti a noi e vivi l'avventura.</p>
      </div>
      <div class="footer__col">
        <h4>Navigazione</h4>
        ${LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
      </div>
      <div class="footer__col">
        <h4>Community</h4>
        <a href="#">Discord</a>
        <a href="#">Forum</a>
        <a href="#">Regolamento</a>
        <a href="#">Candidature</a>
      </div>
      <div class="footer__col">
        <h4>Legale</h4>
        <a href="#">Privacy Policy</a>
        <a href="#">Termini di Servizio</a>
        <a href="#">Cookie</a>
      </div>
    </div>
    <div class="footer__bottom">
      © ${new Date().getFullYear()} SkyFrost — Tutti i diritti riservati · Hytale è un marchio di Hypixel Studios
    </div>`;

  const pw = document.querySelector('.page-wrapper');
  if (!pw) return;
  pw.prepend(nav);
  pw.appendChild(footer);
})();
