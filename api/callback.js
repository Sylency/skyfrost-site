import { baseUrl, readCookie, clearCookie, setCookie, signJWT } from "./_lib.js";

export default async function handler(req, res) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const authSecret = process.env.AUTH_SECRET;

  if (!clientId || !clientSecret || !authSecret) {
    return res.status(500).send("Missing env vars");
  }

  const { code, state } = req.query || {};
  if (!code || !state) return res.status(400).send("Missing code/state");

  const expected = readCookie(req, "sf_oauth_state");
  if (!expected || expected !== state) return res.status(400).send("Bad state");

  clearCookie(res, "sf_oauth_state");

  const redirectUri = `${baseUrl(req)}/api/callback`;

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("grant_type", "authorization_code");
  params.set("code", code);
  params.set("redirect_uri", redirectUri);

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text().catch(() => "");
    return res.status(502).send(t || "Token exchange failed");
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    const t = await meRes.text().catch(() => "");
    return res.status(502).send(t || "User fetch failed");
  }

  const me = await meRes.json();

  const user = {
    id: String(me.id),
    username: me.global_name || me.username || "User",
    avatar: me.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png`
      : null,
  };

  const jwt = signJWT({ user }, authSecret, 60 * 60 * 24 * 7);

  setCookie(res, "sf_session", encodeURIComponent(jwt), {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  res.writeHead(302, { Location: "/dashboard.html" });
  res.end();
}
