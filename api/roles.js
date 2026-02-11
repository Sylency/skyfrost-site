const { readCookie, verifyJWT } = require("./_lib.js");

module.exports = async (req, res) => {
  try {
    const authSecret = process.env.AUTH_SECRET;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!authSecret) return res.status(500).send("Missing AUTH_SECRET");
    if (!botToken) return res.status(500).send("Missing DISCORD_BOT_TOKEN");
    if (!guildId) return res.status(500).send("Missing DISCORD_GUILD_ID");

    // 1) Chi è l'utente? (dal cookie sessione)
    const token = readCookie(req, "sf_session");
    const payload = token ? verifyJWT(decodeURIComponent(token), authSecret) : null;

    if (!payload?.user?.id) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(JSON.stringify({ ok: false, reason: "not_logged_in" }));
    }

    const userId = String(payload.user.id);

    // 2) Prendo il membro dal server Discord
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    if (memberRes.status === 404) {
      res.setHeader("Content-Type", "application/json");
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
      headers: { Authorization: `Bot ${botToken}` }
    });

    if (!rolesRes.ok) {
      const t = await rolesRes.text().catch(() => "");
      return res.status(502).send(t || "Discord roles fetch failed");
    }

    const allRoles = await rolesRes.json(); // [{id,name,color,...}]
    const roleMap = new Map(allRoles.map(r => [String(r.id), r]));

    // 4) Filtro e preparo output
    const roles = roleIds
      .map(id => roleMap.get(String(id)))
      .filter(Boolean)
      // evita @everyone (di solito è guildId)
      .filter(r => String(r.id) !== String(guildId))
      // ordina per position (più alto sopra)
      .sort((a, b) => (b.position || 0) - (a.position || 0))
      .map(r => ({
        id: String(r.id),
        name: r.name,
        color: r.color || 0
      }));

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(JSON.stringify({
      ok: true,
      roles,
      booster: !!member.premium_since
    }));
  } catch (e) {
    return res.status(500).send("roles crashed");
  }
};