'use strict';

const { applyCors, isAllowedOrigin } = require('./auth-utils.cjs');

const DEFAULT_SERVER_ADDRESS = 'play.skyfrost.eu';
const DEFAULT_STATUS_URL_TEMPLATE = 'https://api.mcstatus.io/v2/status/java/{server}';
const CACHE_TTL_MS = 60000;

let cachedStatus = null;
let cacheExpiresAt = 0;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function asPort(value, fallback = 25565) {
  const port = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(port) && port > 0 ? port : fallback;
}

function asTimestamp(value) {
  const num = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizedPlayerName(player) {
  return safeText(
    player?.name_clean,
    safeText(player?.name_raw, safeText(player?.name_html, ''))
  );
}

function normalizePlugin(plugin) {
  const name = safeText(plugin?.name, '');
  if (!name) return null;
  return {
    name,
    version: safeText(plugin?.version, '')
  };
}

function normalizeMod(mod) {
  const name = safeText(mod?.name, '');
  if (!name) return null;
  return {
    name,
    version: safeText(mod?.version, '')
  };
}

function resolveStatusUrl(serverAddress) {
  const template = DEFAULT_STATUS_URL_TEMPLATE;
  if (template.includes('{server}')) {
    return template.replace('{server}', encodeURIComponent(serverAddress));
  }
  return template;
}

function parseStatusPayload(payload) {
  const retrievedAt = asTimestamp(payload?.retrieved_at) ?? Date.now();
  const expiresAt = asTimestamp(payload?.expires_at);
  const onlinePlayers = asNumber(payload?.players?.online);
  const maxPlayers = asNumber(payload?.players?.max);
  const samplePlayers = Array.isArray(payload?.players?.list)
    ? payload.players.list.map(normalizedPlayerName).filter(Boolean).slice(0, 8)
    : [];
  const plugins = Array.isArray(payload?.plugins)
    ? payload.plugins.map(normalizePlugin).filter(Boolean)
    : [];
  const mods = Array.isArray(payload?.mods)
    ? payload.mods.map(normalizeMod).filter(Boolean)
    : [];
  const srvRecordHost = safeText(payload?.srv_record?.host, '');
  const srvRecordPort = asNumber(payload?.srv_record?.port);
  const isOnline = payload?.online === true;

  return {
    sourceProvider: 'mcstatus.io',
    serverHost: safeText(payload?.host, DEFAULT_SERVER_ADDRESS),
    serverPort: asPort(payload?.port, 25565),
    ipAddress: safeText(payload?.ip_address, '') || null,
    eulaBlocked: payload?.eula_blocked === true,
    isOnline,
    status: isOnline ? 'online' : 'offline',
    onlinePlayers,
    maxPlayers,
    samplePlayers,
    version: {
      name: safeText(payload?.version?.name_clean, safeText(payload?.version?.name_raw, '')),
      protocol: asNumber(payload?.version?.protocol)
    },
    motd: {
      raw: safeText(payload?.motd?.raw, ''),
      clean: safeText(payload?.motd?.clean, ''),
      html: safeText(payload?.motd?.html, '')
    },
    icon: safeText(payload?.icon, '') || null,
    software: safeText(payload?.software, ''),
    plugins,
    pluginCount: plugins.length,
    mods,
    modCount: mods.length,
    srvRecord: srvRecordHost
      ? {
          host: srvRecordHost,
          port: srvRecordPort
        }
      : null,
    updatedAt: new Date(retrievedAt).toISOString(),
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
  };
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
  return {
    ok: false,
    sourceProvider: 'mcstatus.io',
    serverAddress,
    serverHost: serverAddress,
    serverPort: 25565,
    ipAddress: null,
    eulaBlocked: false,
    isOnline: null,
    status: 'unavailable',
    onlinePlayers: null,
    maxPlayers: null,
    samplePlayers: [],
    version: {
      name: '',
      protocol: null
    },
    motd: {
      raw: '',
      clean: '',
      html: ''
    },
    icon: null,
    software: '',
    plugins: [],
    pluginCount: 0,
    mods: [],
    modCount: 0,
    srvRecord: null,
    updatedAt: new Date().toISOString(),
    expiresAt: null,
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

  const serverAddress = DEFAULT_SERVER_ADDRESS;
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
      ...live
    };

    cachedStatus = payload;
    cacheExpiresAt = now + CACHE_TTL_MS;
    res.setHeader('Cache-Control', `public, max-age=${Math.max(1, Math.floor(CACHE_TTL_MS / 1000))}`);
    return res.status(200).json(payload);
  } catch (err) {
    const payload = fallbackStatus(serverAddress, safeText(err?.message, 'status_unavailable'));
    cachedStatus = payload;
    cacheExpiresAt = now + Math.min(15000, CACHE_TTL_MS);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  }
};
