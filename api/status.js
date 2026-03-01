'use strict';

const { applyCors, isAllowedOrigin } = require('./auth-utils.cjs');

const DEFAULT_SERVER_ADDRESS = 'play.skyfrost.it';
const DEFAULT_STATUS_URL_TEMPLATE = 'https://api.mcsrvstat.us/3/{server}';
const CACHE_TTL_MS = Math.max(5000, Number.parseInt(process.env.STATUS_CACHE_TTL_MS, 10) || 30000);

let cachedStatus = null;
let cacheExpiresAt = 0;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asNumber(value) {
  const num = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function resolveStatusUrl(serverAddress) {
  const template = safeText(process.env.SERVER_STATUS_API_URL, DEFAULT_STATUS_URL_TEMPLATE);
  if (template.includes('{server}')) {
    return template.replace('{server}', encodeURIComponent(serverAddress));
  }
  return template;
}

function parseStatusPayload(payload) {
  const online = asNumber(
    payload?.players?.online ??
    payload?.onlinePlayers ??
    payload?.online_count ??
    payload?.data?.players?.online
  );

  const max = asNumber(
    payload?.players?.max ??
    payload?.maxPlayers ??
    payload?.max_count ??
    payload?.data?.players?.max
  );

  const explicitOnline = typeof payload?.online === 'boolean' ? payload.online : null;
  const isOnline = explicitOnline !== null ? explicitOnline : online !== null;

  return { online, max, isOnline };
}

async function fetchLiveStatus(serverAddress) {
  const url = resolveStatusUrl(serverAddress);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Status provider HTTP ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  const parsed = parseStatusPayload(payload);
  return { ...parsed, sourceUrl: url };
}

function fallbackStatus(serverAddress, reason = '') {
  const fallbackOnline = asNumber(process.env.ONLINE_COUNT_FALLBACK);
  return {
    ok: false,
    serverAddress,
    onlinePlayers: fallbackOnline,
    maxPlayers: null,
    isOnline: fallbackOnline !== null ? fallbackOnline > 0 : null,
    updatedAt: new Date().toISOString(),
    error: safeText(reason, 'status_unavailable')
  };
}

module.exports = async function handler(req, res) {
  applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' });

  const origin = safeText(req.headers.origin, '');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (origin && !isAllowedOrigin(req, origin)) {
    return res.status(403).json({ error: 'Origin non autorizzata' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const serverAddress = safeText(process.env.GAME_SERVER_ADDRESS, DEFAULT_SERVER_ADDRESS);
  const now = Date.now();
  if (cachedStatus && cacheExpiresAt > now) {
    res.setHeader('Cache-Control', `public, max-age=${Math.max(1, Math.floor(CACHE_TTL_MS / 1000))}`);
    return res.status(200).json(cachedStatus);
  }

  try {
    const live = await fetchLiveStatus(serverAddress);
    const payload = {
      ok: true,
      serverAddress,
      onlinePlayers: live.online,
      maxPlayers: live.max,
      isOnline: live.isOnline,
      updatedAt: new Date().toISOString(),
      sourceUrl: live.sourceUrl
    };

    cachedStatus = payload;
    cacheExpiresAt = now + CACHE_TTL_MS;
    res.setHeader('Cache-Control', `public, max-age=${Math.max(1, Math.floor(CACHE_TTL_MS / 1000))}`);
    return res.status(200).json(payload);
  } catch (err) {
    const payload = fallbackStatus(serverAddress, safeText(err?.message, 'status_unavailable'));
    cachedStatus = payload;
    cacheExpiresAt = now + Math.min(10000, CACHE_TTL_MS);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  }
};
