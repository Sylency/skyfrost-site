'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  parseCookies,
  SESSION_COOKIE_NAME,
  getAuthSecret,
  verifySessionToken,
  applyCors,
  isAllowedOrigin
} = require('./auth-utils.cjs');

const LICENSES_FILE = path.join(__dirname, 'licenses.json');

/* ── Helpers ── */

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function getAdminSecret() {
  return safeText(process.env.LICENSE_ADMIN_SECRET, '');
}

function generateLicenseKey() {
  const hex = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `SF-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/* ── File I/O ── */

function readLicenses() {
  try {
    if (!fs.existsSync(LICENSES_FILE)) return [];
    const raw = fs.readFileSync(LICENSES_FILE, 'utf8').trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLicenses(licenses) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), 'utf8');
}

/* ── Auth helpers ── */

function getSessionPayload(req) {
  const secret = getAuthSecret();
  if (!secret) return null;
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  return verifySessionToken(token, secret);
}

function isAdmin(req) {
  const payload = getSessionPayload(req);
  if (!payload) return { ok: false, reason: 'not_authenticated' };

  const adminSecret = getAdminSecret();
  if (!adminSecret) return { ok: false, reason: 'admin_secret_not_configured' };

  const provided = safeText(req.headers['x-admin-secret'] || req.query.adminSecret || req.body?.adminSecret, '');
  if (!provided || provided !== adminSecret) return { ok: false, reason: 'invalid_admin_secret' };

  return { ok: true, userId: safeText(payload.sub, ''), username: safeText(payload.username, '') };
}

function ensureAllowedOrigin(req, res) {
  const origin = safeText(req.headers.origin, '');
  if (!origin) return true;
  if (isAllowedOrigin(req, origin)) return true;
  res.status(403).json({ error: 'Origin non autorizzata' });
  return false;
}

/* ── Actions ── */

function handleValidate(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = safeText(req.query.key, '');
  if (!key) return res.status(400).json({ error: 'Parametro "key" mancante' });

  const licenses = readLicenses();
  const license = licenses.find((l) => l.key === key);

  if (!license) {
    return res.json({ valid: false, key, reason: 'not_found' });
  }

  if (!license.active) {
    return res.json({ valid: false, key, reason: 'revoked', username: license.username });
  }

  return res.json({
    valid: true,
    key: license.key,
    username: license.username,
    createdAt: license.createdAt
  });
}

function handleGenerate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const username = safeText(req.body?.username, '');
  if (!username) return res.status(400).json({ error: 'Campo "username" obbligatorio' });
  if (username.length < 2 || username.length > 32) {
    return res.status(400).json({ error: 'Username deve essere tra 2 e 32 caratteri' });
  }

  const note = safeText(req.body?.note, '');
  const licenses = readLicenses();

  const key = generateLicenseKey();
  const newLicense = {
    key,
    username,
    note,
    createdAt: new Date().toISOString(),
    createdBy: admin.userId,
    createdByName: admin.username,
    active: true
  };

  licenses.push(newLicense);
  writeLicenses(licenses);

  return res.status(201).json({ ok: true, license: newLicense });
}

function handleList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const licenses = readLicenses();
  return res.json({ ok: true, total: licenses.length, licenses });
}

function handleRevoke(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const key = safeText(req.body?.key, '');
  if (!key) return res.status(400).json({ error: 'Campo "key" obbligatorio' });

  const licenses = readLicenses();
  const license = licenses.find((l) => l.key === key);

  if (!license) return res.status(404).json({ error: 'Licenza non trovata' });
  if (!license.active) return res.status(400).json({ error: 'Licenza già revocata' });

  license.active = false;
  license.revokedAt = new Date().toISOString();
  license.revokedBy = admin.userId;
  writeLicenses(licenses);

  return res.json({ ok: true, license });
}

/* ── Main handler ── */

module.exports = async function handler(req, res) {
  applyCors(req, res, {
    methods: 'GET, POST, OPTIONS',
    headers: 'Content-Type, X-Admin-Secret',
    credentials: true
  });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!ensureAllowedOrigin(req, res)) return;

  const action = safeText(req.query.action || req.body?.action, '').toLowerCase();

  switch (action) {
    case 'validate':
      return handleValidate(req, res);
    case 'generate':
      return handleGenerate(req, res);
    case 'list':
      return handleList(req, res);
    case 'revoke':
      return handleRevoke(req, res);
    default:
      return res.status(400).json({ error: 'Azione non valida. Usa: validate, generate, list, revoke' });
  }
};
