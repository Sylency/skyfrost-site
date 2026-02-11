const { readCookie, verifyJWT } = require("./_lib.js");

module.exports = async (req, res) => {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return res.status(500).send("Missing AUTH_SECRET");

  const token = readCookie(req, "sf_session");
  const payload = token ? verifyJWT(decodeURIComponent(token), authSecret) : null;

  res.setHeader("Content-Type", "application/json");
  if (!payload || !payload.user) return res.status(200).send(JSON.stringify({ loggedIn: false }));

  res.status(200).send(JSON.stringify({ loggedIn: true, user: payload.user }));
};