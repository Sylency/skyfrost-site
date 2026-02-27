# SkyFrost Site — VPS Setup Guide

## 📁 Struttura

```
/var/www/Sito/skyfrost-site/
├── index.html
├── store.html
├── staff.html
├── login.html
├── register.html
├── dashboard.html
├── vote.html
├── assets/
│   ├── style.css       ← tutti gli stili
│   ├── components.js   ← navbar, footer, canvas
│   └── main.js         ← logica pagine
└── api/
    ├── server.js        ← Express server (porta 3001)
    ├── discord.js       ← GET /api/discord
    ├── tebex.js         ← GET /api/tebex
    ├── .env             ← token segreti (NON caricare su GitHub!)
    ├── .env.example     ← template .env
    └── package.json
```

---

## ⚙️ Setup API (prima volta)

```bash
cd /var/www/Sito/skyfrost-site/api

# Installa dipendenze
npm install

# Crea il file .env dai token
cp .env.example .env
nano .env   # <-- inserisci i tuoi token reali
```

---

## 🔑 Variabili .env

| Variabile              | Dove trovarla                                              |
|------------------------|------------------------------------------------------------|
| `DISCORD_BOT_TOKEN`    | discord.com/developers → La tua app → Bot → Token         |
| `TEBEX_PUBLIC_TOKEN`   | Tebex Dashboard → API Keys → Public Token                  |
| `PORT`                 | Lascia 3001 (default)                                      |

---

## 🤖 Discord Bot — Intents obbligatori

1. Vai su [discord.com/developers/applications](https://discord.com/developers/applications)
2. Seleziona la tua applicazione → **Bot**
3. Abilita sotto "Privileged Gateway Intents":
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT** (per lo stato online)
4. Assicurati che il bot sia **nel tuo server Discord**

I nomi dei ruoli in `api/discord.js` devono corrispondere **esattamente** ai tuoi ruoli Discord:
```js
const STAFF_ROLES = ['Owner', 'Admin', 'Moderatore', 'Builder', 'Helper'];
```

---

## 🚀 Avvio server API

### Con PM2 (raccomandato — sopravvive ai riavvii):
```bash
npm install -g pm2
cd /var/www/Sito/skyfrost-site/api
pm2 start server.js --name skyfrost-api
pm2 save
pm2 startup   # per avvio automatico al boot
```

### Oppure con node direttamente (solo per test):
```bash
cd /var/www/Sito/skyfrost-site/api
node server.js
```

Test che funzioni:
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/discord
```

---

## 🌐 Nginx — Proxy /api/*

Se nginx serve i tuoi file statici, aggiungi questo blocco al tuo config nginx
(`/etc/nginx/sites-available/skyfrost` o simile):

```nginx
server {
    # ... la tua config esistente ...

    # Proxy delle chiamate API verso Express
    location /api/ {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}
```

Poi ricarica nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Se NON usi nginx, apri `assets/main.js` e cambia:
```js
const API_BASE = '/api';
// → diventa:
const API_BASE = 'http://tuodominio.it:3001/api';
```

---

## 🗳️ Vote Links

In `vote.html` sono configurati questi siti:
```html
data-vote-url="https://hytaleservers.it/server/86-skyfrost"
data-vote-url="https://servers.hytale.it/server/40-skyfrost"
data-vote-url="https://hytalist.com/skyfrost"
data-vote-url="https://hytale-italia.com/servers/skyfrost"
```

---

*SkyFrost © 2026*
