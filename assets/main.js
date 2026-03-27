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
const NEWS_JSON_URL = '/assets/news.json';
const AUTH_API = `${API_BASE}/auth`;
const TICKETS_API = `${API_BASE}/tickets`;
const STATUS_API = `${API_BASE}/status`;

const CATEGORY_ICONS = {
  survival: '🌲',
  faction: '⚔️',
  kitpvp: '🛡️',
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

const FALLBACK_INDEX_NEWS = [
  {
    badge: 'Aggiornamento',
    badgeClass: 'badge-cyan',
    title: 'Benvenuto sul nuovo sito di SkyFrost!',
    description: 'Abbiamo completamente rinnovato il portale. Nuova UI, store migliorato, pagina staff aggiornata e dashboard interattiva.',
    author: 'SkyFrostOwner',
    date: '2026-02-20'
  },
  {
    badge: 'Patch 1.3',
    badgeClass: 'badge-cyan',
    title: 'Nuove zone e bilanciamento classi',
    description: 'Tre nuove zone esplorabili, decine di mob inediti e sistema di bilanciamento per le classi. Nuovi boss e drop esclusivi.',
    author: 'CodeFrost',
    date: '2026-02-18'
  },
  {
    badge: 'Evento',
    badgeClass: 'badge-gold',
    title: 'Evento Primavera — Ricompense esclusive',
    description: "Quest stagionali, fiori rari e cosmetic esclusivi disponibili solo per un periodo limitato. Non perdere l'occasione!",
    author: 'ArcticAdmin',
    date: '2026-02-15'
  },
  {
    badge: 'Manutenzione',
    badgeClass: 'badge-green',
    title: 'Manutenzione programmata — 5 marzo',
    description: 'Il server sarà offline dalle 03:00 alle 05:00 per aggiornamenti infrastrutturali. Ci scusiamo per il disagio.',
    author: 'SkyFrostOwner',
    date: '2026-02-10'
  },
  {
    badge: 'Sistema',
    badgeClass: 'badge-cyan',
    title: 'Nuovo sistema di crafting introdotto',
    description: 'Il rework del crafting è ora live: ricette più intuitive, materiali ribilanciati e nuovi oggetti leggendari.',
    author: 'CodeFrost',
    date: '2026-02-08'
  },
  {
    badge: 'Evento',
    badgeClass: 'badge-gold',
    title: 'Torneo PvP — Iscrizioni aperte',
    description: 'Il primo torneo PvP ufficiale di SkyFrost è ufficialmente aperto. Premi esclusivi per i top 3.',
    author: 'ArcticAdmin',
    date: '2026-02-05'
  }
];

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

function decodeHtmlEntities(value) {
  const txt = safeText(value, '');
  if (!txt) return '';
  return txt
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(value) {
  const txt = safeText(value, '');
  if (!txt) return '';
  return decodeHtmlEntities(
    txt
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function plainDescription(value, fallback = '') {
  const text = stripHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
  return text || fallback;
}

function humanizeSlug(slug) {
  return safeText(slug, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function packageCategorySlug(pkg) {
  return safeText(pkg?.rootCategorySlug, safeText(pkg?.categorySlug, 'altro'));
}

function packageCategoryName(pkg) {
  return safeText(pkg?.rootCategoryName, safeText(pkg?.categoryName, 'Altro'));
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
  const desc = plainDescription(pkg?.description, '');
  if (!desc) return ['Pacchetto disponibile nello store ufficiale Tebex.'];
  return [truncate(desc, 120)];
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function authorInitials(value) {
  const text = safeText(value, '');
  if (!text) return 'SF';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

function normalizeBadgeClass(value) {
  const raw = safeText(value, 'badge-cyan');
  const allowed = new Set(['badge-cyan', 'badge-gold', 'badge-green', 'badge-red', 'badge-dim']);
  return allowed.has(raw) ? raw : 'badge-cyan';
}

function newsItemsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeNewsItem(raw, index = 0) {
  const author = safeText(raw?.author, 'SkyFrost');
  const dateLabel = safeText(raw?.dateLabel, formatDate(raw?.date));

  return {
    badge: safeText(raw?.badge, 'Aggiornamento'),
    badgeClass: normalizeBadgeClass(raw?.badgeClass),
    title: safeText(raw?.title, `Annuncio ${index + 1}`),
    description: safeText(raw?.description, 'Nuovo aggiornamento disponibile.'),
    author,
    authorInitials: safeText(raw?.authorInitials, authorInitials(author)),
    dateLabel: safeText(dateLabel, '-')
  };
}

function renderNewsCard(newsItem) {
  return `<article class="card news-card card-body">
    <span class="badge ${escapeHtml(newsItem.badgeClass)}">${escapeHtml(newsItem.badge)}</span>
    <h3>${escapeHtml(newsItem.title)}</h3>
    <p>${escapeHtml(newsItem.description)}</p>
    <div class="news-meta">
      <div class="news-author">
        <div class="author-avatar">${escapeHtml(newsItem.authorInitials)}</div>
        <span>${escapeHtml(newsItem.author)}</span>
      </div>
      <span>${escapeHtml(newsItem.dateLabel)}</span>
    </div>
  </article>`;
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

/* ── ONLINE COUNTER ── */
SkyFrost.loadServerStatus = function (el) {
  if (!el) return;
  const REFRESH_MS = 30000;

  function renderCount(value) {
    const num = Number(value);
    el.textContent = Number.isFinite(num) && num >= 0 ? String(Math.floor(num)) : 'N/D';
  }

  async function refresh() {
    try {
      const res = await fetch(STATUS_API, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderCount(data?.onlinePlayers);
    } catch (err) {
      console.error('Server status fetch failed:', err);
      renderCount(null);
    }
  }

  renderCount(null);
  void refresh();
  setInterval(() => {
    if (document.hidden) return;
    void refresh();
  }, REFRESH_MS);
};

/* ── DISCORD COUNTER ── */
SkyFrost.loadDiscordStatus = function (el) {
  if (!el) return;
  const REFRESH_MS = 60000; // 1 minuto, come la cache API

  function renderCount(value) {
    const num = Number(value);
    el.textContent = Number.isFinite(num) && num >= 0 ? String(Math.floor(num)) : 'N/D';
  }

  async function refresh() {
    try {
      const res = await fetch(`${API_BASE}/discord`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderCount(data?.guild?.online);
    } catch (err) {
      console.error('Discord status fetch failed:', err);
      renderCount(null);
    }
  }

  renderCount(null);
  void refresh();
  setInterval(() => {
    if (document.hidden) return;
    void refresh();
  }, REFRESH_MS);
};

/* ── INDEX PAGE ── */
SkyFrost.initIndex = function () {
  SkyFrost.loadDiscordStatus(document.getElementById('discord-online-count'));
  document.getElementById('copy-ip-btn')?.addEventListener('click', () => {
    void SkyFrost.copyIP();
  });
  void SkyFrost.initIndexNews();
  SkyFrost.loadIndexStoreData();
};

SkyFrost.fetchNews = async function () {
  const res = await fetch(NEWS_JSON_URL, { cache: 'no-store' });
  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return newsItemsFromPayload(payload)
    .map((entry, index) => normalizeNewsItem(entry, index))
    .filter((entry) => safeText(entry.title, '') && safeText(entry.description, ''));
};

SkyFrost.initIndexNews = async function () {
  const pagesWrap = document.getElementById('index-news-pages');
  const dotsWrap = document.getElementById('news-dots');
  const pagination = document.getElementById('news-pagination');
  const prevBtn = document.getElementById('news-prev');
  const nextBtn = document.getElementById('news-next');

  if (!pagesWrap || !dotsWrap || !pagination || !prevBtn || !nextBtn) return;

  let pages = [];
  let dots = [];
  let current = 0;

  function showPage(index) {
    if (!pages.length) return;
    const nextIndex = (index + pages.length) % pages.length;
    pages.forEach((page, i) => { page.style.display = i === nextIndex ? '' : 'none'; });
    dots.forEach((dot, i) => { dot.classList.toggle('active', i === nextIndex); });
    current = nextIndex;
  }

  function render(newsItems) {
    const rows = Array.isArray(newsItems) && newsItems.length
      ? newsItems
      : [normalizeNewsItem({
        badge: 'Avviso',
        badgeClass: 'badge-dim',
        title: 'Nessun annuncio disponibile',
        description: 'Aggiungi contenuti in assets/news.json per mostrare le news in home.',
        author: 'SkyFrost'
      })];

    const chunked = chunkArray(rows, 3);
    pagesWrap.innerHTML = chunked.map((chunk, pageIndex) => `<div class="news-page"${pageIndex === 0 ? '' : ' style="display:none;"'}>
      <div class="grid-3">${chunk.map((item) => renderNewsCard(item)).join('')}</div>
    </div>`).join('');

    dotsWrap.innerHTML = chunked.map((_, idx) => `<button
      class="page-dot${idx === 0 ? ' active' : ''}"
      type="button"
      aria-label="Pagina news ${idx + 1}"
      style="width:8px;height:8px;border-radius:50%;border:none;background:var(--border);cursor:pointer;transition:background .2s;"
    ></button>`).join('');

    pages = Array.from(pagesWrap.querySelectorAll('.news-page'));
    dots = Array.from(dotsWrap.querySelectorAll('.page-dot'));
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => showPage(idx));
    });

    const multiplePages = pages.length > 1;
    pagination.style.display = multiplePages ? 'flex' : 'none';
    prevBtn.disabled = !multiplePages;
    nextBtn.disabled = !multiplePages;
    showPage(0);
  }

  prevBtn.onclick = () => showPage(current - 1);
  nextBtn.onclick = () => showPage(current + 1);

  try {
    const newsItems = await SkyFrost.fetchNews();
    if (!newsItems.length) throw new Error('Nessuna news valida trovata');
    render(newsItems);
  } catch (err) {
    console.warn('News feed fallback:', err);
    render(FALLBACK_INDEX_NEWS.map((item, index) => normalizeNewsItem(item, index)));
  }
};

SkyFrost.loadIndexStoreData = async function () {
  const topTable = document.getElementById('index-top-donators');
  const recentWrap = document.getElementById('index-recent-purchases');
  const featuredName = document.getElementById('index-featured-name');
  const featuredPrice = document.getElementById('index-featured-price');
  const featuredPerks = document.getElementById('index-featured-perks');
  const featuredLink = document.getElementById('index-featured-link');

  if (!topTable || !recentWrap || !featuredName || !featuredPrice || !featuredPerks || !featuredLink) return;

  function firstWarningMessage(warnings) {
    if (!Array.isArray(warnings) || !warnings.length) return '';
    return truncate(safeText(warnings[0], ''), 80);
  }

  function renderTop(topDonators, warningMessage = '') {
    if (!Array.isArray(topDonators) || !topDonators.length) {
      const label = warningMessage || 'Nessuna donazione recente';
      topTable.innerHTML = `<tr><td class="lb-rank">#-</td><td class="lb-name">${escapeHtml(label)}</td><td class="lb-amount">--</td></tr>`;
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

  function renderRecent(recentPurchases, warningMessage = '') {
    if (!Array.isArray(recentPurchases) || !recentPurchases.length) {
      const label = warningMessage || 'Nessun acquisto recente';
      recentWrap.innerHTML = `<div class="purchase-row"><div><div class="purchase-user">${escapeHtml(label)}</div><div class="purchase-cat">Tebex</div></div><span class="purchase-item">--</span></div>`;
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
    const warningMessage = firstWarningMessage(data?.warnings);
    if (Array.isArray(data?.warnings) && data.warnings.length) {
      console.warn('Tebex dashboard warnings:', data.warnings, data?.diagnostics || null);
    }
    renderTop(data.topDonators, warningMessage);
    renderRecent(data.recentPurchases, warningMessage);
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

  function categoryHref(cat) {
    const slug = safeText(cat, 'all');
    if (slug === 'all') return '/store';
    return `/store?cat=${encodeURIComponent(slug)}`;
  }

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
    featuredMeta.textContent = safeText(
      featured?.rootCategoryName,
      safeText(featured?.categoryName, 'Consegna immediata')
    );
  }

  function renderCategories(categories, products) {
    const totalCount = products.length;
    const categoryRows = Array.isArray(categories) ? categories : [];
    const countsBySlug = products.reduce((acc, pkg) => {
      const slug = packageCategorySlug(pkg);
      if (!slug) return acc;
      acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    }, {});
    const allRow = `<li><a href="${categoryHref('all')}" class="active" data-cat="all">🌐 Tutti i prodotti <span class="count">${totalCount}</span></a></li>`;
    const merged = new Map();

    categoryRows.forEach((cat) => {
      const slug = safeText(cat.slug, 'altro');
      const name = safeText(cat.name, humanizeSlug(slug) || 'Altro');
      const count = Number.isFinite(Number(cat.count))
        ? Number(cat.count)
        : (countsBySlug[slug] || 0);
      const order = Number.isFinite(Number(cat.order))
        ? Number(cat.order)
        : Number.MAX_SAFE_INTEGER;
      const prev = merged.get(slug);
      if (!prev) {
        merged.set(slug, {
          slug,
          name,
          order,
          count: Math.max(count, countsBySlug[slug] || 0)
        });
        return;
      }
      prev.count = Math.max(prev.count, count, countsBySlug[slug] || 0);
    });

    Object.entries(countsBySlug).forEach(([slug, count]) => {
      if (merged.has(slug)) return;
      merged.set(slug, {
        slug,
        name: humanizeSlug(slug) || 'Altro',
        order: Number.MAX_SAFE_INTEGER,
        count
      });
    });

    const rows = Array.from(merged.values())
      .filter((cat) => cat.count > 0)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'it'))
      .map((cat) => {
        const icon = categoryIcon(cat.name);
        return `<li>
        <a href="${categoryHref(cat.slug)}" data-cat="${escapeHtml(cat.slug)}">${icon} ${escapeHtml(cat.name)} <span class="count">${cat.count}</span></a>
      </li>`;
      })
      .join('');

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
            <a href="${escapeHtml(safeText(storeUrl, WEBSTORE_FALLBACK_URL))}" target="_blank" rel="noopener noreferrer" class="btn btn-cyan btn-sm">Apri Tebex</a>
          </div>
        </div>
      </div>`;
      return;
    }

    productGrid.innerHTML = products.map((pkg) => {
      const slug = packageCategorySlug(pkg);
      const category = packageCategoryName(pkg);
      const name = safeText(pkg.name, 'Pacchetto');
      const desc = truncate(
        plainDescription(pkg.description, 'Pacchetto disponibile su Tebex.'),
        150
      );
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
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn btn-cyan btn-sm">Acquista</a>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function bindFilters(initialCat = 'all') {
    const links = Array.from(document.querySelectorAll('.sidebar-nav a[data-cat]'));
    if (!links.length) return;

    const validCats = new Set(links.map((link) => safeText(link.dataset.cat, 'all')));

    function applyFilter(cat, syncUrl) {
      const currentCat = validCats.has(cat) ? cat : 'all';
      links.forEach((entry) => entry.classList.toggle('active', safeText(entry.dataset.cat, 'all') === currentCat));
      document.querySelectorAll('.product-card[data-cat]').forEach((card) => {
        card.style.display = (currentCat === 'all' || card.dataset.cat === currentCat) ? '' : 'none';
      });
      if (syncUrl) {
        window.history.replaceState({}, '', categoryHref(currentCat));
      }
    }

    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = safeText(link.dataset.cat, 'all');
        applyFilter(cat, true);
      });
    });

    applyFilter(safeText(initialCat, 'all'), false);
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
    const initialCat = safeText(new URLSearchParams(window.location.search).get('cat'), 'all');
    bindFilters(initialCat);
  } catch (err) {
    console.error('Store Tebex fetch failed:', err);
    if (totalLabel) totalLabel.textContent = '0 articoli';
    renderStoreFeatured(null, WEBSTORE_FALLBACK_URL);
    categoryList.innerHTML = `<li><a href="${categoryHref('all')}" class="active" data-cat="all">🌐 Tutti i prodotti <span class="count">0</span></a></li>`;
    renderProducts([], WEBSTORE_FALLBACK_URL);
    bindFilters();
  }
};

/* ── STAFF PAGE ── */
SkyFrost.initStaff = async function () {
  const container = document.getElementById('staff-container');
  if (!container) return;
  const STAFF_REFRESH_MS = 30000;
  let hasRendered = false;
  let requestInFlight = false;

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

  async function loadStaff(showErrorCard) {
    if (requestInFlight) return;
    requestInFlight = true;
    try {
      const res = await fetch(`${API_BASE}/discord`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // La risposta ora è { staff: {...}, guild: {...} }. Usiamo data.staff.
      renderStaff(data.staff || data);
      hasRendered = true;
    } catch (err) {
      console.error('Staff fetch failed:', err);
      if (!hasRendered || showErrorCard) {
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
    } finally {
      requestInFlight = false;
    }
  }

  await loadStaff(true);
  if (!container.dataset.staffRealtimeBound) {
    container.dataset.staffRealtimeBound = '1';
    setInterval(() => {
      if (document.hidden) return;
      void loadStaff(false);
    }, STAFF_REFRESH_MS);
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

/* ── AUTH (DISCORD) ── */
function authErrorMessage(code) {
  const messages = {
    state_non_valido: 'Sessione OAuth scaduta o non valida. Riprova il login.',
    configurazione_auth_mancante: 'Configurazione OAuth Discord incompleta sul server.',
    utente_non_nel_server: 'Per usare il supporto devi essere nel server Discord.',
    errore_verifica_gilda: 'Impossibile verificare la tua presenza nella gilda Discord.',
    oauth_fallito: 'Login Discord fallito. Riprova tra qualche secondo.'
  };
  return messages[code] || 'Errore durante il login Discord.';
}

SkyFrost.fetchAuthSession = async function () {
  const res = await fetch(`${AUTH_API}?action=session`, {
    credentials: 'include'
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401) return { authenticated: false };
  if (!res.ok) {
    const message = safeText(data?.error, `HTTP ${res.status}`);
    throw new Error(message);
  }

  return {
    authenticated: Boolean(data?.authenticated),
    user: data?.user || null
  };
};

SkyFrost.startDiscordLogin = function () {
  window.location.href = `${AUTH_API}?action=start`;
};

SkyFrost.logoutDiscord = async function () {
  const res = await fetch(`${AUTH_API}?action=logout`, {
    method: 'POST',
    credentials: 'include'
  });

  if (!res.ok) {
    let payload = {};
    try { payload = await res.json(); } catch { payload = {}; }
    throw new Error(safeText(payload?.error, `HTTP ${res.status}`));
  }
};

SkyFrost.initLogin = async function () {
  const loginBtn = document.getElementById('discord-login-btn');
  const statusEl = document.getElementById('login-status');
  const titleEl = document.getElementById('login-title');
  const params = new URLSearchParams(window.location.search);

  loginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    SkyFrost.startDiscordLogin();
  });

  const errorCode = safeText(params.get('error'), '');
  if (errorCode) {
    const message = authErrorMessage(errorCode);
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.classList.add('error');
    }
    SkyFrost.toast(message, 'error');
  }

  if (params.get('logout') === '1') {
    SkyFrost.toast('Disconnessione completata.', 'info');
  }

  try {
    const session = await SkyFrost.fetchAuthSession();
    if (!session.authenticated || !session.user) return;

    const displayName = safeText(session.user.displayName, safeText(session.user.username, 'Utente'));
    if (titleEl) titleEl.textContent = `Sei già connesso, ${displayName}`;
    if (statusEl) {
      statusEl.textContent = `Sessione attiva come ${displayName}. Reindirizzamento al supporto...`;
      statusEl.classList.remove('error');
      statusEl.classList.add('success');
    }

    setTimeout(() => {
      window.location.href = '/supporto';
    }, 900);
  } catch (err) {
    console.error('Auth session check failed:', err);
    if (statusEl && !errorCode) {
      statusEl.textContent = `Impossibile verificare la sessione: ${safeText(err.message, 'errore')}`;
      statusEl.classList.add('error');
    }
  }
};

SkyFrost.initSupport = async function () {
  const form = document.getElementById('support-ticket-form');
  if (!form) return;

  const stateEl = document.getElementById('support-auth-state');
  const nameEl = document.getElementById('support-name');
  const userIdEl = document.getElementById('support-user-id');
  const avatarEl = document.getElementById('support-avatar');
  const loginBtn = document.getElementById('support-login-btn');
  const logoutBtn = document.getElementById('support-logout-btn');
  const submitBtn = form.querySelector('[type=submit]');
  const defaultSubmitLabel = submitBtn ? submitBtn.textContent : 'Invia Ticket su Discord';

  let currentUser = null;

  function setStatus(message, type = '') {
    if (!stateEl) return;
    stateEl.textContent = message;
    stateEl.classList.remove('error', 'success');
    if (type === 'error') stateEl.classList.add('error');
    if (type === 'success') stateEl.classList.add('success');
  }

  function setFormEnabled(enabled) {
    form.querySelectorAll('input, textarea, select, button').forEach((el) => {
      el.disabled = !enabled;
    });
  }

  function renderGuest() {
    currentUser = null;
    setStatus('Devi effettuare il login Discord per inviare ticket.', 'error');
    if (nameEl) nameEl.textContent = 'Non autenticato';
    if (userIdEl) userIdEl.textContent = 'Accedi con Discord per inviare ticket.';
    if (avatarEl) avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    setFormEnabled(false);
  }

  function renderUser(user) {
    currentUser = user;
    const displayName = safeText(user.displayName, safeText(user.username, 'Utente'));
    setStatus(`Connesso come ${displayName}`, 'success');
    if (nameEl) nameEl.textContent = displayName;
    if (userIdEl) userIdEl.textContent = `ID Discord: ${safeText(user.id, '-')}`;
    if (avatarEl) avatarEl.src = safeText(user.avatar, 'https://cdn.discordapp.com/embed/avatars/0.png');
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
    setFormEnabled(true);
  }

  loginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    SkyFrost.startDiscordLogin();
  });

  logoutBtn?.addEventListener('click', async () => {
    if (!logoutBtn) return;
    logoutBtn.disabled = true;
    const previousLabel = logoutBtn.textContent;
    logoutBtn.textContent = 'Disconnessione...';
    try {
      await SkyFrost.logoutDiscord();
      SkyFrost.toast('Disconnessione completata.', 'info');
      renderGuest();
    } catch (err) {
      console.error('Discord logout failed:', err);
      SkyFrost.toast(safeText(err.message, 'Logout fallito.'), 'error');
    } finally {
      logoutBtn.textContent = previousLabel;
      logoutBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      SkyFrost.toast('Effettua prima il login Discord.', 'error');
      return;
    }

    const category = safeText(document.getElementById('ticket-category')?.value, 'Generale');
    const priority = safeText(document.getElementById('ticket-priority')?.value, 'Normale');
    const subject = safeText(document.getElementById('ticket-subject')?.value, '');
    const message = safeText(document.getElementById('ticket-message')?.value, '');

    if (!subject) {
      SkyFrost.toast('Inserisci un oggetto per il ticket.', 'error');
      return;
    }
    if (message.length < 20) {
      SkyFrost.toast('La descrizione deve avere almeno 20 caratteri.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Invio ticket...';
    }

    try {
      const res = await fetch(TICKETS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, priority, subject, message })
      });

      let data = {};
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        throw new Error(safeText(data?.error, `HTTP ${res.status}`));
      }

      const ticketId = safeText(data?.ticketId, '');
      SkyFrost.toast(
        ticketId ? `Ticket inviato con successo (${ticketId}).` : 'Ticket inviato con successo.',
        'success'
      );
      form.reset();
      document.getElementById('ticket-category').value = 'Generale';
      document.getElementById('ticket-priority').value = 'Normale';
    } catch (err) {
      console.error('Ticket submit failed:', err);
      SkyFrost.toast(safeText(err.message, 'Invio ticket fallito.'), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultSubmitLabel;
      }
    }
  });

  const params = new URLSearchParams(window.location.search);
  const loginError = safeText(params.get('error'), '');
  if (params.get('login') === 'ok') {
    SkyFrost.toast('Login Discord completato.', 'success');
  }
  if (loginError) {
    SkyFrost.toast(authErrorMessage(loginError), 'error');
  }

  setStatus('Verifica sessione Discord in corso...');
  setFormEnabled(false);

  try {
    const session = await SkyFrost.fetchAuthSession();
    if (session.authenticated && session.user) {
      renderUser(session.user);
    } else {
      renderGuest();
    }
  } catch (err) {
    console.error('Support session fetch failed:', err);
    renderGuest();
    setStatus(`Errore sessione: ${safeText(err.message, 'sconosciuto')}`, 'error');
  }
};

/* ── LICENSES PAGE ── */
SkyFrost.initLicenses = async function () {
  const LICENSES_API = `${API_BASE}/licenses`;

  const validateKeyInput = document.getElementById('validate-key');
  const validateBtn = document.getElementById('validate-btn');
  const validateResult = document.getElementById('validate-result');

  const authState = document.getElementById('license-auth-state');
  const adminPanel = document.getElementById('admin-panel');

  const genFingerprint = document.getElementById('gen-fingerprint');
  const genHostname = document.getElementById('gen-hostname');
  const genBtn = document.getElementById('gen-btn');
  const genResult = document.getElementById('gen-result');
  const tableWrap = document.getElementById('license-table-wrap');
  const filterStatus = document.getElementById('filter-status');

  /* ── Validate (public) ── */
  async function validateLicense() {
    const fingerprint = safeText(validateKeyInput?.value, '');
    if (!fingerprint) {
      SkyFrost.toast('Inserisci un fingerprint.', 'error');
      return;
    }

    if (validateBtn) {
      validateBtn.disabled = true;
      validateBtn.textContent = 'Verifica…';
    }

    try {
      const res = await fetch(`${LICENSES_API}?action=validate&fingerprint=${encodeURIComponent(fingerprint)}`);
      const data = await res.json();

      if (validateResult) {
        validateResult.style.display = '';
        if (data.valid && data.status === 'approved') {
          validateResult.innerHTML = `
            <div class="license-result license-valid">
              <span class="license-result-icon"><i class="bi bi-patch-check-fill"></i></span>
              <div>
                <strong>Licenza Approvata</strong>
                <div style="font-size:.82rem;color:var(--text-dim);margin-top:.25rem;">
                  Hostname: <strong style="color:var(--frost);">${escapeHtml(data.hostname || '-')}</strong>
                  ${data.requestedAt ? ` · Richiesta: ${escapeHtml(formatDate(data.requestedAt))}` : ''}
                </div>
              </div>
            </div>`;
        } else {
          const reasons = {
            not_found: 'Licenza non trovata nel sistema.',
            revoked: `Licenza revocata. Hostname: ${escapeHtml(data.hostname || '-')}`,
            pending: `Licenza in attesa di approvazione. Hostname: ${escapeHtml(data.hostname || '-')}`
          };
          validateResult.innerHTML = `
            <div class="license-result license-invalid">
              <span class="license-result-icon"><i class="bi ${data.reason === 'pending' ? 'bi-hourglass-split' : 'bi-x-octagon-fill'}"></i></span>
              <div>
                <strong>Licenza ${data.reason === 'pending' ? 'In Attesa' : 'Non Valida'}</strong>
                <div style="font-size:.82rem;color:var(--text-dim);margin-top:.25rem;">
                  ${reasons[data.reason] || 'Fingerprint non riconosciuto.'}
                </div>
              </div>
            </div>`;
        }
      }
    } catch (err) {
      console.error('License validate failed:', err);
      SkyFrost.toast(safeText(err.message, 'Errore durante la verifica.'), 'error');
    } finally {
      if (validateBtn) {
        validateBtn.disabled = false;
        validateBtn.textContent = 'Verifica';
      }
    }
  }

  validateBtn?.addEventListener('click', validateLicense);
  validateKeyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') validateLicense();
  });

  /* ── Admin auth ── */
  function setAuthStatus(message, type = '') {
    if (!authState) return;
    authState.textContent = message;
    authState.classList.remove('error', 'success');
    if (type === 'error') authState.classList.add('error');
    if (type === 'success') authState.classList.add('success');
  }

  async function loadLicenseList() {
    if (!tableWrap) return;
    tableWrap.innerHTML = '<p style="color:var(--text-dim);font-size:.85rem;">Caricamento…</p>';

    const statusFilter = safeText(filterStatus?.value, '');
    const queryParams = new URLSearchParams({ action: 'list' });
    if (statusFilter) queryParams.append('status', statusFilter);

    try {
      const res = await fetch(`${LICENSES_API}?${queryParams.toString()}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(safeText(data.error, `HTTP ${res.status}`));
      }

      const licenses = Array.isArray(data.licenses) ? data.licenses : [];
      if (!licenses.length) {
        tableWrap.innerHTML = '<p style="color:var(--text-dim);font-size:.85rem;padding:.5rem;">Nessuna licenza trovata.</p>';
        return;
      }

      function getStatusBadge(status) {
        if (status === 'approved') return '<span class="badge badge-green">Approvata</span>';
        if (status === 'pending') return '<span class="badge badge-gold">In Attesa</span>';
        return '<span class="badge badge-red">Revocata</span>';
      }

      tableWrap.innerHTML = `
        <table class="license-table">
          <thead>
            <tr>
              <th>Fingerprint</th>
              <th>Hostname</th>
              <th>Stato</th>
              <th>Data Richiesta</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${licenses.map(l => `<tr class="${l.status !== 'approved' ? 'license-revoked' : ''}">
              <td><code class="license-key-cell" title="${escapeHtml(l.fingerprint)}">${escapeHtml(truncate(l.fingerprint, 16))}</code></td>
              <td>${escapeHtml(l.hostname || '-')}</td>
              <td>${getStatusBadge(l.status)}</td>
              <td style="font-size:.8rem;color:var(--text-dim);">${escapeHtml(formatDate(l.requested_at))}</td>
              <td>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  ${l.status === 'pending'
                    ? `<button type="button" class="btn btn-ghost btn-sm license-approve-btn" data-fingerprint="${escapeHtml(l.fingerprint)}">Approva</button>
                       <button type="button" class="btn btn-ghost btn-sm license-revoke-btn" data-fingerprint="${escapeHtml(l.fingerprint)}">Revoca</button>`
                    : ''}
                  ${l.status === 'approved'
                    ? `<button type="button" class="btn btn-ghost btn-sm license-revoke-btn" data-fingerprint="${escapeHtml(l.fingerprint)}">Revoca</button>`
                    : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`;

      /* Bind approve buttons */
      tableWrap.querySelectorAll('.license-approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const fingerprint = btn.dataset.fingerprint;
          btn.disabled = true;
          btn.textContent = '…';

          try {
            const res = await fetch(LICENSES_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ action: 'approve', fingerprint })
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(safeText(data.error, 'Errore approvazione'));

            SkyFrost.toast('Licenza approvata.', 'success');
            await loadLicenseList();
          } catch (err) {
            console.error('License approve failed:', err);
            SkyFrost.toast(safeText(err.message, 'Errore approvazione.'), 'error');
            btn.disabled = false;
            btn.textContent = 'Approva';
          }
        });
      });

      /* Bind revoke buttons */
      tableWrap.querySelectorAll('.license-revoke-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const fingerprint = btn.dataset.fingerprint;
          if (!confirm('Sicuro di voler revocare questa licenza?')) return;

          btn.disabled = true;
          btn.textContent = '…';

          try {
            const res = await fetch(LICENSES_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ action: 'revoke', fingerprint })
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(safeText(data.error, 'Errore revoca'));

            SkyFrost.toast('Licenza revocata.', 'success');
            await loadLicenseList();
          } catch (err) {
            console.error('License revoke failed:', err);
            SkyFrost.toast(safeText(err.message, 'Errore revoca.'), 'error');
            btn.disabled = false;
            btn.textContent = 'Revoca';
          }
        });
      });
    } catch (err) {
      console.error('License list failed:', err);
      tableWrap.innerHTML = `<p style="color:var(--text-dim);font-size:.85rem;padding:.5rem;">Errore: ${escapeHtml(safeText(err.message, 'sconosciuto'))}</p>`;
    }
  }

  filterStatus?.addEventListener('change', loadLicenseList);

  /* ── Insert ── */
  async function insertLicense() {
    const fingerprint = safeText(genFingerprint?.value, '');
    const hostname = safeText(genHostname?.value, '');

    if (!fingerprint) {
      SkyFrost.toast('Inserisci il fingerprint.', 'error');
      return;
    }
    if (fingerprint.length > 64) {
      SkyFrost.toast('Fingerprint troppo lungo.', 'error');
      return;
    }

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.textContent = 'Inserimento…';
    }

    try {
      const res = await fetch(LICENSES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'insert', fingerprint, hostname })
      });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(safeText(data.error, `HTTP ${res.status}`));

      if (genResult) {
        genResult.style.display = '';
        genResult.innerHTML = `
          <div class="license-result license-valid">
            <span class="license-result-icon">⏳</span>
            <div>
              <strong>Licenza Inserita!</strong>
              <div style="font-size:.8rem;color:var(--text-dim);margin-top:.25rem;">
                Ora è nello stato In Attesa. Approvala dalla tabella.
              </div>
            </div>
          </div>`;
      }

      if (genFingerprint) genFingerprint.value = '';
      if (genHostname) genHostname.value = '';
      SkyFrost.toast('Licenza inserita in attesa.', 'success');
      await loadLicenseList();
    } catch (err) {
      console.error('License insert failed:', err);
      SkyFrost.toast(safeText(err.message, 'Errore inserimento.'), 'error');
    } finally {
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.textContent = 'Inserisci';
      }
    }
  }

  genBtn?.addEventListener('click', insertLicense);

  /* ── Init: check session ── */
  try {
    const session = await SkyFrost.fetchAuthSession();
    if (session.authenticated && session.user) {
      const displayName = safeText(session.user.displayName, safeText(session.user.username, 'Utente'));
      setAuthStatus(`Connesso come ${displayName}. Pannello admin sbloccato.`, 'success');
      if (adminPanel) adminPanel.style.display = '';
      await loadLicenseList();
    } else {
      setAuthStatus('Devi effettuare il login Discord per accedere al pannello admin.', 'error');
      if (adminPanel) adminPanel.style.display = 'none';
    }
  } catch (err) {
    console.error('License auth check failed:', err);
    setAuthStatus('Errore verifica sessione.', 'error');
    if (adminPanel) adminPanel.style.display = 'none';
  }
};

/* ── VOTE PAGE ── */
SkyFrost.initVote = function () {
  document.querySelectorAll('[data-vote-url]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = (btn.dataset.voteUrl || '').trim();
      if (!url || url.includes('YOUR_SERVER_ID')) {
        SkyFrost.toast('Link di voto non configurato. Aggiorna gli URL nella pagina Vota.', 'error');
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
  const ip = 'play.skyfrost.it';
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
