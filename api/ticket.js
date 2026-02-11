export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    res.status(500).send("Missing DISCORD_WEBHOOK_URL");
    return;
  }

  let body = {};
  try {
    body = req.body || {};
  } catch {
    res.status(400).send("Bad request");
    return;
  }

  const name = String(body.name || "").slice(0, 80);
  const discord = String(body.discord || "").slice(0, 80);
  const subject = String(body.subject || "").slice(0, 120);
  const message = String(body.message || "").slice(0, 1800);

  if (!name || !subject || !message) {
    res.status(400).send("Missing fields");
    return;
  }

  // Embed Discord
  const embed = {
    title: "📩 Nuovo ticket SkyFrost",
    description: message,
    color: 0x7dd3fc,
    fields: [
      { name: "Nome", value: name, inline: true },
      ...(discord ? [{ name: "Discord", value: discord, inline: true }] : []),
      { name: "Motivo", value: subject, inline: false }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "SkyFrost Support",
        embeds: [embed]
      })
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      res.status(502).send(t || "Discord webhook error");
      return;
    }

    res.status(200).send("ok");
  } catch (e) {
    res.status(502).send("Network error");
  }
}
