const { mustEnv, json } = require("./_util.js");

module.exports = async (req, res) => {
  try {
    const token = mustEnv("TEBEX_WEBSTORE_TOKEN");

    // Listings pubblici (categorie + pacchetti)
    const url = `https://headless.tebex.io/api/accounts/${encodeURIComponent(token)}/categories?includePackages=1`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });

    const text = await r.text().catch(() => "");
    if (!r.ok) return json(res, r.status, { error: "tebex_listings_failed", detail: text });

    // Tebex restituisce tipicamente { data: [...] }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(text);
  } catch (e) {
    json(res, 500, { error: "listings_crashed", detail: String(e && e.message ? e.message : e) });
  }
};
