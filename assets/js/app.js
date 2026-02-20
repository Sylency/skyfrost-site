// assets/js/app.js
(function(){
  const cfg = window.SITE_CONFIG;

  // set title
  document.title = document.title.replace("{BRAND}", cfg.brand);

  // build nav
  const nav = document.querySelector("[data-nav]");
  if(nav){
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    nav.innerHTML = cfg.nav.map(i => {
      const active = i.href.toLowerCase() === here ? "active" : "";
      return `<a class="${active}" href="${i.href}">${i.label}</a>`;
    }).join("");
  }

  // header stats
  const serverEl = document.querySelector("[data-server-stat]");
  const discordEl = document.querySelector("[data-discord-stat]");

  async function loadServer(){
    if(!serverEl) return;
    const data = await window.API.safeFetchJson(window.API.apiUrl(cfg.server.statusEndpoint), null);

    const online = data?.online ?? false;
    const players = Number.isFinite(data?.players) ? data.players : null;
    const maxPlayers = Number.isFinite(data?.maxPlayers) ? data.maxPlayers : null;
    const ip = data?.ip ?? cfg.server.fallbackIp;

    serverEl.querySelector("[data-pill]").className = `pill ${online ? "good" : "bad"}`;
    serverEl.querySelector("[data-pill]").textContent = online ? "Online" : "Offline";

    const line1 = (players !== null && maxPlayers !== null) ? `${players}/${maxPlayers}` : "-/-";
    serverEl.querySelector("[data-val]").textContent = `${line1} players online`;
    serverEl.querySelector("[data-sub]").textContent = ip;
  }

  async function loadDiscord(){
    if(!discordEl) return;
    const data = await window.API.safeFetchJson(window.API.apiUrl(cfg.discord.statusEndpoint), null);
    const online = Number.isFinite(data?.online) ? data.online : null;
    const invite = data?.invite ?? cfg.discord.fallbackInvite;

    discordEl.querySelector("[data-pill]").className = `pill good`;
    discordEl.querySelector("[data-pill]").textContent = "Community";

    discordEl.querySelector("[data-val]").textContent = `${online ?? "-/-"} members online`;
    discordEl.querySelector("[data-sub]").innerHTML = `<a href="${invite}" target="_blank" rel="noreferrer">Join Discord</a>`;
  }

  loadServer();
  loadDiscord();

  // refresh every 30s
  setInterval(loadServer, 30000);
  setInterval(loadDiscord, 30000);
})();