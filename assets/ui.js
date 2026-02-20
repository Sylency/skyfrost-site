// SkyFrost UI helpers (logo fallback + copy buttons)
(function () {
  // ---- Logo fallback (works with both id-based and class-based markup) ----
  const img =
    document.getElementById("brandLogo") ||
    document.querySelector(".brand-badge img") ||
    document.querySelector(".brandBadge img");
  const fb =
    document.getElementById("brandFallback") ||
    document.querySelector(".brandFallback") ||
    document.querySelector(".brand-fallback");

  if (img && fb) {
    const candidates = ["assets/logo.png"];
    let i = 0;
    img.addEventListener("error", () => {
      i++;
      if (i < candidates.length) img.src = candidates[i];
      else {
        img.style.display = "none";
        fb.style.display = "grid";
      }
    });
  }

  // ---- Copy buttons (data-copy="...") ----
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.getAttribute("data-copy") || "";
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.innerHTML;
      btn.innerHTML = "Copiato";
      setTimeout(() => {
        btn.innerHTML = prev;
      }, 1200);
    } catch (e) {}
  });
})();