'use strict';

const crypto = require('crypto');
const {
  SESSION_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  parseCookies,
  setCookie,
  clearCookie,
  getAuthSecret,
  createSessionToken,
  verifySessionToken,
  inferDiscordClientId,
  isSecureRequest,
  resolveBaseUrl,
  isAllowedOrigin,
  applyCors,
  buildDiscordAvatarUrl
} = require('./auth-utils.cjs');

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const STATE_TTL_SECONDS = 60 * 10;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizedPath(value, fallback) {
  const raw = safeText(value, fallback);
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function withQuery(url, params = {}) {
  const [base, query = ''] = String(url).split('?');
  const merged = new URLSearchParams(query);
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === '') return;
    merged.set(key, String(val));
  });
  const q = merged.toString();
  return q ? `${base}?${q}` : base;
}

function ensureAllowedOrigin(req, res) {
  const origin = safeText(req.headers.origin, '');
  if (!origin) return true;
  if (isAllowedOrigin(req, origin)) return true;
  res.status(403).json({ error: 'Origin non autorizzata' });
  return false;
}

function getAuthRedirect() {
  return normalizedPath(process.env.AUTH_SUCCESS_REDIRECT, '/supporto');
}

function getLoginRedirect() {
  return normalizedPath(process.env.AUTH_LOGIN_REDIRECT, '/login');
}

function buildRedirectUri(req) {
  const explicit = safeText(process.env.DISCORD_REDIRECT_URI, '');
  if (explicit) return explicit;
  const base = resolveBaseUrl(req);
  return base ? `${base}/api/auth` : '';
}

function buildScope() {
  return safeText(process.env.DISCORD_OAUTH_SCOPES, 'identify');
}

function getSessionPayload(req) {
  const secret = getAuthSecret();
  if (!secret) return { error: 'AUTH_SECRET non configurato' };

  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const payload = verifySessionToken(token, secret);
  if (!payload) return null;
  return payload;
}

function publicUserFromPayload(payload) {
  const userId = safeText(payload.sub, '');
  const username = safeText(payload.username, 'DiscordUser');
  const globalName = safeText(payload.globalName, '');

  return {
    id: userId,
    username,
    displayName: globalName || username,
    avatar: buildDiscordAvatarUrl({
      id: userId,
      avatar: safeText(payload.avatar, ''),
      discriminator: 0
    }),
    guildId: safeText(payload.guildId, ''),
    roles: Array.isArray(payload.roles) ? payload.roles : []
  };
}

async function exchangeCode(code, redirectUri, clientId, clientSecret) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const detail = safeText(payload.error_description || payload.error, `HTTP ${response.status}`);
    throw new Error(`Discord token exchange fallito: ${detail}`);
  }

  return payload;
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.id) {
    const detail = safeText(payload.message || payload.error, `HTTP ${response.status}`);
    throw new Error(`Discord user fetch fallito: ${detail}`);
  }
  return payload;
}

async function ensureGuildMembership(userId) {
  const guildId = safeText(process.env.DISCORD_GUILD_ID, '');
  if (!guildId) return { ok: true, guildId: '', roles: [] };

  const botToken = safeText(process.env.DISCORD_BOT_TOKEN, '');
  if (!botToken) return { ok: false, reason: 'guild_check_needs_bot_token' };

  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` }
  });

  if (response.status === 404) return { ok: false, reason: 'not_in_guild' };
  if (!response.ok) return { ok: false, reason: `guild_check_failed_${response.status}` };
  
  const member = await response.json().catch(() => ({}));
  const roles = Array.isArray(member.roles) ? member.roles : [];
  return { ok: true, guildId, roles };
}

function redirectWithError(res, code) {
  return res.redirect(withQuery(getLoginRedirect(), { error: code }));
}

async function startAuth(req, res) {
  const clientId = inferDiscordClientId();
  const redirectUri = buildRedirectUri(req);
  if (!clientId) {
    return res.status(500).json({
      error: 'DISCORD_CLIENT_ID mancante',
      hint: 'Imposta DISCORD_CLIENT_ID (oppure DISCORD_BOT_TOKEN valido) in api/.env'
    });
  }
  if (!redirectUri) {
    return res.status(500).json({
      error: 'Redirect URI non risolvibile',
      hint: 'Imposta DISCORD_REDIRECT_URI in api/.env'
    });
  }

  const state = crypto.randomBytes(24).toString('hex');
  setCookie(res, OAUTH_STATE_COOKIE_NAME, state, {
    maxAge: STATE_TTL_SECONDS,
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureRequest(req),
    path: '/'
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: buildScope(),
    state
  });

  return res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
}

async function completeAuth(req, res) {
  const code = safeText(req.query.code, '');
  const state = safeText(req.query.state, '');
  const cookies = parseCookies(req);
  const expectedState = safeText(cookies[OAUTH_STATE_COOKIE_NAME], '');
  const clientId = inferDiscordClientId();
  const clientSecret = safeText(process.env.DISCORD_CLIENT_SECRET, '');
  const redirectUri = buildRedirectUri(req);
  const authSecret = getAuthSecret();

  clearCookie(res, OAUTH_STATE_COOKIE_NAME, {
    secure: isSecureRequest(req),
    path: '/'
  });

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(res, 'state_non_valido');
  }
  if (!clientId || !clientSecret || !redirectUri || !authSecret) {
    return redirectWithError(res, 'configurazione_auth_mancante');
  }

  try {
    const tokenData = await exchangeCode(code, redirectUri, clientId, clientSecret);
    const discordUser = await fetchDiscordUser(tokenData.access_token);
    const guildCheck = await ensureGuildMembership(discordUser.id);

    if (!guildCheck.ok) {
      if (guildCheck.reason === 'not_in_guild') {
        return redirectWithError(res, 'utente_non_nel_server');
      }
      return redirectWithError(res, 'errore_verifica_gilda');
    }

    const token = createSessionToken({
      sub: safeText(discordUser.id, ''),
      username: safeText(discordUser.username, 'DiscordUser'),
      globalName: safeText(discordUser.global_name, ''),
      avatar: safeText(discordUser.avatar, ''),
      guildId: safeText(guildCheck.guildId, ''),
      roles: guildCheck.roles || []
    }, authSecret, SESSION_TTL_SECONDS);

    setCookie(res, SESSION_COOKIE_NAME, token, {
      maxAge: SESSION_TTL_SECONDS,
      httpOnly: true,
      sameSite: 'Lax',
      secure: isSecureRequest(req),
      path: '/'
    });

    return res.redirect(withQuery(getAuthRedirect(), { login: 'ok' }));
  } catch (err) {
    console.error('[/api/auth callback] Errore:', err);
    return redirectWithError(res, 'oauth_fallito');
  }
}

function sessionInfo(req, res) {
  const payload = getSessionPayload(req);
  if (payload?.error) return res.status(500).json({ error: payload.error });
  if (!payload) return res.status(401).json({ authenticated: false });

  return res.status(200).json({
    authenticated: true,
    user: publicUserFromPayload(payload)
  });
}

function logout(req, res) {
  clearCookie(res, SESSION_COOKIE_NAME, {
    secure: isSecureRequest(req),
    path: '/'
  });
  clearCookie(res, OAUTH_STATE_COOKIE_NAME, {
    secure: isSecureRequest(req),
    path: '/'
  });
  return res.status(200).json({ ok: true });
}

module.exports = async function handler(req, res) {
  applyCors(req, res, {
    methods: 'GET, POST, OPTIONS',
    headers: 'Content-Type',
    credentials: true
  });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!ensureAllowedOrigin(req, res)) return;

  if (req.method === 'GET' && req.query.code) {
    return completeAuth(req, res);
  }

  const action = safeText(req.query.action || req.body?.action, '').toLowerCase();

  if (action === 'start') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return startAuth(req, res);
  }

  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    return logout(req, res);
  }

  if (!action || action === 'session') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    return sessionInfo(req, res);
  }

  return res.status(400).json({ error: 'Azione non valida' });
};
