export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return res.status(500).send("Missing DISCORD_WEBHOOK_URL");

  const ROLE_ID = "1471072227549122652"; // <-- incolla qui l'ID ruolo supporto

  const body = req.body || {};
  const name = String(body.name || "").slice(0, 80);
  const discord = String(body.discord || "").slice(0, 80);
  const subject = String(body.subject || "").slice(0, 120);
  const message = String(body.message || "").slice(0, 1800);

  if (!name || !subject || !message) return res.status(400).send("Missing fields");

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

  const payload = {
    username: "SkyFrost Support",
    content: ROLE_ID && ROLE_ID !== "1471072227549122652" ? `<@&${ROLE_ID}>` : "",
    embeds: [embed]
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return res.status(502).send(t || "Discord webhook error");
    }

    return res.status(200).send("ok");
  } catch {
    return res.status(502).send("Network error");
  }
}