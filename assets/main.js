/* ═══════════════════════════════════════════════
   SKYFROST — MAIN.JS
   ═══════════════════════════════════════════════ */

window.SkyFrost = window.SkyFrost || {};

/**
 * ── API BASE URL ──────────────────────────────
 * Se nginx proxya /api/* → porta 3001, lascia '/api'.
 * Se NON hai il proxy configurato, cambia con:
 *   'http://tuodominio.it:3001/api'
 * ─────────────────────────────────────────────
 */
const API_BASE = '/api';

/* ── ONLINE COUNTER (placeholder finché non hai API server) ── */
SkyFrost.initCounter = function (el, base, variance) {
  if (!el) return;
  let current = base + Math.floor(Math.random() * variance);
  el.textContent = current;
  setInterval(() => {
    current = Math.max(0, current + (Math.random() > 0.5 ? 1 : -1));
    el.textContent = current;
  }, 8000);
};

/* ── INDEX PAGE ── */
SkyFrost.initIndex = function () {
  SkyFrost.initCounter(document.getElementById('online-count'), 24, 12);

  const pages = document.querySelectorAll('.news-page');
  const dots   = document.querySelectorAll('.page-dot');
  let current = 0;

  function showPage(n) {
    pages.forEach((p, i) => { p.style.display = i === n ? '' : 'none'; });
    dots.forEach((d, i) => { d.classList.toggle('active', i === n); });
    current = n;
  }

  document.getElementById('news-prev')?.addEventListener('click', () => {
    showPage((current - 1 + pages.length) % pages.length);
  });
  document.getElementById('news-next')?.addEventListener('click', () => {
    showPage((current + 1) % pages.length);
  });
  dots.forEach((d, i) => d.addEventListener('click', () => showPage(i)));
  if (pages.length) showPage(0);
};

/* ── STORE PAGE ── */
SkyFrost.initStore = function () {
  const cards = Array.from(document.querySelectorAll('.product-card'));
  const counts = cards.reduce((acc, card) => {
    const cat = card.dataset.cat;
    if (!cat) return acc;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  document.querySelectorAll('.sidebar-nav a[data-cat]').forEach(link => {
    const cat = link.dataset.cat;
    const countEl = link.querySelector('.count');
    if (countEl) {
      countEl.textContent = cat === 'all' ? String(cards.length) : String(counts[cat] || 0);
    }
    if (cat !== 'all' && !counts[cat]) {
      const li = link.closest('li');
      if (li) li.remove();
    }
  });

  const totalLabel = document.querySelector('.section-header span');
  if (totalLabel) totalLabel.textContent = `${cards.length} articoli`;

  /* Filtro categorie nella sidebar */
  document.querySelectorAll('.sidebar-nav a[data-cat]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.dataset.cat;
      document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.product-card').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
};

/* ── STAFF PAGE ── */
SkyFrost.initStaff = async function () {
  const container = document.getElementById('staff-container');
  if (!container) return;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

  function normalizeStatus(value) {
    return ['online', 'idle', 'dnd', 'offline'].includes(value) ? value : 'offline';
  }

  try {
    const res = await fetch(`${API_BASE}/discord`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderStaff(data);
  } catch (err) {
    console.error('Staff fetch failed:', err);
    container.innerHTML = `
      <div style="text-align:center;padding:4rem;color:var(--text-dim);">
        <div style="font-size:2rem;margin-bottom:1rem;">❄️</div>
        <p style="color:var(--frost);font-family:'Cinzel',serif;margin-bottom:.5rem;">Impossibile caricare lo staff</p>
        <p style="font-size:.82rem;color:var(--text-muted);">${escapeHtml(err.message)}</p>
        <p style="font-size:.78rem;color:var(--text-muted);margin-top:.5rem;">
          Controlla che il bot sia nel server e che DISCORD_BOT_TOKEN sia configurato in api/.env
        </p>
      </div>`;
  }

  function renderStaff(data) {
    const order    = ['Owner', 'Admin', 'Moderatore', 'Builder', 'Helper'];
    const dotClass = { Owner: 'owner', Admin: 'admin', Moderatore: 'mod', Builder: 'builder', Helper: 'helper' };

    let html = '';
    order.forEach(role => {
      const members = data[role];
      if (!members || !members.length) return;
      html += `
        <div class="role-section reveal">
          <div class="role-label">
            <span class="role-dot ${dotClass[role]}"></span>
            <h3>${role}</h3>
          </div>
          <div class="grid-auto-sm">
            ${members.map(m => {
              const name = escapeHtml(m.displayName || m.username || 'Utente');
              const avatar = escapeHtml(m.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png');
              const status = normalizeStatus(m.status);
              return `
              <div class="card staff-card">
                <div class="staff-avatar-wrap">
                  <img class="staff-avatar"
                    src="${avatar}"
                    alt="${name}"
                    onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'"
                  />
                  <span class="staff-online-dot ${status}"></span>
                </div>
                <div class="staff-name">${name}</div>
                <div class="staff-role-badge ${dotClass[role]}">${role}</div>
              </div>
            `;
            }).join('')}
          </div>
        </div>`;
    });

    container.innerHTML = html ||
      `<p style="color:var(--text-dim);text-align:center;padding:3rem;">Nessun membro staff trovato.</p>`;

    /* Reattiva scroll reveal per gli elementi dinamici */
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    container.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
};

/* ── AUTH FORMS ── */
SkyFrost.initLogin = function () {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.textContent = 'Accesso in corso…';
    btn.disabled = true;
    await new Promise(r => setTimeout(r, 1000));
    SkyFrost.toast('Funzionalità non ancora attiva.', 'info');
    btn.textContent = 'Accedi';
    btn.disabled = false;
  });
};

SkyFrost.initRegister = function () {
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd  = document.getElementById('reg-password').value;
    const pwd2 = document.getElementById('reg-password2').value;
    if (pwd !== pwd2) {
      SkyFrost.toast('Le password non coincidono.', 'error');
      return;
    }
    const btn = e.target.querySelector('[type=submit]');
    btn.textContent = 'Registrazione…';
    btn.disabled = true;
    await new Promise(r => setTimeout(r, 1000));
    SkyFrost.toast('Funzionalità non ancora attiva.', 'info');
    btn.textContent = 'Registrati';
    btn.disabled = false;
  });
};

/* ── VOTE PAGE ── */
SkyFrost.initVote = function () {
  document.querySelectorAll('[data-vote-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = (btn.dataset.voteUrl || '').trim();
      if (!url || url.includes('YOUR_SERVER_ID')) {
        SkyFrost.toast('Link di voto non configurato. Aggiorna gli URL in vote.html.', 'error');
        return;
      }
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        SkyFrost.toast('Popup bloccato. Consenti i popup per aprire il sito di voto.', 'error');
        return;
      }
      SkyFrost.toast('Grazie per il voto! Ricompensa in arrivo 🎁', 'success');
    });
  });
};

/* ── COPY IP ── */
SkyFrost.copyIP = async function () {
  const ip = 'play.skyfrost.net';
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    SkyFrost.toast(`Copia manuale: ${ip}`, 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(ip);
    SkyFrost.toast('IP copiato negli appunti! 🎮', 'success');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    SkyFrost.toast(`Copia non riuscita. IP: ${ip}`, 'error');
  }
};
