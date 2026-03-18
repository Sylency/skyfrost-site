/**
 * ═══════════════════════════════════════════════════════════
 *  SKYFROST — api/server.js
 *  Express API server — porta 3001
 *  Avvio: node server.js  oppure  pm2 start server.js
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

// ── Cattura errori non gestiti per evitare crash silenziosi ──
process.on('uncaughtException', (err) => {
  console.error('💀 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('💀 UNHANDLED REJECTION:', reason);
});

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3001;
const BODY_LIMIT = process.env.API_BODY_LIMIT || '100kb';
const RATE_WINDOW_MS = Math.max(1000, Number.parseInt(process.env.API_RATE_WINDOW_MS, 10) || 60000);
const RATE_MAX = Math.max(20, Number.parseInt(process.env.API_RATE_MAX, 10) || 240);

const RATE_BUCKETS = new Map();
const MAX_BUCKETS = 5000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

function setSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  next();
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  if (forwarded) return forwarded;
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

function cleanupBuckets(now) {
  if (RATE_BUCKETS.size <= MAX_BUCKETS) return;

  for (const [key, value] of RATE_BUCKETS.entries()) {
    if (value.resetAt <= now) RATE_BUCKETS.delete(key);
  }

  if (RATE_BUCKETS.size <= MAX_BUCKETS) return;
  const overflow = RATE_BUCKETS.size - MAX_BUCKETS;
  let removed = 0;
  for (const key of RATE_BUCKETS.keys()) {
    RATE_BUCKETS.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function consumeRateSlot(key, maxHits, windowMs) {
  const now = Date.now();
  cleanupBuckets(now);

  const current = RATE_BUCKETS.get(key);
  if (!current || current.resetAt <= now) {
    RATE_BUCKETS.set(key, { hits: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxHits - 1, retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (current.hits >= maxHits) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.hits += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxHits - current.hits),
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}

function rateLimit(options = {}) {
  const maxHits = Math.max(1, Number.parseInt(options.maxHits, 10) || RATE_MAX);
  const windowMs = Math.max(1000, Number.parseInt(options.windowMs, 10) || RATE_WINDOW_MS);
  const keyPrefix = String(options.keyPrefix || 'api').trim();

  return (req, res, next) => {
    const slot = consumeRateSlot(`${keyPrefix}:${clientIp(req)}`, maxHits, windowMs);
    res.setHeader('X-RateLimit-Limit', String(maxHits));
    res.setHeader('X-RateLimit-Remaining', String(slot.remaining));

    if (!slot.allowed) {
      res.setHeader('Retry-After', String(slot.retryAfter));
      return res.status(429).json({
        error: 'Troppe richieste',
        retryAfterSeconds: slot.retryAfter
      });
    }
    return next();
  };
}

function registerRoute(route, handler, sourceFile) {
  app.all(route, async (req, res) => {
    try {
      const fn = typeof handler === 'function'
        ? handler
        : typeof handler?.default === 'function'
          ? handler.default
          : null;

      if (!fn) {
        return res.status(500).json({ error: `Invalid export in ${sourceFile}` });
      }
      return await fn(req, res);
    } catch (err) {
      console.error(`[${route}]`, err);
      return res.status(500).json({ error: 'Server error' });
    }
  });
}

app.use(setSecurityHeaders);
app.use('/api', rateLimit({ keyPrefix: 'api', maxHits: RATE_MAX, windowMs: RATE_WINDOW_MS }));
app.use('/api/auth', rateLimit({ keyPrefix: 'auth', maxHits: Math.max(20, Math.floor(RATE_MAX / 3)), windowMs: RATE_WINDOW_MS }));
app.use('/api/tickets', rateLimit({ keyPrefix: 'tickets', maxHits: 10, windowMs: RATE_WINDOW_MS }));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime())
  });
});

// ── Carica automaticamente tutti i file endpoint *.js (escluso server.js) ──
const files = fs.readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== 'server.js')
  .sort((a, b) => a.localeCompare(b));

files.forEach((file) => {
  const route = '/api/' + file.replace('.js', '');
  try {
    const handler = require(path.join(__dirname, file));
    registerRoute(route, handler, file);
    console.log('✔ Loaded:', route);
  } catch (err) {
    console.error('❌ Error loading', file, err.message);
  }
});

const server = app.listen(PORT, () => {
  console.log('🚀 SkyFrost API running on http://localhost:' + PORT);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} già in uso. Riprovo tra 3 secondi...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 3000);
  } else {
    console.error('❌ Server error:', err);
  }
});
