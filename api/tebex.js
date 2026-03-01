/**
 * SKYFROST — api/tebex.js
 *
 * Endpoints:
 *   GET /api/tebex?type=categories
 *   GET /api/tebex?type=packages
 *   GET /api/tebex?type=packages&category=ID_CATEGORIA
 *   GET /api/tebex?type=package&id=ID_PACCHETTO
 *   GET /api/tebex?type=store
 *   GET /api/tebex?type=payments&limit=20
 *   GET /api/tebex?type=dashboard&topLimit=4&recentLimit=4
 *
 * Variabili api/.env:
 *   TEBEX_WEBSTORE_TOKEN=...
 *   TEBEX_PUBLIC_TOKEN=...
 *   TEBEX_PRIVATE_KEY=...
 */

'use strict';

const { applyCors, isAllowedOrigin } = require('./auth-utils.cjs');

const HEADLESS_BASE = 'https://headless.tebex.io/api';
const PLUGIN_BASE = 'https://plugin.tebex.io';
const DEFAULT_STORE_URL = 'https://store.skyfrost.it';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const clean = value.replace(',', '.').trim();
    const parsed = Number.parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function safeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return fallback;
  const str = String(value).trim();
  return str || fallback;
}

function slugify(value, fallback = 'altro') {
  const base = safeText(value, fallback).toLowerCase();
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function shortText(value, maxLen = 180) {
  const txt = safeText(value, '');
  if (!txt) return '';
  return txt.length > maxLen ? `${txt.slice(0, maxLen - 1)}...` : txt;
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

function cleanDescription(value, maxLen = 180) {
  const txt = safeText(value, '');
  if (!txt) return '';
  const plain = decodeHtmlEntities(
    txt
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return shortText(plain, maxLen);
}

function getIn(obj, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
}

function pick(obj, paths, fallback = undefined) {
  for (const path of paths) {
    const value = getIn(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function formatMoney(value, currency = 'EUR') {
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: safeText(currency, 'EUR'),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${safeText(currency, 'EUR')}`;
  }
}

function collection(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeSidebarPayload(payload) {
  const normalized = {
    topCustomer: null,
    recentPayments: [],
    featuredPackage: null
  };

  if (!payload || typeof payload !== 'object') return normalized;

  const legacyTop = pick(payload, ['top_customer'], null);
  const legacyRecent = collection(payload, ['recent_payments']);
  const legacyFeatured = pick(payload, ['featured_package'], null);
  if (legacyTop || legacyRecent.length || legacyFeatured) {
    normalized.topCustomer = legacyTop || null;
    normalized.recentPayments = legacyRecent;
    normalized.featuredPackage = legacyFeatured || null;
    return normalized;
  }

  const modules = collection(payload, ['modules', 'items', 'data']);
  for (const module of modules) {
    if (!module || typeof module !== 'object') continue;

    const moduleType = safeText(
      pick(module, ['type', 'module', 'data.type'], ''),
      ''
    ).toLowerCase();

    const data = Object.prototype.hasOwnProperty.call(module, 'data')
      ? module.data
      : module;
    const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? data : null;

    if (!normalized.topCustomer) {
      const isTopCustomerModule = moduleType === 'top_customer';
      const looksLikeTopCustomer = Boolean(
        dataObj &&
        safeText(pick(dataObj, ['username', 'name', 'ign'], ''), '') &&
        pick(dataObj, ['total', 'amount'], undefined) !== undefined
      );
      if (isTopCustomerModule || looksLikeTopCustomer) {
        normalized.topCustomer = dataObj || module;
      }
    }

    if (!normalized.recentPayments.length) {
      const modulePayments = Array.isArray(data)
        ? data
        : collection(dataObj, ['payments', 'recent_payments', 'items', 'data']);
      const isRecentPaymentsModule = moduleType === 'recent_payments';
      if (isRecentPaymentsModule || modulePayments.length) {
        normalized.recentPayments = modulePayments;
      }
    }

    if (!normalized.featuredPackage) {
      const isFeaturedPackageModule = moduleType === 'featured_package';
      const embedded = dataObj ? pick(dataObj, ['package', 'featured_package'], null) : null;
      const looksLikePackage = Boolean(
        dataObj &&
        safeText(
          pick(dataObj, ['name', 'title', 'package.name', 'package.title'], ''),
          ''
        )
      );
      if (isFeaturedPackageModule || looksLikePackage) {
        normalized.featuredPackage = embedded || dataObj || module;
      }
    }
  }

  return normalized;
}

function normalizeCategory(raw) {
  const id = safeText(pick(raw, ['id', 'category_id', 'identifier']), '');
  const name = safeText(pick(raw, ['name', 'title']), 'Altro');
  const orderRaw = toNumber(pick(raw, ['order', 'sort_order'], NaN));
  const parentRaw = pick(raw, ['parent.id', 'parent_id', 'parentId', 'parent.category_id'], null);
  let parentId = parentRaw !== null && parentRaw !== undefined
    ? String(parentRaw).trim()
    : '';
  if (!parentId && raw?.parent && typeof raw.parent === 'object') {
    parentId = safeText(pick(raw.parent, ['id', 'category_id', 'identifier'], ''), '');
  }
  if (parentId === '0' || parentId === id) parentId = '';
  return {
    id: id || name,
    name,
    slug: slugify(name),
    parentId: parentId || null,
    order: Number.isFinite(orderRaw) ? orderRaw : Number.MAX_SAFE_INTEGER
  };
}

function resolveRootCategory(categoryId, categoriesById) {
  const visited = new Set();
  let currentId = safeText(categoryId, '');
  let current = null;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const category = categoriesById.get(currentId);
    if (!category) break;

    current = category;
    const parentId = safeText(category.parentId, '');
    if (!parentId || !categoriesById.has(parentId)) break;
    currentId = parentId;
  }

  return current;
}

function packageUrl(raw, fallbackStoreUrl) {
  const link = pick(raw, [
    'links.checkout',
    'links.webstore',
    'links.store',
    'url',
    'link',
    'webstore_url'
  ], null);
  return safeText(link, fallbackStoreUrl);
}

function normalizePackage(raw, categoriesById, fallbackStoreUrl) {
  const id = safeText(pick(raw, ['id', 'package_id', 'identifier']), '');
  const name = safeText(pick(raw, ['name', 'title']), 'Pacchetto');
  const description = cleanDescription(pick(raw, ['description', 'meta.description', 'teaser'], ''), 190);
  const categoryIdRaw = pick(raw, ['category.id', 'category_id', 'categoryId'], null);
  const categoryId = categoryIdRaw !== null && categoryIdRaw !== undefined
    ? String(categoryIdRaw)
    : '';
  const explicitCategoryName = safeText(pick(raw, ['category.name', 'category_title'], ''), '');
  const categoryFromMap = categoriesById.get(categoryId);
  const categoryName = explicitCategoryName || categoryFromMap?.name || 'Altro';
  const categorySlug = slugify(categoryName);
  const rootCategory = resolveRootCategory(categoryId, categoriesById);
  const rootCategoryName = rootCategory?.name || categoryName;
  const rootCategorySlug = slugify(rootCategoryName);
  const rootCategoryId = rootCategory?.id || categoryId || null;
  const price = toNumber(pick(raw, ['total_price', 'price', 'base_price', 'price.amount', 'amount'], NaN));
  const currency = safeText(pick(raw, ['currency.iso_4217', 'currency', 'price.currency'], 'EUR'), 'EUR');
  const priceFormatted = safeText(
    pick(raw, ['total_price_formatted', 'display_price', 'price.formatted'], ''),
    ''
  ) || formatMoney(price, currency);
  const orderRaw = toNumber(pick(raw, ['order', 'sort_order', 'position'], NaN));
  const image = safeText(pick(raw, ['image', 'image_url', 'meta.image', 'thumbnail_url'], ''), '');
  const perks = asArray(pick(raw, ['features', 'perks'], []))
    .map((entry) => safeText(entry, ''))
    .filter(Boolean)
    .slice(0, 5);

  return {
    id: id || slugify(name),
    name,
    description: description || 'Pacchetto disponibile su Tebex.',
    categoryId: categoryId || null,
    categoryName,
    categorySlug,
    rootCategoryId,
    rootCategoryName,
    rootCategorySlug,
    price: Number.isFinite(price) ? price : null,
    priceFormatted: priceFormatted || 'Prezzo su Tebex',
    currency,
    order: Number.isFinite(orderRaw) ? orderRaw : Number.MAX_SAFE_INTEGER,
    image,
    url: packageUrl(raw, fallbackStoreUrl),
    perks
  };
}

function normalizePayment(raw) {
  const packages = asArray(pick(raw, ['packages', 'products', 'items'], []));
  const firstPackage = packages[0] || {};

  const username = safeText(
    pick(raw, ['player.name', 'player.username', 'ign', 'username', 'name'], 'Player'),
    'Player'
  );
  const amount = toNumber(pick(raw, ['amount', 'price.amount', 'price', 'total'], NaN));
  const currency = safeText(pick(raw, ['currency.iso_4217', 'currency', 'price.currency'], 'EUR'), 'EUR');
  const packageName = safeText(
    pick(
      firstPackage,
      ['name', 'title'],
      pick(raw, ['package.name', 'package.title', 'package', 'package_name', 'name'], 'Pacchetto')
    ),
    'Pacchetto'
  );
  const categoryName = safeText(
    pick(
      firstPackage,
      ['category.name', 'category'],
      pick(raw, ['category.name', 'category', 'category_name', 'categoryName'], 'Store')
    ),
    'Store'
  );
  const when = pick(raw, ['date', 'created_at', 'createdAt', 'paid_at', 'timestamp', 'time'], null);
  let dateISO = null;
  if (when !== null && when !== undefined && when !== '') {
    let parsed = null;
    if (typeof when === 'number' && Number.isFinite(when)) {
      parsed = new Date(when > 1e12 ? when : when * 1000);
    } else if (typeof when === 'string' && /^\d{10,13}$/.test(when.trim())) {
      const epoch = Number.parseInt(when.trim(), 10);
      const millis = when.trim().length === 13 ? epoch : epoch * 1000;
      parsed = new Date(millis);
    } else {
      parsed = new Date(when);
    }
    if (!Number.isNaN(parsed.getTime())) dateISO = parsed.toISOString();
  }

  return {
    username,
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
    amountFormatted: formatMoney(Number.isFinite(amount) ? amount : 0, currency),
    packageName,
    categoryName,
    date: dateISO
  };
}

function topDonatorsFromPayments(payments, limit = 4) {
  const map = new Map();
  for (const payment of payments) {
    const key = payment.username.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        username: payment.username,
        total: 0,
        currency: payment.currency,
        purchases: 0
      });
    }
    const row = map.get(key);
    row.total += Number(payment.amount) || 0;
    row.purchases += 1;
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(1, limit))
    .map((row, index) => ({
      rank: index + 1,
      username: row.username,
      total: Number(row.total.toFixed(2)),
      totalFormatted: formatMoney(row.total, row.currency),
      currency: row.currency,
      purchases: row.purchases
    }));
}

function pickFeaturedPackage(packages, sidebarFeatured, fallbackStoreUrl) {
  if (sidebarFeatured) {
    const sidebarPkg = normalizePackage(sidebarFeatured, new Map(), fallbackStoreUrl);
    if (sidebarPkg?.name) return sidebarPkg;
  }

  const valid = packages.filter((pkg) => typeof pkg.name === 'string' && pkg.name.trim() !== '');
  if (!valid.length) {
    return {
      id: 'featured-fallback',
      name: 'Pacchetto Store',
      description: 'Scopri i pacchetti disponibili nel negozio ufficiale.',
      categoryId: null,
      categoryName: 'Store',
      categorySlug: 'store',
      price: null,
      priceFormatted: 'Prezzo su Tebex',
      currency: 'EUR',
      order: 0,
      image: '',
      url: fallbackStoreUrl,
      perks: []
    };
  }

  return [...valid].sort((a, b) => {
    const av = Number.isFinite(a.price) ? a.price : -1;
    const bv = Number.isFinite(b.price) ? b.price : -1;
    if (bv !== av) return bv - av;
    return a.order - b.order;
  })[0];
}

async function tebexFetch(url, options = {}) {
  const result = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  });
  if (!result.ok) {
    const text = await result.text();
    const err = new Error(`Tebex HTTP ${result.status}: ${text}`);
    err.status = result.status;
    throw err;
  }
  return result.json();
}

module.exports = async function handler(req, res) {
  applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' });
  const origin = safeText(req.headers.origin, '');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (origin && !isAllowedOrigin(req, origin)) {
    return res.status(403).json({ error: 'Origin non autorizzata' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const HEADLESS_TOKEN = safeText(
    process.env.TEBEX_WEBSTORE_TOKEN || process.env.TEBEX_PUBLIC_TOKEN,
    ''
  );
  const PRIVATE_KEY = safeText(process.env.TEBEX_PRIVATE_KEY, '');
  const STORE_URL = safeText(process.env.TEBEX_STORE_URL, DEFAULT_STORE_URL);

  const { type = '', id = '', category = '' } = req.query;
  const queryType = safeText(type, '');

  const needsHeadless = ['categories', 'packages', 'package', 'store', 'dashboard'].includes(queryType);
  if (needsHeadless && !HEADLESS_TOKEN) {
    return res.status(500).json({
      error: 'Token Tebex headless non configurato.',
      hint: 'Imposta TEBEX_WEBSTORE_TOKEN oppure TEBEX_PUBLIC_TOKEN in api/.env'
    });
  }

  const needsPrivate = ['payments'].includes(queryType);
  if (needsPrivate && !PRIVATE_KEY) {
    return res.status(500).json({
      error: 'TEBEX_PRIVATE_KEY non configurato.',
      hint: 'Aggiungilo in api/.env per leggere pagamenti e classifica donatori.'
    });
  }

  try {
    if (queryType === 'categories') {
      const url = `${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/categories`;
      const data = await tebexFetch(url);
      res.setHeader('Cache-Control', 'public, max-age=600');
      return res.status(200).json(data);
    }

    if (queryType === 'packages') {
      const url = category
        ? `${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/categories/${encodeURIComponent(String(category))}/packages`
        : `${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/packages`;
      const data = await tebexFetch(url);
      res.setHeader('Cache-Control', 'public, max-age=600');
      return res.status(200).json(data);
    }

    if (queryType === 'package') {
      if (!id) return res.status(400).json({ error: 'Manca il parametro id' });
      const url = `${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/packages/${encodeURIComponent(String(id))}`;
      const data = await tebexFetch(url);
      res.setHeader('Cache-Control', 'public, max-age=600');
      return res.status(200).json(data);
    }

    if (queryType === 'store' || queryType === 'dashboard') {
      const [categoriesRaw, packagesRaw] = await Promise.all([
        tebexFetch(`${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/categories`),
        tebexFetch(`${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/packages`)
      ]);

      const categories = collection(categoriesRaw, ['categories'])
        .map(normalizeCategory)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
      const categoriesById = new Map(categories.map((cat) => [String(cat.id), cat]));

      const packages = collection(packagesRaw, ['packages'])
        .map((pkg) => normalizePackage(pkg, categoriesById, STORE_URL))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      const rootCategories = categories
        .filter((cat) => {
          const parentId = safeText(cat.parentId, '');
          return !parentId || !categoriesById.has(parentId);
        })
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

      const countsByRootId = packages.reduce((acc, pkg) => {
        const key = safeText(pkg.rootCategoryId, '');
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      let storeCategories = rootCategories
        .map((cat) => ({
          ...cat,
          count: countsByRootId[cat.id] || 0
        }))
        .filter((cat) => cat.count > 0);

      if (!storeCategories.length) {
        const fallbackCounts = packages.reduce((acc, pkg) => {
          acc[pkg.categorySlug] = (acc[pkg.categorySlug] || 0) + 1;
          return acc;
        }, {});
        const seen = new Set();
        storeCategories = categories
          .filter((cat) => {
            if (seen.has(cat.slug)) return false;
            seen.add(cat.slug);
            return true;
          })
          .map((cat) => ({
            ...cat,
            count: fallbackCounts[cat.slug] || 0
          }))
          .filter((cat) => cat.count > 0);
      }

      if (queryType === 'store') {
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).json({
          storeUrl: STORE_URL,
          categories: storeCategories,
          packages,
          featuredPackage: pickFeaturedPackage(packages, null, STORE_URL)
        });
      }

      const topLimit = Math.max(1, Math.min(10, Number.parseInt(req.query.topLimit, 10) || 4));
      const recentLimit = Math.max(1, Math.min(10, Number.parseInt(req.query.recentLimit, 10) || 4));

      let payments = [];
      let sidebarData = null;

      const sidebarPromise = tebexFetch(
        `${HEADLESS_BASE}/accounts/${encodeURIComponent(HEADLESS_TOKEN)}/sidebar`
      ).catch(() => null);

      const paymentsPromise = PRIVATE_KEY
        ? tebexFetch(`${PLUGIN_BASE}/payments?limit=100`, {
            headers: { 'X-Tebex-Secret': PRIVATE_KEY }
          }).catch(() => null)
        : Promise.resolve(null);

      const [sidebarPayload, paymentsPayload] = await Promise.all([sidebarPromise, paymentsPromise]);
      sidebarData = normalizeSidebarPayload(sidebarPayload);

      if (paymentsPayload) {
        payments = collection(paymentsPayload, ['payments', 'data']).map(normalizePayment);
      }
      if (!payments.length && sidebarData?.recentPayments?.length) {
        payments = sidebarData.recentPayments.map(normalizePayment);
      }
      payments.sort((a, b) => {
        const ad = a?.date ? Date.parse(a.date) : NaN;
        const bd = b?.date ? Date.parse(b.date) : NaN;
        if (Number.isNaN(ad) && Number.isNaN(bd)) return 0;
        if (Number.isNaN(ad)) return 1;
        if (Number.isNaN(bd)) return -1;
        return bd - ad;
      });

      const topDonators = topDonatorsFromPayments(payments, topLimit);
      const recentPurchases = payments.slice(0, recentLimit);
      const featuredFromSidebar = sidebarData?.featuredPackage || null;
      const featuredPackage = pickFeaturedPackage(packages, featuredFromSidebar, STORE_URL);

      let fallbackTop = topDonators;
      if (!fallbackTop.length && sidebarData?.topCustomer) {
        const topAmount = toNumber(pick(sidebarData.topCustomer, ['amount', 'total'], 0));
        const topCurrency = safeText(pick(sidebarData.topCustomer, ['currency'], 'EUR'), 'EUR');
        fallbackTop = [{
          rank: 1,
          username: safeText(
            pick(sidebarData.topCustomer, ['name', 'username', 'ign'], 'Top Donator'),
            'Top Donator'
          ),
          total: Number.isFinite(topAmount) ? topAmount : 0,
          totalFormatted: formatMoney(Number.isFinite(topAmount) ? topAmount : 0, topCurrency),
          currency: topCurrency,
          purchases: 1
        }];
      }

      res.setHeader('Cache-Control', 'public, max-age=120');
      return res.status(200).json({
        storeUrl: STORE_URL,
        categories: storeCategories,
        packages,
        featuredPackage,
        topDonators: fallbackTop,
        recentPurchases,
        sources: {
          headless: true,
          pluginPayments: Boolean(paymentsPayload),
          sidebar: Boolean(sidebarPayload)
        }
      });
    }

    if (queryType === 'payments') {
      const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20));
      const payload = await tebexFetch(`${PLUGIN_BASE}/payments?limit=${limit}`, {
        headers: { 'X-Tebex-Secret': PRIVATE_KEY }
      });
      const payments = collection(payload, ['payments', 'data']).map(normalizePayment);
      const topDonators = topDonatorsFromPayments(payments, 10);
      res.setHeader('Cache-Control', 'private, max-age=60');
      return res.status(200).json({ payments, topDonators });
    }

    return res.status(400).json({
      error: 'Parametro type non valido.',
      allowed: ['categories', 'packages', 'package', 'store', 'payments', 'dashboard']
    });
  } catch (err) {
    console.error('[/api/tebex] Errore:', err);
    const status = Number.isInteger(err?.status) ? err.status : 500;
    return res.status(status).json({
      error: 'Errore Tebex API',
      details: err.message
    });
  }
};
