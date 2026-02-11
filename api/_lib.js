const crypto = require("crypto");

function baseUrl(req) {
  return process.env.BASE_URL || `https://${req.headers.host}`;
}

function randomString(len = 16) {
  return crypto.randomBytes(len).toString("hex");
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${value}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`Path=${opts.path || "/"}`);
  parts.push(`SameSite=${opts.sameSite || "Lax"}`);
  // NON sovrascrive altri cookie
  const prev = res.getHeader("Set-Cookie");
  const next = Array.isArray(prev) ? prev.concat(parts.join("; ")) : prev ? [prev, parts.join("; ")] : [parts.join("; ")];
  res.setHeader("Set-Cookie", next);
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0, httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}
function fromB64url(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString("utf8");
}

function signJWT(payload, secret, expSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = Object.assign({}, payload, { iat: now, exp: now + expSeconds });

  const h = b64urlJson(header);
  const p = b64urlJson(body);
  const data = `${h}.${p}`;

  const sig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${sig}`;
}

function verifyJWT(token, secret) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (expected !== s) return null;

  const payload = JSON.parse(fromB64url(p));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;

  return payload;
}

function readCookie(req, name) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

module.exports = { baseUrl, randomString, setCookie, clearCookie, signJWT, verifyJWT, readCookie };