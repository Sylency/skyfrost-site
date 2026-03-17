/**
 * ═══════════════════════════════════════════════════════════
 *  SKYFROST — api/discord.js  [CommonJS — VPS Express]
 *  Caricato automaticamente da server.js
 *  Disponibile su: GET /api/discord
 *
 *  SETUP nel file api/.env:
 *    DISCORD_BOT_TOKEN=il-tuo-token-qui
 *    DISCORD_GUILD_ID=id-della-tua-gilda
 *    (Opzionale ma consigliato) npm i discord.js  ← per presence real-time
 *
 *  Abilita nel Discord Developer Portal → Bot → Privileged Intents:
 *    ✅ SERVER MEMBERS INTENT
 *    ✅ PRESENCE INTENT  (per lo stato online)
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const { applyCors, isAllowedOrigin } = require('./auth-utils.cjs');

const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '1463926391660871703').trim();
const MEMBERS_PAGE_SIZE = 1000;
const GATEWAY_BATCH_SIZE = 100;
const VALID_STATUSES = new Set(['online', 'idle', 'dnd', 'offline']);

// Configurazione ruoli staff visualizzati sul sito (dall'alto verso il basso).
// Usa sempre gli ID come stringhe: gli Snowflake Discord non vanno gestiti come Number.
const STAFF_ROLE_GROUPS = [
  { label: 'Owner',     roleIds: ['1463926392109662350'] },
  { label: 'Sr. Admin', roleIds: ['1463926392109662348'] },
  { label: 'Admin',     roleIds: ['1463926392071786576'] },
  { label: 'Staff',     roleIds: ['1463926392071786575'] }
];

// Cache in memoria per evitare Rate Limit di Discord
let internalCache = {
  data: null,
  presenceAvailable: false,
  lastFetch: 0
};
const CACHE_TTL_MS = 60 * 1000; // 1 minuto di cache server-side

const ROLE_PRIORITY = Object.fromEntries(
  STAFF_ROLE_GROUPS.map((group, i) => [group.label, i])
);

let discordJsLib = undefined;
let discordClient = null;
let discordClientBootPromise = null;
let warnedMissingDiscordJs = false;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeStatus(value) {
  return VALID_STATUSES.has(value) ? value : null;
}

function makeHttpError(httpStatus, message, details) {
  const err = new Error(message);
  err.httpStatus = httpStatus;
  err.details = details;
  return err;
}

function loadDiscordJs() {
  if (discordJsLib !== undefined) return discordJsLib;
  try {
    discordJsLib = require('discord.js');
  } catch {
    discordJsLib = null;
  }
  return discordJsLib;
}

async function fetchGuildMembers(headers) {
  const members = [];
  let after = null;

  while (true) {
    const query = new URLSearchParams({ limit: String(MEMBERS_PAGE_SIZE) });
    if (after) query.set('after', after);

    const membersRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members?${query.toString()}`,
      { headers }
    );

    if (!membersRes.ok) {
      const details = await membersRes.json().catch(() => ({}));
      throw makeHttpError(membersRes.status, 'Errore fetch membri', details);
    }

    const chunk = await membersRes.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    members.push(...chunk);

    if (chunk.length < MEMBERS_PAGE_SIZE) break;
    const lastId = chunk[chunk.length - 1]?.user?.id;
    if (!lastId) break;
    after = String(lastId);
  }

  return members;
}

async function getDiscordClient(botToken) {
  const discordJs = loadDiscordJs();
  if (!discordJs) return null;

  if (discordClient && discordClient.isReady()) return discordClient;
  if (discordClientBootPromise) return discordClientBootPromise;

  const { Client, GatewayIntentBits } = discordJs;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences
    ]
  });

  discordClientBootPromise = (async () => {
    const readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Discord gateway ready timeout'));
      }, 15000);

      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        clearTimeout(timer);
        client.removeListener('ready', onReady);
        client.removeListener('error', onError);
      };

      client.once('ready', onReady);
      client.once('error', onError);
    });

    try {
      await client.login(botToken);
      await readyPromise;
      discordClient = client;
      return client;
    } catch (err) {
      try { client.destroy(); } catch {}
      throw err;
    }
  })();

  try {
    return await discordClientBootPromise;
  } catch (err) {
    discordClientBootPromise = null;
    throw err;
  }
}

async function fetchPresenceMap(botToken, userIds) {
  const normalizedIds = [...new Set(
    (userIds || [])
      .map((id) => String(id || '').trim())
      .filter(Boolean)
  )];

  if (!normalizedIds.length) {
    return { supported: true, map: new Map(), observedPresenceFields: 0 };
  }

  const client = await getDiscordClient(botToken);
  if (!client) {
    return { supported: false, map: new Map(), observedPresenceFields: 0 };
  }

  const guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);
  const map = new Map();
  let observedPresenceFields = 0;

  for (let i = 0; i < normalizedIds.length; i += GATEWAY_BATCH_SIZE) {
    const batch = normalizedIds.slice(i, i + GATEWAY_BATCH_SIZE);
    const collection = await guild.members.fetch({
      user: batch,
      withPresences: true,
      force: true,
      cache: true
    });

    for (const member of collection.values()) {
      const rawStatus = member?.presence?.status;
      if (typeof rawStatus === 'string') observedPresenceFields += 1;
      const status = normalizeStatus(rawStatus);
      if (status) map.set(member.id, status);
    }
  }

  return { supported: true, map, observedPresenceFields };
}

module.exports = async function handler(req, res) {
  applyCors(req, res, { methods: 'GET, OPTIONS', headers: 'Content-Type' });
  const origin = safeText(req.headers.origin, '');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (origin && !isAllowedOrigin(req, origin)) {
    return res.status(403).json({ error: 'Origin non autorizzata' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Controllo Cache in memoria
  const now = Date.now();
  if (internalCache.data && (now - internalCache.lastFetch < CACHE_TTL_MS)) {
    res.setHeader('X-Discord-Presence', internalCache.presenceAvailable ? 'available' : 'missing');
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(internalCache.data);
  }

  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({
      error: 'DISCORD_BOT_TOKEN non configurato.',
      hint:  'Aggiungilo nel file api/.env'
    });
  }

  const headers = {
    Authorization:  `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Mappa id-ruolo Discord -> categoria sito
    const roleIdsToLabel = new Map();
    for (const group of STAFF_ROLE_GROUPS) {
      for (const roleId of (group.roleIds || [])) {
        const cleaned = String(roleId || '').trim();
        if (cleaned) roleIdsToLabel.set(cleaned, group.label);
      }
    }

    // 2. Fetch membri (REST) per identificare ruoli staff.
    const members = await fetchGuildMembers(headers);

    // 3. Raggruppa per ruolo staff con priorità più alta (status default: offline)
    const grouped = Object.fromEntries(STAFF_ROLE_GROUPS.map(group => [group.label, []]));
    const staffUserIds = [];

    for (const member of members) {
      if (member.user?.bot) continue;

      let topRole = null, topPriority = Infinity;
      for (const roleId of (member.roles || [])) {
        const roleName = roleIdsToLabel.get(roleId);
        if (roleName !== undefined && ROLE_PRIORITY[roleName] < topPriority) {
          topRole = roleName;
          topPriority = ROLE_PRIORITY[roleName];
        }
      }
      if (!topRole) continue;
      staffUserIds.push(member.user.id);

      const user = member.user;
      const hash = user.avatar;
      const avatarUrl = hash
        ? `https://cdn.discordapp.com/avatars/${user.id}/${hash}.${hash.startsWith('a_') ? 'gif' : 'png'}?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;

      grouped[topRole].push({
        id:          user.id,
        username:    user.username,
        displayName: member.nick || user.global_name || user.username,
        avatar:      avatarUrl,
        status:      'offline'
      });
    }

    // 4. Presence reali via Gateway (se discord.js disponibile)
    let membersWithPresence = 0;
    try {
      const presenceResult = await fetchPresenceMap(BOT_TOKEN, staffUserIds);
      if (!presenceResult.supported) {
        if (!warnedMissingDiscordJs) {
          warnedMissingDiscordJs = true;
          console.warn(
            '[/api/discord] discord.js non installato: status staff in fallback offline. Esegui: npm i discord.js'
          );
        }
      } else if (staffUserIds.length > 0 && presenceResult.observedPresenceFields === 0) {
        console.warn(
          '[/api/discord] Presence assenti dal Gateway. Verifica PRESENCE INTENT e permessi bot.'
        );
      }

      for (const role of Object.keys(grouped)) {
        for (const staffMember of grouped[role]) {
          const status = normalizeStatus(presenceResult.map.get(staffMember.id));
          if (status) {
            staffMember.status = status;
            membersWithPresence += 1;
          }
        }
      }
    } catch (presenceErr) {
      console.warn('[/api/discord] Presence fetch fallback offline:', presenceErr.message);
    }

    // 5. Statistiche gilda (membri totali/online)
    let guildStats = { total: null, online: null };
    try {
      const client = await getDiscordClient(BOT_TOKEN);
      if (client) {
        const guild = await client.guilds.fetch(GUILD_ID);
        guildStats.total = guild.memberCount;

        // `approximatePresenceCount` è valorizzato solo per gilde grandi (>1000 membri).
        // Per le gilde più piccole, è `null` e dobbiamo contare manualmente.
        if (guild.approximatePresenceCount) {
          guildStats.online = guild.approximatePresenceCount;
        } else {
          // Fallback per gilde piccole. Richiede gli intent `GUILD_MEMBERS` e `GUILD_PRESENCES`.
          // Contiamo i membri (non bot) la cui presenza non è 'offline'.
          const members = await guild.members.fetch({ withPresences: true });
          guildStats.online = members.filter(
            (member) => !member.user.bot && member.presence?.status !== 'offline'
          ).size;
        }
      }
    } catch (e) {
      // Non blocca la richiesta, i conteggi saranno null.
      // L'errore (es. discord.js non installato) è già loggato da altre parti.
      console.warn('[/api/discord] Impossibile recuperare le statistiche della gilda:', e.message);
    }

    const responseData = {
      staff: grouped,
      guild: guildStats
    };

    // Aggiornamento Cache
    internalCache = {
      data: responseData,
      presenceAvailable: membersWithPresence > 0 || (guildStats.online !== null),
      lastFetch: Date.now()
    };

    res.setHeader('X-Discord-Presence', internalCache.presenceAvailable ? 'available' : 'missing');
    res.setHeader('X-Cache-Status', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(responseData);

  } catch (err) {
    if (err?.httpStatus) {
      return res.status(err.httpStatus).json({ error: err.message, details: err.details || {} });
    }
    console.error('[/api/discord] Errore:', err);
    return res.status(500).json({ error: 'Errore interno', details: err.message });
  }
};
