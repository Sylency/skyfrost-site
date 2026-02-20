// assets/js/dashboard.js
(function(){
  window.AUTH.requireAuth();

  const logoutBtn = document.querySelector("[data-logout]");
  if(logoutBtn) logoutBtn.addEventListener("click", window.AUTH.logoutDemo);

  // Esempio: carica dati dashboard
  (async () => {
    const box = document.querySelector("[data-dashboard-box]");
    if(!box) return;

    const data = await window.API.safeFetchJson(window.API.apiUrl("/api/dashboard"), null);
    const d = data ?? {
      salesToday: 0,
      totalMembers: 0,
      ticketsOpen: 0,
      lastPurchase: "—"
    };

    box.innerHTML = `
      <div class="row">
        <div class="col">
          <div class="item">
            <div class="meta">Sales Today</div>
            <div style="font-size:22px;font-weight:900;margin-top:6px">${d.salesToday}€</div>
          </div>
        </div>
        <div class="col">
          <div class="item">
            <div class="meta">Members</div>
            <div style="font-size:22px;font-weight:900;margin-top:6px">${d.totalMembers}</div>
          </div>
        </div>
        <div class="col">
          <div class="item">
            <div class="meta">Open Tickets</div>
            <div style="font-size:22px;font-weight:900;margin-top:6px">${d.ticketsOpen}</div>
          </div>
        </div>
      </div>
      <div class="notice" style="margin-top:12px">
        <strong>Last Purchase:</strong> ${d.lastPurchase}
      </div>
    `;
  })();
})();