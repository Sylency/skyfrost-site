// api/staff.js
// Restituisce lo staff del server Discord (Owner / Sr. Admin / Admin / Staff)
// Richiede env su Vercel:
// - DISCORD_BOT_TOKEN
// - DISCORD_GUILD_ID

function normName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'")
    .replace(/\./g, ""); // "Sr. Admin" -> "sr admin"
}

function avatarUrl(user) {
  if (!user) return null;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  // fallback default avatar
  const disc = Number(user.discriminator || 0);
  const idx = Number.isFinite(disc) ? (disc % 5) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

module.exports = async (req, res) => {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!botToken) return res.status(500).send("Missing DISCORD_BOT_TOKEN");
    if (!guildId) return res.status(500).send("Missing DISCORD_GUILD_ID");

    // 1) Ruoli del server (per trovare ID + posizione)
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!rolesRes.ok) {
      const t = await rolesRes.text().catch(() => "");
      return res.status(502).send(t || "Discord roles fetch failed");
    }
    const allRoles = await rolesRes.json(); // [{id,name,color,position,...}]

    const wanted = [
      { key: "owner", label: "Owner" },
      { key: "sr admin", label: "Sr. Admin" },
      { key: "admin", label: "Admin" },
      { key: "staff", label: "Staff" },
    ];

    const roleInfoByKey = new Map();
    for (const w of wanted) {
      const found = allRoles.find(r => normName(r.name) === w.key);
      if (found) {
        roleInfoByKey.set(w.key, {
          id: String(found.id),
          name: found.name,
          color: found.color || 0,
          position: found.position || 0,
        });
      }
    }

    // Se mancano ruoli, continuiamo lo stesso (mostriamo solo quelli trovati)
    const staffRoleKeys = wanted
      .map(w => w.key)
      .filter(k => roleInfoByKey.has(k));

    // 2) Scarico i membri (paginazione)
    // ATTENZIONE: se il server è enorme, questo può essere pesante.
    // Metto un cap di sicurezza per non far esplodere i tempi.
    const LIMIT = 1000;
    const HARD_CAP = 2000; // massimo membri letti
    let after = "0";
    let fetched = 0;
    const members = [];

    while (fetched < HARD_CAP) {
      const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
      url.searchParams.set("limit", String(LIMIT));
      url.searchParams.set("after", after);

      const memRes = await fetch(url.toString(), {
        headers: { Authorization: `Bot ${botToken}` },
      });

      if (!memRes.ok) {
        const t = await memRes.text().catch(() => "");
        return res.status(502).send(t || "Discord members fetch failed");
      }

      const batch = await memRes.json(); // array
      if (!Array.isArray(batch) || batch.length === 0) break;

      members.push(...batch);
      fetched += batch.length;

      const last = batch[batch.length - 1];
      after = last?.user?.id ? String(last.user.id) : after;

      if (batch.length < LIMIT) break;
    }

    // 3) Filtra membri con almeno uno staff role
    // Determina ruolo "più alto" tra quelli desiderati (in base a position)
    const staffByRoleKey = new Map(staffRoleKeys.map(k => [k, []]));

    for (const m of members) {
      const user = m.user;
      const roleIds = Array.isArray(m.roles) ? m.roles.map(String) : [];

      // prendi i ruoli staff che ha
      const staffRoles = staffRoleKeys
        .map(k => roleInfoByKey.get(k))
        .filter(Boolean)
        .filter(r => roleIds.includes(r.id));

      if (staffRoles.length === 0) continue;

      // ruolo più alto per position
      staffRoles.sort((a, b) => (b.position || 0) - (a.position || 0));
      const top = staffRoles[0];

      // trova la key corrispondente al ruolo top
      const topKey = staffRoleKeys.find(k => roleInfoByKey.get(k)?.id === top.id);
      if (!topKey) continue;

      staffByRoleKey.get(topKey).push({
        id: String(user.id),
        username: user.username,
        display: m.nick || user.global_name || user.username,
        avatar: avatarUrl(user),
      });
    }

    // ordina alfabeticamente ogni lista
    for (const k of staffRoleKeys) {
      staffByRoleKey.get(k).sort((a, b) => a.display.localeCompare(b.display, "it"));
    }

    // 4) Output (con colori ruolo)
    const out = wanted
      .map(w => {
        const info = roleInfoByKey.get(w.key);
        if (!info) return null;
        return {
          key: w.key,
          role: { name: info.name, color: info.color },
          members: staffByRoleKey.get(w.key) || [],
        };
      })
      .filter(Boolean);

    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(
      JSON.stringify({
        ok: true,
        fetched_members: fetched,
        sections: out,
      })
    );
  } catch (e) {
    return res.status(500).send("staff crashed");
  }
};