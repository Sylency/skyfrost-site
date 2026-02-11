const { baseUrl, randomString, setCookie } = require("./_lib.js");

module.exports = async (req, res) => {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) return res.status(500).send("Missing DISCORD_CLIENT_ID");

    const state = randomString(16);

    setCookie(res, "sf_oauth_state", encodeURIComponent(state), {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 10 * 60,
    });

    const redirectUri = `${baseUrl(req)}/api/callback`;

    const url =
      "https://discord.com/api/oauth2/authorize" +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("identify")}` +
      `&state=${encodeURIComponent(state)}`;

    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    res.status(500).send("login crashed");
  }
};