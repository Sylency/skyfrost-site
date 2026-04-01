'use strict';

const {
  parseCookies,
  SESSION_COOKIE_NAME,
  getAuthSecret,
  verifySessionToken,
  applyCors,
  isAllowedOrigin
} = require('./auth-utils.cjs');
const { query } = require('./db.js');

/* ── Helpers ── */

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
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

  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  // Owner e Sr. Admin Role IDs (definiti in discord.js)
  const ALLOWED_ROLES = ['1463926392109662350', '1463926392109662348'];
  const hasAccess = roles.some(r => ALLOWED_ROLES.includes(r));
  if (!hasAccess) return { ok: false, reason: 'forbidden_role' };

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

async function handleValidate(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const fingerprint = safeText(req.query.fingerprint, '');
  if (!fingerprint) return res.status(400).json({ error: 'Parametro "fingerprint" mancante' });

  const rows = await query(
    'SELECT fingerprint, hostname, status, requested_at FROM license_requests WHERE fingerprint = ?',
    [fingerprint]
  );

  if (!rows.length) {
    return res.json({ valid: false, fingerprint, reason: 'not_found' });
  }

  const license = rows[0];

  if (license.status === 'approved') {
    return res.json({
      valid: true,
      fingerprint: license.fingerprint,
      hostname: license.hostname,
      status: license.status,
      requestedAt: license.requested_at
    });
  }

  return res.json({
    valid: false,
    fingerprint: license.fingerprint,
    hostname: license.hostname,
    status: license.status,
    reason: license.status === 'revoked' ? 'revoked' : 'pending'
  });
}

async function handleInsert(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const fingerprint = safeText(req.body?.fingerprint, '');
  if (!fingerprint) return res.status(400).json({ error: 'Campo "fingerprint" obbligatorio' });
  if (fingerprint.length > 64) return res.status(400).json({ error: 'Fingerprint troppo lungo (max 64 caratteri)' });

  const hostname = safeText(req.body?.hostname, '');

  // Check if fingerprint already exists
  const existing = await query('SELECT fingerprint FROM license_requests WHERE fingerprint = ?', [fingerprint]);
  if (existing.length) {
    return res.status(409).json({ error: 'Fingerprint già registrato nel sistema' });
  }

  await query(
    'INSERT INTO license_requests (fingerprint, hostname, status, requested_at) VALUES (?, ?, ?, NOW())',
    [fingerprint, hostname, 'pending']
  );

  return res.status(201).json({ ok: true, fingerprint, hostname, status: 'pending' });
}

async function handleApprove(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const fingerprint = safeText(req.body?.fingerprint, '');
  if (!fingerprint) return res.status(400).json({ error: 'Campo "fingerprint" obbligatorio' });

  const rows = await query('SELECT fingerprint, status FROM license_requests WHERE fingerprint = ?', [fingerprint]);
  if (!rows.length) return res.status(404).json({ error: 'Licenza non trovata' });
  if (rows[0].status === 'approved') return res.status(400).json({ error: 'Licenza già approvata' });

  await query('UPDATE license_requests SET status = ? WHERE fingerprint = ?', ['approved', fingerprint]);

  return res.json({ ok: true, fingerprint, status: 'approved' });
}

async function handleRevoke(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const fingerprint = safeText(req.body?.fingerprint, '');
  if (!fingerprint) return res.status(400).json({ error: 'Campo "fingerprint" obbligatorio' });

  const rows = await query('SELECT fingerprint, status FROM license_requests WHERE fingerprint = ?', [fingerprint]);
  if (!rows.length) return res.status(404).json({ error: 'Licenza non trovata' });
  if (rows[0].status === 'revoked') return res.status(400).json({ error: 'Licenza già revocata' });

  await query('UPDATE license_requests SET status = ? WHERE fingerprint = ?', ['revoked', fingerprint]);

  return res.json({ ok: true, fingerprint, status: 'revoked' });
}

async function handleList(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = isAdmin(req);
  if (!admin.ok) {
    const statusCode = admin.reason === 'not_authenticated' ? 401 : 403;
    return res.status(statusCode).json({ error: admin.reason });
  }

  const statusFilter = safeText(req.query.status, '');
  let sql = 'SELECT fingerprint, hostname, status, requested_at FROM license_requests ORDER BY requested_at DESC';
  let params = [];

  if (statusFilter && ['pending', 'approved', 'revoked'].includes(statusFilter)) {
    sql = 'SELECT fingerprint, hostname, status, requested_at FROM license_requests WHERE status = ? ORDER BY requested_at DESC';
    params = [statusFilter];
  }

  const licenses = await query(sql, params);
  return res.json({ ok: true, total: licenses.length, licenses });
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
    case 'insert':
      return handleInsert(req, res);
    case 'approve':
      return handleApprove(req, res);
    case 'revoke':
      return handleRevoke(req, res);
    case 'list':
      return handleList(req, res);
    default:
      return res.status(400).json({ error: 'Azione non valida. Usa: validate, insert, approve, revoke, list' });
  }
};
