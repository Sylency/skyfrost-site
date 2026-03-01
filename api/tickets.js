'use strict';

const {
  SESSION_COOKIE_NAME,
  parseCookies,
  verifySessionToken,
  getAuthSecret,
  isAllowedOrigin,
  applyCors
} = require('./auth-utils.cjs');

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clamp(text, maxLen) {
  return String(text || '').slice(0, maxLen);
}

function sanitizeForDiscord(text, maxLen) {
  return clamp(String(text || '').replace(/@/g, '@\u200b'), maxLen);
}

function getSession(req) {
  const secret = getAuthSecret();
  if (!secret) return { error: 'AUTH_SECRET non configurato' };

  const token = parseCookies(req)[SESSION_COOKIE_NAME];
  const payload = verifySessionToken(token, secret);
  if (!payload) return null;
  return payload;
}

function readableCategory(value) {
  const raw = safeText(value, 'Generale');
  const allowed = new Set(['Generale', 'Bug', 'Store', 'Ban Appeal', 'Partnership']);
  return allowed.has(raw) ? raw : 'Generale';
}

function readablePriority(value) {
  const raw = safeText(value, 'Normale');
  const allowed = new Set(['Normale', 'Alta', 'Critica']);
  return allowed.has(raw) ? raw : 'Normale';
}

module.exports = async function handler(req, res) {
  applyCors(req, res, {
    methods: 'POST, OPTIONS',
    headers: 'Content-Type',
    credentials: true
  });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = safeText(req.headers.origin, '');
  if (origin && !isAllowedOrigin(req, origin)) {
    return res.status(403).json({ error: 'Origin non autorizzata' });
  }

  const webhookUrl = safeText(process.env.DISCORD_WEBHOOK_URL, '');
  if (!webhookUrl) {
    return res.status(500).json({
      error: 'DISCORD_WEBHOOK_URL non configurato',
      hint: 'Aggiungi DISCORD_WEBHOOK_URL in api/.env'
    });
  }

  const session = getSession(req);
  if (session?.error) return res.status(500).json({ error: session.error });
  if (!session) return res.status(401).json({ error: 'Non autenticato' });

  const category = readableCategory(req.body?.category);
  const priority = readablePriority(req.body?.priority);
  const subject = sanitizeForDiscord(safeText(req.body?.subject, ''), 120);
  const message = sanitizeForDiscord(safeText(req.body?.message, ''), 2000);

  if (!subject) return res.status(400).json({ error: 'Oggetto ticket obbligatorio' });
  if (message.length < 20) return res.status(400).json({ error: 'Descrizione troppo corta (minimo 20 caratteri)' });

  const userId = safeText(session.sub, '');
  const username = safeText(session.globalName, safeText(session.username, 'DiscordUser'));
  const safeUsername = sanitizeForDiscord(username, 80);
  const ticketId = `SF-${Date.now().toString(36).toUpperCase()}`;
  const supportRoleId = safeText(process.env.DISCORD_SUPPORT_ROLE_ID, '');

  const payload = {
    content: supportRoleId ? `<@&${supportRoleId}> Nuovo ticket ${ticketId}` : `Nuovo ticket ${ticketId}`,
    username: 'SkyFrost Support',
    allowed_mentions: {
      parse: [],
      roles: supportRoleId ? [supportRoleId] : []
    },
    embeds: [
      {
        title: `Ticket ${ticketId} · ${subject}`,
        color: 6215679,
        description: message,
        fields: [
          { name: 'Utente', value: `${safeUsername} (\`${userId}\`)`, inline: false },
          { name: 'Categoria', value: category, inline: true },
          { name: 'Priorità', value: priority, inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'SkyFrost Ticket System' }
      }
    ]
  };

  try {
    const hookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!hookRes.ok) {
      const details = safeText(await hookRes.text().catch(() => ''), `HTTP ${hookRes.status}`);
      throw new Error(details);
    }

    return res.status(200).json({
      ok: true,
      ticketId,
      message: 'Ticket inviato correttamente.'
    });
  } catch (err) {
    console.error('[/api/tickets] Errore invio webhook:', err);
    return res.status(502).json({
      error: 'Impossibile inviare il ticket al webhook Discord',
      details: safeText(err.message, 'Errore sconosciuto')
    });
  }
};
