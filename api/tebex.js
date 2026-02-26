/**
 * ═══════════════════════════════════════════════════════════
 *  SKYFROST — api/tebex.js  [CommonJS — VPS Express]
 *  Caricato automaticamente da server.js
 *
 *  Endpoints esposti:
 *    GET /api/tebex?type=categories
 *    GET /api/tebex?type=packages
 *    GET /api/tebex?type=packages&category=ID_CATEGORIA
 *    GET /api/tebex?type=package&id=ID_PACCHETTO
 *
 *  SETUP nel file api/.env:
 *    TEBEX_PUBLIC_TOKEN=il-tuo-public-token
 *
 *  Trovi il token in: Tebex Dashboard → API Keys → Public Token
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const TEBEX_BASE = 'https://headless.tebex.io/api';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = process.env.TEBEX_PUBLIC_TOKEN;
  if (!TOKEN) {
    return res.status(500).json({
      error: 'TEBEX_PUBLIC_TOKEN non configurato.',
      hint:  'Aggiungilo nel file api/.env'
    });
  }

  const { type, id, category } = req.query;

  let tebexUrl = '';
  switch (type) {
    case 'categories':
      tebexUrl = `${TEBEX_BASE}/accounts/${TOKEN}/categories`;
      break;
    case 'packages':
      tebexUrl = category
        ? `${TEBEX_BASE}/accounts/${TOKEN}/categories/${category}/packages`
        : `${TEBEX_BASE}/accounts/${TOKEN}/packages`;
      break;
    case 'package':
      if (!id) return res.status(400).json({ error: 'Manca il parametro id' });
      tebexUrl = `${TEBEX_BASE}/accounts/${TOKEN}/packages/${id}`;
      break;
    default:
      return res.status(400).json({
        error:   'Parametro type non valido.',
        allowed: ['categories', 'packages', 'package']
      });
  }

  try {
    const tebexRes = await fetch(tebexUrl, {
      headers: { Accept: 'application/json' }
    });

    if (!tebexRes.ok) {
      const text = await tebexRes.text();
      return res.status(tebexRes.status).json({ error: 'Errore Tebex API', details: text });
    }

    const data = await tebexRes.json();
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[/api/tebex] Errore:', err);
    return res.status(500).json({ error: 'Errore interno', details: err.message });
  }
};
