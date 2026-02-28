'use strict';

const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'sf_session';
const OAUTH_STATE_COOKIE_NAME = 'sf_oauth_state';

function base64UrlEncode(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const base64 = normalized + (pad ? '='.repeat(4 - pad) : '');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function sign(input, secret) {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(input).digest());
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function parseCookies(req) {
  const header = String(req.headers?.cookie || '').trim();
  if (!header) return {};

  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index < 0) return acc;
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function appendSetCookie(res, cookie) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookie]);
    return;
  }
  res.setHeader('Set-Cookie', [current, cookie]);
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value ?? '')}`];

  if (options.maxAge !== undefined) {
    const maxAge = Number(options.maxAge);
    if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }
  if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
  parts.push(`Path=${options.path || '/'}`);

  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);

  return parts.join('; ');
}

function setCookie(res, name, value, options = {}) {
  appendSetCookie(res, serializeCookie(name, value, options));
}

function clearCookie(res, name, options = {}) {
  setCookie(res, name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
}

function getAuthSecret() {
  return String(process.env.AUTH_SECRET || '').trim();
}

function createSessionToken(payload, secret, ttlSeconds = 60 * 60 * 24 * 7) {
  if (!secret) throw new Error('AUTH_SECRET non configurato');
  const iat = nowSeconds();
  const exp = iat + Math.max(60, Number(ttlSeconds) || 0);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({ ...payload, iat, exp }));
  const signature = sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body));
    if (!payload || !payload.exp || Number(payload.exp) <= nowSeconds()) return null;
    return payload;
  } catch {
    return null;
  }
}

function inferDiscordClientId() {
  const explicit = String(
    process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID || ''
  ).trim();
  if (explicit) return explicit;

  const botToken = String(process.env.DISCORD_BOT_TOKEN || '').trim();
  const firstPart = botToken.split('.')[0] || '';
  if (!firstPart) return '';

  try {
    const decoded = Buffer.from(firstPart, 'base64').toString('utf8').trim();
    return /^\d{17,21}$/.test(decoded) ? decoded : '';
  } catch {
    return '';
  }
}

function isSecureRequest(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return proto === 'https' || Boolean(req.secure);
}

function resolveBaseUrl(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProto || (isSecureRequest(req) ? 'https' : 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  if (!host) return '';
  return `${protocol}://${host}`;
}

function buildDiscordAvatarUrl(user) {
  const userId = String(user?.id || '').trim();
  const hash = String(user?.avatar || '').trim();
  if (userId && hash) {
    const ext = hash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${ext}?size=128`;
  }

  const discriminator = Number(user?.discriminator || 0);
  return `https://cdn.discordapp.com/embed/avatars/${Math.abs(discriminator) % 5}.png`;
}

module.exports = {
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
  buildDiscordAvatarUrl
};
