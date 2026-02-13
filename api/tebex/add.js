const { mustEnv, basicAuthHeader, json } = require("./_util.js");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

    const publicToken = mustEnv("TEBEX_PUBLIC_TOKEN");
    const privateKey = mustEnv("TEBEX_PRIVATE_KEY");

    const body = typeof req.body === "object" ? req.body : (() => {
      try { return JSON.parse(req.body || "{}"); } catch { return {}; }
    })();

    const basketIdent = body && body.basketIdent ? String(body.basketIdent) : null;
    const packageId = body && (body.package_id || body.packageId) ? String(body.package_id || body.packageId) : null;
    const quantity = Math.max(1, Math.min(99, Number(body.quantity || 1) || 1));

    if (!basketIdent || !packageId) return json(res, 400, { error: "missing_basket_or_package" });

    // Nota: endpoint "baskets/{basketIdent}/packages" NON usa accounts/{token} (vedi docs)
    const url = `https://headless.tebex.io/api/baskets/${encodeURIComponent(basketIdent)}/packages`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": basicAuthHeader(publicToken, privateKey),
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ package_id: packageId, quantity })
    });

    const text = await r.text().catch(() => "");
    if (!r.ok) return json(res, r.status, { error: "tebex_add_failed", detail: text });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(text);
  } catch (e) {
    json(res, 500, { error: "add_crashed", detail: String(e && e.message ? e.message : e) });
  }
};
