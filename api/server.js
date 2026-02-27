/**
 * ═══════════════════════════════════════════════════════════
 *  SKYFROST — api/server.js
 *  Express API server — porta 3001
 *  Avvio: node server.js  oppure  pm2 start server.js
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Carica automaticamente tutti i file *.js (escluso server.js) ──
const files = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'server.js');

files.forEach(file => {
  const route = '/api/' + file.replace('.js', '');
  try {
    const handler = require(path.join(__dirname, file));
    app.all(route, (req, res) => {
      try {
        const fn = typeof handler === 'function'
          ? handler
          : typeof handler.default === 'function'
          ? handler.default
          : null;

        if (!fn) return res.status(500).json({ error: 'Invalid export in ' + file });
        return fn(req, res);
      } catch (err) {
        console.error('[' + route + ']', err);
        res.status(500).json({ error: 'Server error' });
      }
    });
    console.log('✔ Loaded:', route);
  } catch (e) {
    console.error('❌ Error loading', file, e.message);
  }
});

// ── ROUTE FORZATE (debug) ──
app.all('/api/discord', require('./discord.js'));
app.all('/api/tebex', require('./tebex.js'));

app.listen(PORT, () => {
  console.log('🚀 SkyFrost API running on http://localhost:' + PORT);
});
