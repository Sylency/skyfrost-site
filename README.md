# SkyFrost Site — VPS Setup Guide

## 📁 Struttura

```
/var/www/Sito/skyfrost-site/
├── index.html
├── store.html
├── staff.html
├── login.html
├── supporto.html
├── wiki.html
├── vote.html
├── privacy.html
├── cookie.html
├── terms.html
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── favicon.svg
├── assets/
│   ├── style.css       ← tutti gli stili
│   ├── components.js   ← navbar, footer, canvas
│   ├── main.js         ← logica pagine
│   └── og-cover.svg    ← preview social
└── api/
    ├── server.js        ← Express server (porta 3001)
    ├── discord.js       ← GET /api/discord
    ├── auth.js          ← OAuth Discord + sessione (GET/POST /api/auth)
    ├── tickets.js       ← POST /api/tickets (invio ticket su webhook)
    ├── tebex.js         ← GET /api/tebex
    ├── status.js        ← GET /api/status (player count)
    ├── .env             ← token segreti (NON caricare su GitHub!)
    ├── .env.example     ← template .env
    ├── tests/           ← test automatici Node.js
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
| `DISCORD_GUILD_ID`     | ID server Discord (click destro server con Dev Mode)      |
| `DISCORD_CLIENT_ID`    | Discord Developer Portal → OAuth2 → Client ID             |
| `DISCORD_CLIENT_SECRET`| Discord Developer Portal → OAuth2 → Client Secret         |
| `DISCORD_WEBHOOK_URL`  | URL webhook canale ticket su Discord                       |
| `AUTH_SECRET`          | Stringa lunga random per firmare cookie sessione          |
| `TEBEX_WEBSTORE_TOKEN` | Tebex Dashboard → Headless/Store Token                     |
| `TEBEX_PUBLIC_TOKEN`   | Tebex Dashboard → API Keys → Public Token                  |
| `TEBEX_PRIVATE_KEY`    | Tebex Dashboard → Integrations → Game Servers → Secret Key |
| `TEBEX_PRIVATE_KEYS`   | (Opzionale) più Secret Key separate da virgola (multi-server) |
| `TEBEX_STORE_URL`      | (Opzionale) URL negozio pubblico, es. `https://store.skyfrost.it` |
| `AUTH_SUCCESS_REDIRECT`| (Opzionale) Redirect post-login, default `/supporto`  |
| `AUTH_LOGIN_REDIRECT`  | (Opzionale) Redirect error login, default `/login`    |
| `DISCORD_REDIRECT_URI` | (Opzionale) callback OAuth, default `<dominio>/api/auth`   |
| `GAME_SERVER_ADDRESS`  | (Opzionale) indirizzo server gioco, default `play.skyfrost.it` |
| `SERVER_STATUS_API_URL`| (Opzionale) endpoint status, usa `{server}` nel template URL |
| `STATUS_CACHE_TTL_MS`  | (Opzionale) cache endpoint status in millisecondi |
| `ONLINE_COUNT_FALLBACK`| (Opzionale) fallback player count se provider status non raggiungibile |
| `ALLOWED_ORIGINS`      | (Opzionale) origini CORS consentite, separate da virgola |
| `API_RATE_WINDOW_MS`   | (Opzionale) finestra rate-limit API (ms) |
| `API_RATE_MAX`         | (Opzionale) max richieste per IP nella finestra |
| `PORT`                 | Lascia 3001 (default)                                      |

---

## 🤖 Discord Bot — Intents obbligatori

1. Vai su [discord.com/developers/applications](https://discord.com/developers/applications)
2. Seleziona la tua applicazione → **Bot**
3. Abilita sotto "Privileged Gateway Intents":
   - ✅ **SERVER MEMBERS INTENT**
   - ✅ **PRESENCE INTENT** (per lo stato online)
4. Assicurati che il bot sia **nel tuo server Discord**

I gruppi ruolo in `api/discord.js` usano gli **ID ruolo Discord**:
```js
const STAFF_ROLE_GROUPS = [
  { label: 'Owner', roleIds: ['...'] },
  { label: 'Sr. Admin', roleIds: ['...'] },
  { label: 'Admin', roleIds: ['...'] },
  { label: 'Staff', roleIds: ['...'] }
];
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
curl http://localhost:3001/api/auth?action=session
curl http://localhost:3001/api/status
```

Controllo sintassi + test:
```bash
cd /var/www/Sito/skyfrost-site/api
npm run check
npm test
```

---

## 🌐 Nginx — Clean URLs + Proxy /api/*

Se nginx serve i tuoi file statici, aggiungi questo blocco al tuo config nginx
(`/etc/nginx/sites-available/skyfrost` o simile):

```nginx
server {
    # ... la tua config esistente (listen/server_name/ssl) ...

    root  /var/www/Sito/skyfrost-site;
    index index.html;

    # Redirect URL legacy *.html -> URL pulita
    location = /index.html {
        return 301 /;
    }
    location ~ ^/(.+)\.html$ {
        return 301 /$1$is_args$args;
    }

    # URL pulite: /wiki -> /wiki.html, /supporto -> /supporto.html, ecc.
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Proxy delle chiamate API verso Express
    location /api/ {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
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

## 📰 News Home da JSON

La sezione **Annunci** in `index.html` viene popolata da `assets/news.json`.

Formato base:
```json
{
  "updatedAt": "2026-03-02",
  "items": [
    {
      "badge": "Aggiornamento",
      "badgeClass": "badge-cyan",
      "title": "Titolo annuncio",
      "description": "Testo breve dell'annuncio",
      "author": "NomeStaff",
      "date": "2026-03-02"
    }
  ]
}
```

Campi supportati:
- `badgeClass`: `badge-cyan`, `badge-gold`, `badge-green`, `badge-red`, `badge-dim`
- `date`: formato `YYYY-MM-DD` (viene formattata automaticamente lato frontend)

Se `assets/news.json` non è disponibile o vuoto, il sito usa un fallback locale.

---

*SkyFrost © 2026*
