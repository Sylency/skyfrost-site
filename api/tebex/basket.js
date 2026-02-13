const { mustEnv, basicAuthHeader, json, baseUrl } = require("./_util.js");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

    const webstoreToken = mustEnv("TEBEX_WEBSTORE_TOKEN");
    const publicToken = mustEnv("TEBEX_PUBLIC_TOKEN");
    const privateKey = mustEnv("TEBEX_PRIVATE_KEY");

    const body = typeof req.body === "object" ? req.body : (() => {
      try { return JSON.parse(req.body || "{}"); } catch { return {}; }
    })();

    const username = body && body.username ? String(body.username).slice(0, 32) : null;

    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(webstoreToken)}/baskets`;

    const payload = {
      complete_url: `${baseUrl(req)}/profilo.html?thanks=1`,
      cancel_url: `${baseUrl(req)}/profilo.html`,
      complete_auto_redirect: true
    };

    // Utile per store “game server commands”: username -> username_id
    if (username) payload.username = username;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": basicAuthHeader(publicToken, privateKey),
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await r.text().catch(() => "");
    if (!r.ok) return json(res, r.status, { error: "tebex_create_basket_failed", detail: text });

    // Risposta tipica: { data: { ident: "..." ... } }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(text);
  } catch (e) {
    json(res, 500, { error: "basket_crashed", detail: String(e && e.message ? e.message : e) });
  }
};
