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
const WEBSTORE_FALLBACK_URL = 'https://store.skyfrost.it';

const CATEGORY_ICONS = {
  vip: '⭐',
  rank: '👑',
  cosmetic: '🎨',
  key: '🗝️',
  crate: '🎁',
  spawner: '🥚',
  bundle: '📦',
  pet: '🐾',
  default: '❄️'
};

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function escapeHtml(value) {
  return safeText(value, '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

function truncate(text, max = 150) {
  const value = safeText(text, '');
  if (!value || value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

function formatMoney(value, currency = 'EUR') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Prezzo su Tebex';
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: safeText(currency, 'EUR'),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${safeText(currency, 'EUR')}`;
  }
}

function formatDate(value) {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(dt);
}

function categoryIcon(name) {
  const normalized = safeText(name, '').toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key !== 'default' && normalized.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

function rankClass(rank) {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return '';
}

function packagePerks(pkg) {
  if (Array.isArray(pkg?.perks) && pkg.perks.length) {
    return pkg.perks.map((perk) => safeText(perk, '')).filter(Boolean).slice(0, 5);
  }
  const desc = safeText(pkg?.description, '');
  if (!desc) return ['Pacchetto disponibile nello store ufficiale Tebex.'];
  return [truncate(desc, 120)];
}

SkyFrost.fetchTebex = async function (type, params = {}) {
  const query = new URLSearchParams({ type, ...params });
  const res = await fetch(`${API_BASE}/tebex?${query.toString()}`);
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || data?.error) {
    const details = safeText(data?.details, '');
    const message = safeText(data?.error, `HTTP ${res.status}`);
    throw new Error(details ? `${message} — ${details}` : message);
  }
  return data;
};

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

  SkyFrost.loadIndexStoreData();
};

SkyFrost.loadIndexStoreData = async function () {
  const topTable = document.getElementById('index-top-donators');
  const recentWrap = document.getElementById('index-recent-purchases');
  const featuredName = document.getElementById('index-featured-name');
  const featuredPrice = document.getElementById('index-featured-price');
  const featuredPerks = document.getElementById('index-featured-perks');
  const featuredLink = document.getElementById('index-featured-link');

  if (!topTable || !recentWrap || !featuredName || !featuredPrice || !featuredPerks || !featuredLink) return;

  function renderTop(topDonators) {
    if (!Array.isArray(topDonators) || !topDonators.length) {
      topTable.innerHTML = '<tr><td class="lb-rank">#-</td><td class="lb-name">Nessuna donazione recente</td><td class="lb-amount">--</td></tr>';
      return;
    }
    topTable.innerHTML = topDonators.slice(0, 4).map((row, idx) => {
      const rank = idx + 1;
      const amount = safeText(row.totalFormatted, formatMoney(row.total, row.currency));
      return `<tr>
        <td class="lb-rank ${rankClass(rank)}">#${rank}</td>
        <td class="lb-name">${escapeHtml(safeText(row.username, 'Player'))}</td>
        <td class="lb-amount">${escapeHtml(amount)}</td>
      </tr>`;
    }).join('');
  }

  function renderRecent(recentPurchases) {
    if (!Array.isArray(recentPurchases) || !recentPurchases.length) {
      recentWrap.innerHTML = '<div class="purchase-row"><div><div class="purchase-user">Nessun acquisto recente</div><div class="purchase-cat">Tebex</div></div><span class="purchase-item">--</span></div>';
      return;
    }
    recentWrap.innerHTML = recentPurchases.slice(0, 4).map((row) => {
      const username = escapeHtml(safeText(row.username, 'Player'));
      const category = escapeHtml(safeText(row.categoryName, 'Store'));
      const item = escapeHtml(safeText(row.packageName, 'Pacchetto'));
      const date = formatDate(row.date);
      const catLabel = date ? `${category} · ${escapeHtml(date)}` : category;
      return `<div class="purchase-row">
        <div>
          <div class="purchase-user">${username}</div>
          <div class="purchase-cat">${catLabel}</div>
        </div>
        <span class="purchase-item">${item}</span>
      </div>`;
    }).join('');
  }

  function renderFeatured(featured, storeUrl) {
    const fallbackUrl = safeText(storeUrl, WEBSTORE_FALLBACK_URL);
    const name = safeText(featured?.name, 'Pacchetto Store');
    const price = safeText(
      featured?.priceFormatted,
      formatMoney(featured?.price, featured?.currency || 'EUR')
    );
    const perks = packagePerks(featured).map((perk) => `<li>${escapeHtml(perk)}</li>`).join('');

    featuredName.textContent = name;
    featuredPrice.textContent = price;
    featuredPerks.innerHTML = perks;
    featuredLink.href = safeText(featured?.url, fallbackUrl);
  }

  try {
    const data = await SkyFrost.fetchTebex('dashboard', { topLimit: 4, recentLimit: 4 });
    renderTop(data.topDonators);
    renderRecent(data.recentPurchases);
    renderFeatured(data.featuredPackage, data.storeUrl);
  } catch (err) {
    console.error('Home Tebex fetch failed:', err);
    renderTop([]);
    renderRecent([]);
    renderFeatured(null, WEBSTORE_FALLBACK_URL);
  }
};

/* ── STORE PAGE ── */
SkyFrost.initStore = async function () {
  const categoryList = document.getElementById('store-categories');
  const productGrid = document.getElementById('product-grid');
  const totalLabel = document.getElementById('store-total-label');
  const featuredName = document.getElementById('store-featured-name');
  const featuredPrice = document.getElementById('store-featured-price');
  const featuredPerks = document.getElementById('store-featured-perks');
  const featuredLink = document.getElementById('store-featured-link');
  const featuredMeta = document.getElementById('store-featured-meta');

  if (!categoryList || !productGrid) return;

  function renderStoreFeatured(featured, storeUrl) {
    if (!featuredName || !featuredPrice || !featuredPerks || !featuredLink || !featuredMeta) return;
    const fallbackUrl = safeText(storeUrl, WEBSTORE_FALLBACK_URL);
    featuredName.textContent = safeText(featured?.name, 'Pacchetto Store');
    featuredPrice.textContent = safeText(
      featured?.priceFormatted,
      formatMoney(featured?.price, featured?.currency || 'EUR')
    );
    featuredPerks.innerHTML = packagePerks(featured)
      .map((perk) => `<li>${escapeHtml(perk)}</li>`)
      .join('');
    featuredLink.href = safeText(featured?.url, fallbackUrl);
    featuredMeta.textContent = safeText(featured?.categoryName, 'Consegna immediata');
  }

  function renderCategories(categories, products) {
    const totalCount = products.length;
    const categoryRows = Array.isArray(categories) ? categories : [];
    const allRow = `<li><a href="#" class="active" data-cat="all">🌐 Tutti i prodotti <span class="count">${totalCount}</span></a></li>`;
    const rows = categoryRows.map((cat) => {
      const slug = safeText(cat.slug, 'altro');
      const icon = categoryIcon(cat.name);
      const count = Number.isFinite(Number(cat.count))
        ? Number(cat.count)
        : products.filter((pkg) => pkg.categorySlug === slug).length;
      return `<li>
        <a href="#" data-cat="${escapeHtml(slug)}">${icon} ${escapeHtml(safeText(cat.name, 'Altro'))} <span class="count">${count}</span></a>
      </li>`;
    }).join('');
    categoryList.innerHTML = `${allRow}${rows}`;
  }

  function renderProducts(products, storeUrl) {
    if (!Array.isArray(products) || !products.length) {
      productGrid.innerHTML = `<div class="card product-card">
        <div class="product-img-placeholder">🧊</div>
        <div class="product-body">
          <div class="product-category">Store</div>
          <div class="product-name">Nessun pacchetto disponibile</div>
          <div class="product-desc">Controlla che categorie e pacchetti siano attivi nel tuo pannello Tebex.</div>
          <div class="product-footer">
            <div class="product-price">--</div>
            <a href="${escapeHtml(safeText(storeUrl, WEBSTORE_FALLBACK_URL))}" target="_blank" class="btn btn-cyan btn-sm">Apri Tebex</a>
          </div>
        </div>
      </div>`;
      return;
    }

    productGrid.innerHTML = products.map((pkg) => {
      const slug = safeText(pkg.categorySlug, 'altro');
      const category = safeText(pkg.categoryName, 'Altro');
      const name = safeText(pkg.name, 'Pacchetto');
      const desc = truncate(safeText(pkg.description, 'Pacchetto disponibile su Tebex.'), 150);
      const price = safeText(pkg.priceFormatted, formatMoney(pkg.price, pkg.currency || 'EUR'));
      const icon = categoryIcon(category);
      const link = safeText(pkg.url, safeText(storeUrl, WEBSTORE_FALLBACK_URL));
      const image = safeText(pkg.image, '');
      const media = image
        ? `<img class="product-img" src="${escapeHtml(image)}" alt="${escapeHtml(name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div class="product-img-placeholder" style="display:none;">${icon}</div>`
        : `<div class="product-img-placeholder">${icon}</div>`;

      return `<div class="card product-card" data-cat="${escapeHtml(slug)}">
        ${media}
        <div class="product-body">
          <div class="product-category">${escapeHtml(category)}</div>
          <div class="product-name">${escapeHtml(name)}</div>
          <div class="product-desc">${escapeHtml(desc)}</div>
          <div class="product-footer">
            <div class="product-price">${escapeHtml(price)}</div>
            <a href="${escapeHtml(link)}" target="_blank" class="btn btn-cyan btn-sm">Acquista</a>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function bindFilters() {
    const links = Array.from(document.querySelectorAll('.sidebar-nav a[data-cat]'));
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = safeText(link.dataset.cat, 'all');
        links.forEach((entry) => entry.classList.remove('active'));
        link.classList.add('active');
        document.querySelectorAll('.product-card[data-cat]').forEach((card) => {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
        });
      });
    });
  }

  try {
    const data = await SkyFrost.fetchTebex('store');
    const products = Array.isArray(data.packages) ? data.packages : [];
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const featured = data.featuredPackage || products[0] || null;
    const storeUrl = safeText(data.storeUrl, WEBSTORE_FALLBACK_URL);

    renderStoreFeatured(featured, storeUrl);
    renderCategories(categories, products);
    renderProducts(products, storeUrl);
    if (totalLabel) totalLabel.textContent = `${products.length} articoli`;
    bindFilters();
  } catch (err) {
    console.error('Store Tebex fetch failed:', err);
    if (totalLabel) totalLabel.textContent = '0 articoli';
    renderStoreFeatured(null, WEBSTORE_FALLBACK_URL);
    categoryList.innerHTML = '<li><a href="#" class="active" data-cat="all">🌐 Tutti i prodotti <span class="count">0</span></a></li>';
    renderProducts([], WEBSTORE_FALLBACK_URL);
    bindFilters();
  }
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
    const order    = ['Owner', 'Sr. Admin', 'Admin', 'Staff'];
    const dotClass = { Owner: 'owner', 'Sr. Admin': 'sradmin', Admin: 'admin', Staff: 'staff' };

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
  const ip = 'play.Skyfrost.it';
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
