/**
 * ═══════════════════════════════════════════════════════════
 *  SKYFROST — api/discord.js  [CommonJS — VPS Express]
 *  Caricato automaticamente da server.js
 *  Disponibile su: GET /api/discord
 *
 *  SETUP nel file api/.env:
 *    DISCORD_BOT_TOKEN=il-tuo-token-qui
 *
 *  Abilita nel Discord Developer Portal → Bot → Privileged Intents:
 *    ✅ SERVER MEMBERS INTENT
 *    ✅ PRESENCE INTENT  (per lo stato online)
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const GUILD_ID = '1463926391660871703';

// Nomi ESATTI dei ruoli staff su Discord (case-sensitive)
const STAFF_ROLES = ['Owner', 'Sr. Admin', 'Admin', 'Staff'];
const ROLE_PRIORITY = Object.fromEntries(STAFF_ROLES.map((r, i) => [r, i]));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

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
    // 1. Fetch ruoli → mappa id:nome
    const rolesRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      { headers }
    );
    if (!rolesRes.ok) {
      const err = await rolesRes.json().catch(() => ({}));
      return res.status(rolesRes.status).json({ error: 'Errore fetch ruoli', details: err });
    }
    const rolesData = await rolesRes.json();
    const roleMap = {};
    for (const role of rolesData) {
      if (STAFF_ROLES.includes(role.name)) roleMap[role.id] = role.name;
    }

    // 2. Fetch membri
    const membersRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
      { headers }
    );
    if (!membersRes.ok) {
      const err = await membersRes.json().catch(() => ({}));
      return res.status(membersRes.status).json({ error: 'Errore fetch membri', details: err });
    }
    const members = await membersRes.json();

    // 3. Raggruppa per ruolo staff con priorità più alta
    const grouped = Object.fromEntries(STAFF_ROLES.map(r => [r, []]));

    for (const member of members) {
      if (member.user?.bot) continue;

      let topRole = null, topPriority = Infinity;
      for (const roleId of (member.roles || [])) {
        const roleName = roleMap[roleId];
        if (roleName !== undefined && ROLE_PRIORITY[roleName] < topPriority) {
          topRole = roleName;
          topPriority = ROLE_PRIORITY[roleName];
        }
      }
      if (!topRole) continue;

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
        status:      member.presence?.status ?? 'offline'
      });
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(grouped);

  } catch (err) {
    console.error('[/api/discord] Errore:', err);
    return res.status(500).json({ error: 'Errore interno', details: err.message });
  }
};
