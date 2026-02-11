const { readCookie, verifyJWT } = require("./_lib.js");

function normName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .replace(/\./g, ""); // "Sr. Admin" -> "sr admin"
}

// Allowlist per NOME (funziona subito)
const ALLOWED_ROLE_NAMES = [
  "owner",
  "sr admin",
  "admin",
  "staff",
  "vip",
  "utente",
].map(normName);

module.exports = async (req, res) => {
  try {
    const authSecret = process.env.AUTH_SECRET;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!authSecret) return res.status(500).send("Missing AUTH_SECRET");
    if (!botToken) return res.status(500).send("Missing DISCORD_BOT_TOKEN");
    if (!guildId) return res.status(500).send("Missing DISCORD_GUILD_ID");

    // Optional: allowlist per ID (più robusto)
    // Su Vercel puoi aggiungere: DISCORD_ALLOWED_ROLE_IDS="id1,id2,id3"
    const allowedRoleIdsEnv = (process.env.DISCORD_ALLOWED_ROLE_IDS || "").trim();
    const allowedRoleIds = allowedRoleIdsEnv
      ? new Set(allowedRoleIdsEnv.split(",").map(s => s.trim()).filter(Boolean))
      : null;

    // 1) Chi è l'utente? (dal cookie sessione)
    const token = readCookie(req, "sf_session");
    const payload = token ? verifyJWT(decodeURIComponent(token), authSecret) : null;

    res.setHeader("Content-Type", "application/json");

    if (!payload?.user?.id) {
      return res.status(200).send(JSON.stringify({ ok: false, reason: "not_logged_in" }));
    }

    const userId = String(payload.user.id);

    // 2) Prendo il membro dal server Discord
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (memberRes.status === 404) {
      return res.status(200).send(JSON.stringify({ ok: false, reason: "not_in_guild" }));
    }

    if (!memberRes.ok) {
      const t = await memberRes.text().catch(() => "");
      return res.status(502).send(t || "Discord member fetch failed");
    }

    const member = await memberRes.json();
    const roleIds = Array.isArray(member.roles) ? member.roles : [];

    // 3) Prendo lista ruoli del server per convertire ID -> nome
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!rolesRes.ok) {
      const t = await rolesRes.text().catch(() => "");
      return res.status(502).send(t || "Discord roles fetch failed");
    }

    const allRoles = await rolesRes.json(); // [{id,name,color,position,...}]
    const roleMap = new Map(allRoles.map(r => [String(r.id), r]));

    // 4) Ruoli dell'utente con dettagli
    const fullRoles = roleIds
      .map(id => roleMap.get(String(id)))
      .filter(Boolean)
      // evita @everyone (spesso è guildId)
      .filter(r => String(r.id) !== String(guildId))
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .map(r => ({
        id: String(r.id),
        name: r.name,
        name_norm: normName(r.name),
        color: r.color || 0,
        position: r.position || 0,
      }));

    // 5) Filtro: SOLO ruoli allowlist (per nome) oppure per ID se configurato
    const filtered = fullRoles.filter(r => {
      if (allowedRoleIds) return allowedRoleIds.has(r.id);
      return ALLOWED_ROLE_NAMES.includes(r.name_norm);
    });

    // 6) Badges: scegliamo “il più alto” (position) come badge principale + lista completa filtrata
    const primary = filtered.length ? filtered[0] : null;

    return res.status(200).send(
      JSON.stringify({
        ok: true,
        roles: filtered.map(r => ({ id: r.id, name: r.name, color: r.color })),
        primaryRole: primary ? { id: primary.id, name: primary.name, color: primary.color } : null,
        booster: !!member.premium_since,
      })
    );
  } catch (e) {
    return res.status(500).send("roles crashed");
  }
};