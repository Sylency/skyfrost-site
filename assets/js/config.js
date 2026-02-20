// assets/js/config.js
window.SITE_CONFIG = {
  brand: "Hytale Server",
  server: {
    // Se hai un endpoint tuo, mettilo qui e restituisci { online:true, players:12, maxPlayers:200, ip:"play.example.com" }
    statusEndpoint: "/api/server-status",
    fallbackIp: "play.example.com"
  },
  discord: {
    // Se hai un endpoint tuo, mettilo qui e restituisci { online: 123, invite: "https://discord.gg/xxxx" }
    statusEndpoint: "/api/discord-status",
    fallbackInvite: "https://discord.gg/yourinvite"
  },
  api: {
    // Base per le tue API (se sei su stesso dominio lascia "")
    baseUrl: ""
  },
  nav: [
    { label: "Home", href: "index.html" },
    { label: "Store", href: "store.html" },
    { label: "Staff", href: "staff.html" },
    { label: "Vote", href: "vote.html" },
    { label: "Dashboard", href: "dashboard.html" }
  ]
};