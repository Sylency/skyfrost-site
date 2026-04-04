(function () {
  'use strict';

  window.SkyFrost = window.SkyFrost || {};
  const { SkyFrost } = window;

  function createFlagDataUri(svg) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const SUPPORTED_LANGS = [
    {
      code: 'it',
      name: 'Italiano',
      flag: '🇮🇹',
      flagSvg: createFlagDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="6" height="12" fill="#009246"/><rect x="6" width="6" height="12" fill="#ffffff"/><rect x="12" width="6" height="12" fill="#ce2b37"/></svg>')
    },
    {
      code: 'en',
      name: 'English',
      flag: '🇬🇧',
      flagSvg: createFlagDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="18" height="12" fill="#012169"/><path d="M0 0l18 12M18 0L0 12" stroke="#ffffff" stroke-width="2.4"/><path d="M0 0l18 12M18 0L0 12" stroke="#c8102e" stroke-width="1.2"/><path d="M9 0v12M0 6h18" stroke="#ffffff" stroke-width="4"/><path d="M9 0v12M0 6h18" stroke="#c8102e" stroke-width="2.2"/></svg>')
    },
    {
      code: 'es',
      name: 'Español',
      flag: '🇪🇸',
      flagSvg: createFlagDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="18" height="12" fill="#aa151b"/><rect y="3" width="18" height="6" fill="#f1bf00"/></svg>')
    },
    {
      code: 'fr',
      name: 'Français',
      flag: '🇫🇷',
      flagSvg: createFlagDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="6" height="12" fill="#0055a4"/><rect x="6" width="6" height="12" fill="#ffffff"/><rect x="12" width="6" height="12" fill="#ef4135"/></svg>')
    },
    {
      code: 'de',
      name: 'Deutsch',
      flag: '🇩🇪',
      flagSvg: createFlagDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 12"><rect width="18" height="4" fill="#000000"/><rect y="4" width="18" height="4" fill="#dd0000"/><rect y="8" width="18" height="4" fill="#ffce00"/></svg>')
    }
  ];
  const DEFAULT_LANG = 'it';
  const LANG_KEY = 'sf_lang';
  const EXTRA_DICTIONARY = {
    it: {},
    en: {},
    es: {},
    fr: {},
    de: {}
  };

  let currentLang = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  if (!SUPPORTED_LANGS.find(l => l.code === currentLang)) currentLang = DEFAULT_LANG;
  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'content'];

  let dictionary = {};

  async function loadDictionary() {
    try {
      const res = await fetch('/assets/lang.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load lang.json');
      dictionary = await res.json();
      dictionary = Object.fromEntries(SUPPORTED_LANGS.map((lang) => [
        lang.code,
        {
          ...(lang.code === DEFAULT_LANG ? {} : (dictionary.en || {})),
          ...(lang.code === DEFAULT_LANG ? {} : (EXTRA_DICTIONARY.en || {})),
          ...(dictionary[lang.code] || {}),
          ...(EXTRA_DICTIONARY[lang.code] || {})
        }
      ]));
    } catch (err) {
      console.error('i18n Load Error:', err);
      dictionary = Object.fromEntries(SUPPORTED_LANGS.map((lang) => [lang.code, {
        ...(lang.code === DEFAULT_LANG ? {} : (EXTRA_DICTIONARY.en || {})),
        ...(EXTRA_DICTIONARY[lang.code] || {})
      }]));
    }
  }

  function getTexts(langCode = currentLang) {
    return dictionary[langCode] || dictionary[DEFAULT_LANG] || {};
  }

  function interpolate(template, vars = {}) {
    return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => (
      Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`
    ));
  }

  SkyFrost.getLanguage = function () {
    return currentLang;
  };

  SkyFrost.t = function (key, vars = {}, langCode = currentLang, fallback = '') {
    const texts = getTexts(langCode);
    const base = texts[key] ?? getTexts(DEFAULT_LANG)[key] ?? fallback ?? key;
    return interpolate(base, vars);
  };

  function applyTranslations({ dispatchEvent = false } = {}) {
    const texts = dictionary[currentLang] || dictionary[DEFAULT_LANG] || {};
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (texts[key]) {
        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('placeholder') !== null) {
          el.setAttribute('placeholder', texts[key]);
        } else {
          el.innerHTML = texts[key];
        }
      }
    });

    TRANSLATABLE_ATTRS.forEach(attr => {
      const attrName = `data-i18n-${attr}`;
      document.querySelectorAll(`[${attrName}]`).forEach(el => {
        const key = el.getAttribute(attrName);
        if (texts[key]) {
          el.setAttribute(attr, texts[key]);
        }
      });
    });

    document.documentElement.lang = currentLang;

    if (dispatchEvent) {
      document.dispatchEvent(new CustomEvent('skyfrost:languagechange', {
        detail: { lang: currentLang, texts }
      }));
    }
  }

  function setLanguage(langCode) {
    if (!SUPPORTED_LANGS.find(l => l.code === langCode)) return;
    currentLang = langCode;
    localStorage.setItem(LANG_KEY, langCode);
    applyTranslations({ dispatchEvent: true });
    syncLanguageSelectors();
  }

  function getSupportedLanguage(langCode = currentLang) {
    return SUPPORTED_LANGS.find((lang) => lang.code === langCode) || SUPPORTED_LANGS[0];
  }

  function syncLanguageSelectors(langCode = currentLang) {
    const selectedLang = getSupportedLanguage(langCode);
    document.querySelectorAll('.lang-select').forEach((select) => {
      select.value = selectedLang.code;
    });
    document.querySelectorAll('.lang-select-wrap').forEach((wrap) => {
      const flag = wrap.querySelector('.lang-select-flag');
      if (!flag) return;
      flag.src = selectedLang.flagSvg;
      flag.alt = selectedLang.name;
      flag.title = selectedLang.name;
    });
  }

  function buildLanguageSelector(container, { mobile = false } = {}) {
    if (!container) return;

    const wrap = document.createElement('div');
    wrap.className = `lang-select-wrap${mobile ? ' mob' : ''}`;

    const flag = document.createElement('img');
    flag.className = 'lang-select-flag';
    flag.width = 18;
    flag.height = 12;
    flag.decoding = 'async';

    const select = document.createElement('select');
    select.className = `lang-select${mobile ? ' mob' : ''}`;
    select.setAttribute('aria-label', 'Seleziona lingua');

    SUPPORTED_LANGS.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = mobile ? lang.name : lang.code.toUpperCase();
      if (lang.code === currentLang) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', (event) => {
      setLanguage(event.target.value);
    });

    wrap.append(flag, select);
    container.innerHTML = '';
    container.appendChild(wrap);
    syncLanguageSelectors();
  }

  SkyFrost.initI18n = async function () {
    await loadDictionary();
    applyTranslations({ dispatchEvent: true });

    // Setup language selector in navbar
    buildLanguageSelector(document.getElementById('lang-selector-container'));
    buildLanguageSelector(document.getElementById('mob-lang-selector-container'), { mobile: true });
  };

  Object.assign(EXTRA_DICTIONARY.it, {
    meta_site_name: 'SkyFrost Network',
    meta_home_title: 'SkyFrost Network',
    meta_home_desc: 'SkyFrost Network: community italiana con server Minecraft e Hytale, news, store ufficiale, staff, votazioni e supporto ticket con login Discord.',
    meta_store_title: 'Store — SkyFrost Network',
    meta_store_desc: 'Store ufficiale SkyFrost Network: pacchetti VIP, rank, cosmetic e bundle per Minecraft e Hytale con pagamenti sicuri tramite Tebex.',
    meta_support_title: 'Supporto — SkyFrost Network',
    meta_support_desc: 'Apri un ticket supporto SkyFrost Network con login Discord e ricevi assistenza dallo staff.',
    meta_login_title: 'Login Discord — SkyFrost Network',
    meta_login_desc: 'Accedi con Discord a SkyFrost Network per gestire ticket e supporto personalizzato.',
    meta_staff_title: 'Staff — SkyFrost Network',
    meta_staff_desc: 'Conosci lo staff di SkyFrost Network: owner, admin e team operativo sincronizzati dal server Discord.',
    meta_vote_title: 'Vota — SkyFrost Network',
    meta_vote_desc: 'Vota SkyFrost Network ogni 24 ore sui portali partner e ottieni ricompense esclusive in gioco.',
    meta_wiki_title: 'Wiki — SkyFrost Network',
    meta_wiki_desc: 'Wiki ufficiale SkyFrost Network: guida rapida, regole principali, comandi utili e FAQ.',
    meta_privacy_title: 'Privacy Policy — SkyFrost Network',
    meta_privacy_desc: 'Informativa privacy per utenti del sito e della community SkyFrost Network.',
    meta_cookie_title: 'Cookie Policy — SkyFrost Network',
    meta_cookie_desc: 'Informazioni sui cookie tecnici usati dal sito SkyFrost Network.',
    meta_terms_title: 'Termini di Servizio — SkyFrost Network',
    meta_terms_desc: 'Regole di utilizzo di sito, supporto e community SkyFrost Network.',
    meta_licenses_title: 'Licenze Plugin — SkyFrost Network',
    meta_licenses_desc: 'Gestione licenze per il plugin Hytale di SkyFrost Network.',
    footer_cta_title: 'Pronto a unirti a SkyFrost Network?',
    footer_cta_desc: 'Entra nella community, gioca su Minecraft, preparati a Hytale ed esplora lo store ufficiale!',
    footer_desc: "SkyFrost Network unisce server Minecraft e Hytale in un'unica community. Entra nel gelo e lascia il tuo segno.",
    footer_community: 'Community',
    footer_support_link: 'Supporto Ticket',
    footer_login_link: 'Login Discord',
    footer_privacy_link: 'Privacy Policy',
    footer_cookie_link: 'Cookie Policy',
    footer_terms_link: 'Termini di Servizio',
    footer_sitemap_link: 'Sitemap',
    footer_disclaimer: 'SkyFrost Network è una community indipendente e non è affiliata a Mojang Studios, Microsoft o Hypixel Studios.',
    news_loading_badge: 'Caricamento',
    news_loading_title: 'Carico gli annunci...',
    news_loading_desc: 'Sto leggendo le ultime news da <code>assets/news.json</code>.',
    news_loading_now: 'Adesso',
    news_prev: '‹ Prec',
    news_next: 'Succ ›',
    news_empty_badge: 'Avviso',
    news_empty_title: 'Nessun annuncio disponibile',
    news_empty_desc: 'Aggiungi contenuti in assets/news.json per mostrare le news in home.',
    news_page_label: 'Pagina news {num}',
    news_no_valid: 'Nessuna news valida trovata',
    loading_generic: 'Caricamento...',
    price_tebex: 'Prezzo su Tebex',
    lb_loading: 'Caricamento classifica...',
    purchases_loading: 'Caricamento acquisti...',
    lb_no_donations: 'Nessuna donazione recente',
    lb_no_purchases: 'Nessun acquisto recente',
    store_secure_tebex: 'Pagamenti sicuri via Tebex',
    store_featured_loading: 'Caricamento pacchetto in primo piano...',
    store_perks_loading: 'Caricamento pacchetto in corso...',
    store_featured_meta_default: 'Consegna immediata',
    store_products_loading: 'Caricamento prodotti...',
    store_products_loading_desc: 'Sto leggendo categorie e pacchetti dal tuo Tebex.',
    wait_label: 'Attendi',
    store_package_available: 'Pacchetto disponibile nello store ufficiale Tebex.',
    store_package_name_fallback: 'Pacchetto Store',
    store_no_packages_title: 'Nessun pacchetto disponibile',
    store_no_packages_desc: 'Controlla che categorie e pacchetti siano attivi nel tuo pannello Tebex.',
    store_open_tebex: 'Apri Tebex',
    store_package_single: 'Pacchetto',
    store_package_available_short: 'Pacchetto disponibile su Tebex.',
    buy_now: 'Acquista',
    store_items_count: '{count} articoli',
    sup_account_title: 'Account Discord',
    sup_status_checking: 'Verifica sessione in corso...',
    sup_category_label: 'Categoria',
    sup_category_general: 'Generale',
    sup_category_bug: 'Bug',
    sup_category_store: 'Store',
    sup_category_ban: 'Ban Appeal',
    sup_category_partnership: 'Partnership',
    sup_priority_label: 'Priorita',
    sup_priority_normal: 'Normale',
    sup_priority_high: 'Alta',
    sup_priority_critical: 'Critica',
    login_status_idle: 'Nessuna sessione attiva.',
    login_after: 'dopo il login',
    login_redirect_desc: 'Verrai reindirizzato su <strong style="color:var(--frost);">Supporto</strong> per aprire ticket che arrivano direttamente nel tuo server Discord.',
    login_guide_prefix: 'Ti serve prima una guida?',
    login_guide_link: 'Apri la Wiki',
    staff_live_data: 'Dati staff da Discord',
    vote_reward_coins: 'Monete',
    vote_reward_key: 'Vote Key',
    vote_reward_line: '🎁 1000 monete + 2 Vote Key',
    vote_group_minecraft_desc: 'Due portali Minecraft per supportare SkyFrost con il tuo voto giornaliero.',
    vote_group_hytale_desc: 'I 5 siti Hytale restano sulla stessa riga: scorri lateralmente per vederli tutti.',
    vote_site_mc_1_desc: 'Portale internazionale Minecraft: il tuo voto aiuta SkyFrost a restare visibile ogni giorno.',
    vote_site_mc_2_desc: 'Lista Minecraft molto visitata: un voto in più per far crescere SkyFrost.',
    vote_site_1_desc: 'Portale italiano dedicato ai server Hytale. Vota ogni 24 ore.',
    vote_site_2_desc: 'Directory italiana Hytale: il tuo voto aiuta SkyFrost a salire in classifica.',
    vote_site_3_desc: 'Una delle liste più usate per i server Hytale. Ogni voto fa la differenza.',
    vote_site_4_desc: 'Community italiana Hytale: supporta il server con un voto giornaliero.',
    vote_site_5_desc: 'Directory internazionale per server Hytale: il tuo voto conta.',
    vote_lb_1_desc: 'Leaderboard pubblica di SkyFrost su HytaleServers.it.',
    vote_lb_2_desc: 'Leaderboard pubblica di SkyFrost su Hytalist.com.',
    vote_lb_open: 'Apri leaderboard →',
    wiki_eyebrow: 'Documentazione Ufficiale',
    wiki_title: 'SkyFrost',
    wiki_subtitle: 'Regole, comandi utili e risposte rapide per iniziare subito sul server.',
    wiki_index: 'Indice',
    wiki_toc_connection: 'Connessione',
    wiki_toc_rules: 'Regole Principali',
    wiki_toc_commands: 'Comandi Utili',
    wiki_toc_ticket: 'Supporto Ticket',
    wiki_connection_title: 'Connessione al Server',
    wiki_connection_ip: 'IP server: <code>play.skyfrost.it</code>',
    wiki_connection_discord: 'Discord community: <a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer">discord.skyfrost.it</a>',
    wiki_connection_support: 'Per risolvere problemi tecnici apri un ticket dalla pagina <a href="/supporto">Supporto</a>.',
    wiki_rules_title: 'Regole Principali',
    wiki_rule_1: 'Vietato usare cheat, macro non consentite o exploit.',
    wiki_rule_2: 'Rispetta staff e community: niente insulti o flame.',
    wiki_rule_3: 'Non condividere contenuti offensivi, spam o pubblicità.',
    wiki_rule_4: 'Le decisioni staff sono soggette a verifica tramite ticket.',
    wiki_commands_title: 'Comandi Utili',
    wiki_cmd_1: '<code>/spawn</code>: ritorna allo spawn principale.',
    wiki_cmd_2: '<code>/home</code>: teletrasporto alla tua home.',
    wiki_cmd_3: '<code>/msg &lt;utente&gt; &lt;testo&gt;</code>: messaggio privato.',
    wiki_cmd_4: '<code>/vote</code>: ottieni i link rapidi per votare.',
    wiki_ticket_title: 'Supporto Ticket',
    wiki_ticket_1: 'Il login è gestito tramite Discord OAuth.',
    wiki_ticket_2: 'Dopo il login puoi inviare ticket che vengono inoltrati direttamente nel canale staff del tuo server Discord.',
    wiki_ticket_3: 'Pagina supporto: <a href="/supporto">Apri Ticket</a>',
    wiki_faq_title: 'FAQ',
    wiki_faq_1: '<strong>Non vedo il server online:</strong> controlla manutenzioni annunciate in home/Discord.',
    wiki_faq_2: '<strong>Ho pagato nello store ma non ho ricevuto tutto:</strong> apri ticket categoria <em>Store</em> con ID ordine.',
    wiki_faq_3: '<strong>Ban appeal:</strong> usa categoria <em>Ban Appeal</em> specificando nickname e motivazione.',
    legal_eyebrow: 'Conformita e Trasparenza',
    legal_updated: 'Ultimo aggiornamento: 1 marzo 2026.',
    privacy_title_plain: 'Privacy',
    privacy_title_glow: 'Policy',
    privacy_section_1_title: 'Dati trattati',
    privacy_section_1_desc: 'SkyFrost tratta solo i dati necessari per fornire le funzioni del sito: autenticazione Discord, invio ticket supporto e sicurezza tecnica della piattaforma.',
    privacy_item_1: 'Dati account Discord (ID, username, display name, avatar) dopo login OAuth.',
    privacy_item_2: 'Contenuti inseriti nei ticket (categoria, oggetto, messaggio).',
    privacy_item_3: 'Dati tecnici di sicurezza (indirizzo IP, log errore, timestamp richieste API).',
    privacy_section_2_title: 'Finalita',
    privacy_purpose_1: 'Gestione autenticazione e sessione utente.',
    privacy_purpose_2: 'Smistamento delle richieste di supporto allo staff.',
    privacy_purpose_3: 'Prevenzione abusi, spam e uso improprio dei servizi.',
    privacy_section_3_title: 'Terze parti',
    privacy_section_3_desc: 'Alcuni servizi dipendono da provider esterni: Discord (OAuth e webhook staff), Tebex (store) e hosting infrastrutturale.',
    privacy_section_4_title: 'Conservazione dati',
    privacy_section_4_desc: 'Le sessioni web hanno durata limitata. I ticket e i log vengono conservati per il tempo strettamente necessario alla gestione operativa, sicurezza e moderazione.',
    privacy_section_5_title: 'Diritti utente',
    privacy_section_5_desc: 'Puoi richiedere informazioni, rettifica o cancellazione dei dati compatibilmente con obblighi tecnici e di sicurezza. Per richieste privacy usa il canale ticket su <a href="/supporto">Supporto</a>.',
    cookie_title_plain: 'Cookie',
    cookie_title_glow: 'Policy',
    cookie_section_1_title: 'Cosa sono i cookie',
    cookie_section_1_desc: 'I cookie sono piccoli file memorizzati nel browser per mantenere sessioni e preferenze tecniche durante la navigazione.',
    cookie_section_2_title: 'Cookie utilizzati da SkyFrost',
    cookie_item_1: '<code>sf_session</code>: mantiene la sessione autenticata Discord.',
    cookie_item_2: '<code>sf_oauth_state</code>: protegge il flusso OAuth da richieste non valide.',
    cookie_section_2_desc: 'Questi cookie sono tecnici, necessari al funzionamento del supporto e non usati per profilazione pubblicitaria.',
    cookie_section_3_title: 'Cookie di terze parti',
    cookie_section_3_desc: 'SkyFrost integra servizi esterni (Discord e Tebex). Visitando i loro domini possono essere applicate policy cookie autonome di tali provider.',
    cookie_section_4_title: 'Gestione e disattivazione',
    cookie_section_4_desc: 'Puoi cancellare o bloccare i cookie dalle impostazioni del browser. Disabilitare i cookie tecnici puo impedire login Discord e invio ticket.',
    terms_eyebrow: 'Regolamento',
    terms_title_plain: 'Termini di',
    terms_title_glow: 'Servizio',
    terms_section_1_title: 'Accettazione',
    terms_section_1_desc: 'Usando il sito SkyFrost accetti questi termini e le regole della community pubblicate su wiki e canali ufficiali.',
    terms_section_2_title: 'Account e comportamento',
    terms_item_1: 'Sei responsabile del tuo account Discord e delle azioni effettuate tramite esso.',
    terms_item_2: 'Non sono ammessi abuso dei ticket, spam, impersonificazione o tentativi di eludere la moderazione.',
    terms_item_3: 'Lo staff puo limitare accessi o servizi in caso di violazioni gravi o ripetute.',
    terms_section_3_title: 'Store e pagamenti',
    terms_section_3_desc: 'Gli acquisti sono gestiti da Tebex. Prezzi, metodi di pagamento, rimborsi e contestazioni seguono le policy del provider e del regolamento del server.',
    terms_section_4_title: 'Disponibilita del servizio',
    terms_section_4_desc: 'Il sito e le API possono subire manutenzioni o interruzioni. SkyFrost non garantisce disponibilita continua senza downtime.',
    terms_section_5_title: 'Modifiche ai termini',
    terms_section_5_desc: 'I termini possono essere aggiornati in qualsiasi momento. Le modifiche entrano in vigore dalla data di pubblicazione su questa pagina.',
    licenses_eyebrow: 'Sistema Licenze',
    licenses_title_plain: 'Sky',
    licenses_title_glow: 'License',
    licenses_subtitle: 'Genera, gestisci e verifica le licenze per il plugin Hytale di SkyFrost.',
    licenses_status_active: 'Sistema licenze attivo',
    licenses_validate_title: 'Verifica Licenza',
    licenses_validate_desc: 'Inserisci la chiave di licenza per verificarne la validita.',
    licenses_validate_label: 'Fingerprint Licenza',
    licenses_validate_placeholder: 'Inserisci il fingerprint SHA-256',
    licenses_validate_btn: 'Verifica',
    licenses_admin_title: 'Pannello Admin',
    licenses_auth_checking: 'Verifica sessione...',
    licenses_insert_title: 'Inserisci Nuova Licenza',
    licenses_insert_fingerprint: 'Fingerprint *',
    licenses_insert_fingerprint_ph: 'Dal ticket',
    licenses_insert_hostname: 'Hostname (opzionale)',
    licenses_insert_hostname_ph: 'Es. play.server.it',
    licenses_insert_btn: 'Inserisci',
    licenses_registered_title: 'Licenze Registrate',
    licenses_filter_all: 'Tutte',
    licenses_filter_pending: 'In Attesa',
    licenses_filter_approved: 'Approvate',
    licenses_filter_revoked: 'Revocate',
    role_owner: 'Owner',
    role_sradmin: 'Sr. Admin',
    role_admin: 'Admin',
    role_staff: 'Staff',
    generic_user: 'Utente',
    staff_load_error_title: 'Impossibile caricare lo staff',
    staff_load_error_hint: 'Controlla che il bot sia nel server e che DISCORD_BOT_TOKEN sia configurato in api/.env',
    staff_none_found: 'Nessun membro staff trovato.',
    auth_error_invalid_state: 'Sessione OAuth scaduta o non valida. Riprova il login.',
    auth_error_missing_config: 'Configurazione OAuth Discord incompleta sul server.',
    auth_error_not_in_server: 'Per usare il supporto devi essere nel server Discord.',
    auth_error_guild_check: 'Impossibile verificare la tua presenza nella gilda Discord.',
    auth_error_failed: 'Login Discord fallito. Riprova tra qualche secondo.',
    auth_error_generic: 'Errore durante il login Discord.',
    logout_done: 'Disconnessione completata.',
    logout_loading: 'Disconnessione...',
    logout_failed: 'Logout fallito.',
    login_already_connected: 'Sei gia connesso, {name}',
    login_active_redirect: 'Sessione attiva come {name}. Reindirizzamento al supporto...',
    login_verify_failed: 'Impossibile verificare la sessione: {error}',
    login_done: 'Login Discord completato.',
    sup_form_sending: 'Invio ticket...',
    sup_status_login_required: 'Devi effettuare il login Discord per inviare ticket.',
    sup_status_connected: 'Connesso come {name}',
    sup_status_discord_id: 'ID Discord: {id}',
    sup_status_checking_runtime: 'Verifica sessione Discord in corso...',
    sup_status_error: 'Errore sessione: {error}',
    sup_toast_login_first: 'Effettua prima il login Discord.',
    sup_toast_subject_required: 'Inserisci un oggetto per il ticket.',
    sup_toast_message_short: 'La descrizione deve avere almeno 20 caratteri.',
    sup_toast_ticket_sent_with_id: 'Ticket inviato con successo ({id}).',
    sup_toast_ticket_sent: 'Ticket inviato con successo.',
    sup_toast_ticket_failed: 'Invio ticket fallito.',
    licenses_toast_missing_fingerprint: 'Inserisci un fingerprint.',
    licenses_validate_loading: 'Verifica...',
    licenses_valid_title: 'Licenza Approvata',
    licenses_hostname: 'Hostname',
    licenses_requested: 'Richiesta',
    licenses_reason_not_found: 'Licenza non trovata nel sistema.',
    licenses_reason_revoked: 'Licenza revocata. Hostname: {hostname}',
    licenses_reason_pending: 'Licenza in attesa di approvazione. Hostname: {hostname}',
    licenses_reason_unknown: 'Fingerprint non riconosciuto.',
    licenses_pending_title: 'Licenza In Attesa',
    licenses_invalid_title: 'Licenza Non Valida',
    licenses_validate_error: 'Errore durante la verifica.',
    licenses_none_found: 'Nessuna licenza trovata.',
    licenses_table_fingerprint: 'Fingerprint',
    licenses_table_status: 'Stato',
    licenses_table_requested: 'Data Richiesta',
    licenses_table_actions: 'Azioni',
    licenses_action_approve: 'Approva',
    licenses_action_revoke: 'Revoca',
    licenses_approve_error: 'Errore approvazione.',
    licenses_approved_toast: 'Licenza approvata.',
    licenses_confirm_revoke: 'Sicuro di voler revocare questa licenza?',
    licenses_revoke_error: 'Errore revoca.',
    licenses_revoked_toast: 'Licenza revocata.',
    licenses_table_error: 'Errore: {error}',
    licenses_toast_enter_fingerprint: 'Inserisci il fingerprint.',
    licenses_toast_fingerprint_long: 'Fingerprint troppo lungo.',
    licenses_insert_loading: 'Inserimento...',
    licenses_inserted_title: 'Licenza Inserita!',
    licenses_inserted_desc: 'Ora e nello stato In Attesa. Approvala dalla tabella.',
    licenses_inserted_toast: 'Licenza inserita in attesa.',
    licenses_insert_error: 'Errore inserimento.',
    licenses_auth_admin: 'Connesso come {name} (Admin).',
    licenses_auth_denied: 'Accesso negato. Sono richiesti permessi Owner/Sr. Admin.',
    licenses_auth_login_required: 'Effettua il login Discord per accedere al pannello.',
    licenses_auth_error: 'Errore verifica sessione.',
    vote_link_missing: 'Link di voto non configurato. Aggiorna gli URL nella pagina Vota.',
    vote_popup_blocked: 'Popup bloccato. Consenti i popup per aprire il sito di voto.',
    vote_thanks: 'Grazie per il voto! Ricompensa in arrivo 🎁',
    copy_ip_manual: 'Copia manuale: {ip}',
    copy_ip_success: 'IP copiato negli appunti! 🎮',
    copy_ip_failed: 'Copia non riuscita. IP: {ip}'
  });

  Object.assign(EXTRA_DICTIONARY.en, {
    meta_site_name: 'SkyFrost Network',
    meta_home_title: 'SkyFrost Network',
    meta_home_desc: 'SkyFrost Network: Italian community with Minecraft and Hytale servers, official store, staff, voting, news, and Discord-powered support.',
    meta_store_title: 'Store — SkyFrost Network',
    meta_store_desc: 'Official SkyFrost Network store with VIP ranks, cosmetics, bundles, and secure Tebex payments for Minecraft and Hytale.',
    meta_support_title: 'Support — SkyFrost Network',
    meta_support_desc: 'Open a SkyFrost Network support ticket with Discord login and get help from the staff team.',
    meta_login_title: 'Discord Login — SkyFrost Network',
    meta_login_desc: 'Sign in with Discord to manage tickets and personalized support on SkyFrost Network.',
    meta_staff_title: 'Staff — SkyFrost Network',
    meta_staff_desc: 'Meet the SkyFrost Network team: owners, admins, and operators synced from Discord.',
    meta_vote_title: 'Vote — SkyFrost Network',
    meta_vote_desc: 'Vote for SkyFrost Network every 24 hours on partner websites and earn exclusive in-game rewards.',
    meta_wiki_title: 'Wiki — SkyFrost Network',
    meta_wiki_desc: 'Official SkyFrost Network wiki with quick-start guides, rules, useful commands, and FAQ.',
    meta_privacy_title: 'Privacy Policy — SkyFrost Network',
    meta_privacy_desc: 'Privacy notice for users of the SkyFrost Network website and community.',
    meta_cookie_title: 'Cookie Policy — SkyFrost Network',
    meta_cookie_desc: 'Information about the technical cookies used by the SkyFrost Network website.',
    meta_terms_title: 'Terms of Service — SkyFrost Network',
    meta_terms_desc: 'Rules for using the SkyFrost Network website, support, and community.',
    meta_licenses_title: 'Plugin Licenses — SkyFrost Network',
    meta_licenses_desc: 'License management for the SkyFrost Network Hytale plugin.',
    footer_cta_title: 'Ready to join SkyFrost Network?',
    footer_cta_desc: 'Join the community, play on Minecraft, get ready for Hytale, and explore the official store!',
    footer_desc: 'SkyFrost Network brings Minecraft and Hytale together in one community. Enter the frost and leave your mark.',
    footer_community: 'Community',
    footer_support_link: 'Support Tickets',
    footer_login_link: 'Discord Login',
    footer_privacy_link: 'Privacy Policy',
    footer_cookie_link: 'Cookie Policy',
    footer_terms_link: 'Terms of Service',
    footer_sitemap_link: 'Sitemap',
    footer_disclaimer: 'SkyFrost Network is an independent community and is not affiliated with Mojang Studios, Microsoft, or Hypixel Studios.',
    news_loading_badge: 'Loading',
    news_loading_title: 'Loading announcements...',
    news_loading_desc: 'Reading the latest news from <code>assets/news.json</code>.',
    news_loading_now: 'Now',
    news_prev: '‹ Prev',
    news_next: 'Next ›',
    news_empty_badge: 'Notice',
    news_empty_title: 'No announcements available',
    news_empty_desc: 'Add content to assets/news.json to show news on the homepage.',
    news_page_label: 'News page {num}',
    news_no_valid: 'No valid news found',
    loading_generic: 'Loading...',
    price_tebex: 'Price on Tebex',
    lb_loading: 'Loading leaderboard...',
    purchases_loading: 'Loading purchases...',
    lb_no_donations: 'No recent donations',
    lb_no_purchases: 'No recent purchases',
    store_secure_tebex: 'Secure payments via Tebex',
    store_featured_loading: 'Loading featured package...',
    store_perks_loading: 'Loading package details...',
    store_featured_meta_default: 'Instant delivery',
    store_products_loading: 'Loading products...',
    store_products_loading_desc: 'Reading categories and packages from your Tebex store.',
    wait_label: 'Please wait',
    store_package_available: 'Package available on the official Tebex store.',
    store_package_name_fallback: 'Store Package',
    store_no_packages_title: 'No packages available',
    store_no_packages_desc: 'Check that categories and packages are active in your Tebex panel.',
    store_open_tebex: 'Open Tebex',
    store_package_single: 'Package',
    store_package_available_short: 'Package available on Tebex.',
    buy_now: 'Buy now',
    store_items_count: '{count} items',
    sup_account_title: 'Discord Account',
    sup_status_checking: 'Checking session...',
    sup_category_label: 'Category',
    sup_category_general: 'General',
    sup_category_bug: 'Bug',
    sup_category_store: 'Store',
    sup_category_ban: 'Ban Appeal',
    sup_category_partnership: 'Partnership',
    sup_priority_label: 'Priority',
    sup_priority_normal: 'Normal',
    sup_priority_high: 'High',
    sup_priority_critical: 'Critical',
    login_status_idle: 'No active session.',
    login_after: 'after login',
    login_redirect_desc: 'You will be redirected to <strong style="color:var(--frost);">Support</strong> to open tickets that go directly to your Discord server.',
    login_guide_prefix: 'Need a guide first?',
    login_guide_link: 'Open the Wiki',
    staff_live_data: 'Live staff data from Discord',
    vote_reward_coins: 'Coins',
    vote_reward_key: 'Vote Key',
    vote_reward_line: '🎁 1000 coins + 2 Vote Keys',
    vote_group_minecraft_desc: 'Two Minecraft portals to support SkyFrost with your daily vote.',
    vote_group_hytale_desc: 'All 5 Hytale sites stay on the same row: scroll sideways to view them all.',
    vote_site_mc_1_desc: 'International Minecraft portal: your vote helps SkyFrost stay visible every day.',
    vote_site_mc_2_desc: 'Popular Minecraft listing: one more vote to help SkyFrost grow.',
    vote_site_1_desc: 'Italian portal dedicated to Hytale servers. Vote every 24 hours.',
    vote_site_2_desc: 'Italian Hytale directory: your vote helps SkyFrost climb the rankings.',
    vote_site_3_desc: 'One of the most used lists for Hytale servers. Every vote matters.',
    vote_site_4_desc: 'Italian Hytale community: support the server with a daily vote.',
    vote_site_5_desc: 'International Hytale server directory: your vote counts.',
    vote_lb_1_desc: 'Public SkyFrost leaderboard on HytaleServers.it.',
    vote_lb_2_desc: 'Public SkyFrost leaderboard on Hytalist.com.',
    vote_lb_open: 'Open leaderboard →',
    wiki_eyebrow: 'Official Documentation',
    wiki_title: 'SkyFrost',
    wiki_subtitle: 'Rules, useful commands, and quick answers to get started on the server.',
    wiki_index: 'Index',
    wiki_toc_connection: 'Connection',
    wiki_toc_rules: 'Main Rules',
    wiki_toc_commands: 'Useful Commands',
    wiki_toc_ticket: 'Ticket Support',
    wiki_connection_title: 'Server Connection',
    wiki_connection_ip: 'Server IP: <code>play.skyfrost.it</code>',
    wiki_connection_discord: 'Community Discord: <a href="https://discord.com/invite/MfseZ57sPd" target="_blank" rel="noopener noreferrer">discord.skyfrost.it</a>',
    wiki_connection_support: 'To solve technical issues, open a ticket from the <a href="/supporto">Support</a> page.',
    wiki_rules_title: 'Main Rules',
    wiki_rule_1: 'Cheats, unauthorized macros, and exploits are forbidden.',
    wiki_rule_2: 'Respect staff and community: no insults or flame.',
    wiki_rule_3: 'Do not share offensive content, spam, or advertising.',
    wiki_rule_4: 'Staff decisions can be reviewed through tickets.',
    wiki_commands_title: 'Useful Commands',
    wiki_cmd_1: '<code>/spawn</code>: return to the main spawn.',
    wiki_cmd_2: '<code>/home</code>: teleport to your home.',
    wiki_cmd_3: '<code>/msg &lt;user&gt; &lt;text&gt;</code>: private message.',
    wiki_cmd_4: '<code>/vote</code>: get the quick voting links.',
    wiki_ticket_title: 'Ticket Support',
    wiki_ticket_1: 'Login is handled through Discord OAuth.',
    wiki_ticket_2: 'After login, you can send tickets that are forwarded directly to your Discord staff channel.',
    wiki_ticket_3: 'Support page: <a href="/supporto">Open Ticket</a>',
    wiki_faq_title: 'FAQ',
    wiki_faq_1: '<strong>I cannot see the server online:</strong> check maintenance announcements on home/Discord.',
    wiki_faq_2: '<strong>I paid in the store but did not receive everything:</strong> open a <em>Store</em> ticket with your order ID.',
    wiki_faq_3: '<strong>Ban appeal:</strong> use the <em>Ban Appeal</em> category and specify nickname and reason.',
    legal_eyebrow: 'Compliance & Transparency',
    legal_updated: 'Last updated: March 1, 2026.',
    privacy_title_plain: 'Privacy',
    privacy_title_glow: 'Policy',
    privacy_section_1_title: 'Processed Data',
    privacy_section_1_desc: 'SkyFrost only processes the data required to provide website functions: Discord authentication, support tickets, and platform security.',
    privacy_item_1: 'Discord account data (ID, username, display name, avatar) after OAuth login.',
    privacy_item_2: 'Ticket content (category, subject, message).',
    privacy_item_3: 'Technical security data (IP address, error logs, API request timestamps).',
    privacy_section_2_title: 'Purpose',
    privacy_purpose_1: 'Authentication and user session management.',
    privacy_purpose_2: 'Routing support requests to the staff team.',
    privacy_purpose_3: 'Preventing abuse, spam, and misuse of the services.',
    privacy_section_3_title: 'Third Parties',
    privacy_section_3_desc: 'Some services depend on external providers: Discord (OAuth and staff webhooks), Tebex (store), and infrastructure hosting.',
    privacy_section_4_title: 'Data Retention',
    privacy_section_4_desc: 'Web sessions are limited in duration. Tickets and logs are stored only for the time strictly necessary for operations, security, and moderation.',
    privacy_section_5_title: 'User Rights',
    privacy_section_5_desc: 'You may request information, correction, or deletion of your data where compatible with technical and security obligations. For privacy requests, use the ticket channel on <a href="/supporto">Support</a>.',
    cookie_title_plain: 'Cookie',
    cookie_title_glow: 'Policy',
    cookie_section_1_title: 'What Cookies Are',
    cookie_section_1_desc: 'Cookies are small files stored in the browser to keep sessions and technical preferences during navigation.',
    cookie_section_2_title: 'Cookies Used by SkyFrost',
    cookie_item_1: '<code>sf_session</code>: keeps the authenticated Discord session active.',
    cookie_item_2: '<code>sf_oauth_state</code>: protects the OAuth flow from invalid requests.',
    cookie_section_2_desc: 'These cookies are technical, required for support functionality, and are not used for advertising profiling.',
    cookie_section_3_title: 'Third-Party Cookies',
    cookie_section_3_desc: 'SkyFrost integrates external services (Discord and Tebex). When visiting their domains, their own cookie policies may apply.',
    cookie_section_4_title: 'Management and Disabling',
    cookie_section_4_desc: 'You can delete or block cookies from your browser settings. Disabling technical cookies may prevent Discord login and ticket submission.',
    terms_eyebrow: 'Rules',
    terms_title_plain: 'Terms of',
    terms_title_glow: 'Service',
    terms_section_1_title: 'Acceptance',
    terms_section_1_desc: 'By using the SkyFrost website, you accept these terms and the community rules published on the wiki and official channels.',
    terms_section_2_title: 'Account and Conduct',
    terms_item_1: 'You are responsible for your Discord account and actions performed through it.',
    terms_item_2: 'Ticket abuse, spam, impersonation, or attempts to bypass moderation are not allowed.',
    terms_item_3: 'Staff may restrict access or services in case of serious or repeated violations.',
    terms_section_3_title: 'Store and Payments',
    terms_section_3_desc: 'Purchases are handled by Tebex. Prices, payment methods, refunds, and disputes follow the provider policies and server rules.',
    terms_section_4_title: 'Service Availability',
    terms_section_4_desc: 'The website and APIs may undergo maintenance or interruptions. SkyFrost does not guarantee continuous availability without downtime.',
    terms_section_5_title: 'Changes to Terms',
    terms_section_5_desc: 'These terms may be updated at any time. Changes take effect from the publication date on this page.',
    licenses_eyebrow: 'License System',
    licenses_title_plain: 'Sky',
    licenses_title_glow: 'License',
    licenses_subtitle: 'Create, manage, and verify licenses for the SkyFrost Hytale plugin.',
    licenses_status_active: 'License system active',
    licenses_validate_title: 'Validate License',
    licenses_validate_desc: 'Enter the license key to verify its validity.',
    licenses_validate_label: 'License Fingerprint',
    licenses_validate_placeholder: 'Enter the SHA-256 fingerprint',
    licenses_validate_btn: 'Validate',
    licenses_admin_title: 'Admin Panel',
    licenses_auth_checking: 'Checking session...',
    licenses_insert_title: 'Insert New License',
    licenses_insert_fingerprint: 'Fingerprint *',
    licenses_insert_fingerprint_ph: 'From the ticket',
    licenses_insert_hostname: 'Hostname (optional)',
    licenses_insert_hostname_ph: 'Ex. play.server.it',
    licenses_insert_btn: 'Insert',
    licenses_registered_title: 'Registered Licenses',
    licenses_filter_all: 'All',
    licenses_filter_pending: 'Pending',
    licenses_filter_approved: 'Approved',
    licenses_filter_revoked: 'Revoked',
    role_owner: 'Owner',
    role_sradmin: 'Sr. Admin',
    role_admin: 'Admin',
    role_staff: 'Staff',
    generic_user: 'User',
    staff_load_error_title: 'Unable to load staff',
    staff_load_error_hint: 'Check that the bot is in the server and that DISCORD_BOT_TOKEN is configured in api/.env',
    staff_none_found: 'No staff members found.',
    auth_error_invalid_state: 'OAuth session expired or invalid. Please try logging in again.',
    auth_error_missing_config: 'Discord OAuth configuration is incomplete on the server.',
    auth_error_not_in_server: 'You must be in the Discord server to use support.',
    auth_error_guild_check: 'Unable to verify your presence in the Discord guild.',
    auth_error_failed: 'Discord login failed. Please try again in a few seconds.',
    auth_error_generic: 'Error during Discord login.',
    logout_done: 'Logout completed.',
    logout_loading: 'Logging out...',
    logout_failed: 'Logout failed.',
    login_already_connected: 'You are already connected, {name}',
    login_active_redirect: 'Active session as {name}. Redirecting to support...',
    login_verify_failed: 'Unable to verify the session: {error}',
    login_done: 'Discord login completed.',
    sup_form_sending: 'Sending ticket...',
    sup_status_login_required: 'You must log in with Discord before sending tickets.',
    sup_status_connected: 'Connected as {name}',
    sup_status_discord_id: 'Discord ID: {id}',
    sup_status_checking_runtime: 'Checking Discord session...',
    sup_status_error: 'Session error: {error}',
    sup_toast_login_first: 'Please log in with Discord first.',
    sup_toast_subject_required: 'Enter a subject for the ticket.',
    sup_toast_message_short: 'The description must be at least 20 characters long.',
    sup_toast_ticket_sent_with_id: 'Ticket sent successfully ({id}).',
    sup_toast_ticket_sent: 'Ticket sent successfully.',
    sup_toast_ticket_failed: 'Ticket submission failed.',
    licenses_toast_missing_fingerprint: 'Enter a fingerprint.',
    licenses_validate_loading: 'Validating...',
    licenses_valid_title: 'Approved License',
    licenses_hostname: 'Hostname',
    licenses_requested: 'Requested',
    licenses_reason_not_found: 'License not found in the system.',
    licenses_reason_revoked: 'License revoked. Hostname: {hostname}',
    licenses_reason_pending: 'License pending approval. Hostname: {hostname}',
    licenses_reason_unknown: 'Fingerprint not recognized.',
    licenses_pending_title: 'License Pending',
    licenses_invalid_title: 'Invalid License',
    licenses_validate_error: 'Error while validating.',
    licenses_none_found: 'No licenses found.',
    licenses_table_fingerprint: 'Fingerprint',
    licenses_table_status: 'Status',
    licenses_table_requested: 'Requested At',
    licenses_table_actions: 'Actions',
    licenses_action_approve: 'Approve',
    licenses_action_revoke: 'Revoke',
    licenses_approve_error: 'Approval error.',
    licenses_approved_toast: 'License approved.',
    licenses_confirm_revoke: 'Are you sure you want to revoke this license?',
    licenses_revoke_error: 'Revocation error.',
    licenses_revoked_toast: 'License revoked.',
    licenses_table_error: 'Error: {error}',
    licenses_toast_enter_fingerprint: 'Enter the fingerprint.',
    licenses_toast_fingerprint_long: 'Fingerprint is too long.',
    licenses_insert_loading: 'Inserting...',
    licenses_inserted_title: 'License Inserted!',
    licenses_inserted_desc: 'It is now in Pending status. Approve it from the table.',
    licenses_inserted_toast: 'License inserted and waiting for approval.',
    licenses_insert_error: 'Insertion error.',
    licenses_auth_admin: 'Connected as {name} (Admin).',
    licenses_auth_denied: 'Access denied. Owner/Sr. Admin permissions are required.',
    licenses_auth_login_required: 'Log in with Discord to access the panel.',
    licenses_auth_error: 'Session verification error.',
    vote_link_missing: 'Vote link not configured. Update the URLs on the Vote page.',
    vote_popup_blocked: 'Popup blocked. Allow popups to open the voting website.',
    vote_thanks: 'Thanks for voting! Reward incoming 🎁',
    copy_ip_manual: 'Copy manually: {ip}',
    copy_ip_success: 'IP copied to clipboard! 🎮',
    copy_ip_failed: 'Copy failed. IP: {ip}'
  });

  Object.assign(EXTRA_DICTIONARY.es, {
    meta_site_name: 'SkyFrost Network',
    footer_cta_title: '¿Listo para unirte a SkyFrost Network?',
    footer_cta_desc: 'Únete a la comunidad, juega en Minecraft, prepárate para Hytale y explora la tienda oficial.',
    footer_desc: 'SkyFrost Network une Minecraft y Hytale en una sola comunidad. Entra en el hielo y deja tu marca.',
    footer_disclaimer: 'SkyFrost Network es una comunidad independiente y no está afiliada a Mojang Studios, Microsoft ni Hypixel Studios.',
    staff_live_data: 'Datos del staff desde Discord'
  });

  Object.assign(EXTRA_DICTIONARY.fr, {
    meta_site_name: 'SkyFrost Network',
    footer_cta_title: 'Prêt à rejoindre SkyFrost Network ?',
    footer_cta_desc: 'Rejoignez la communauté, jouez sur Minecraft, préparez-vous pour Hytale et découvrez la boutique officielle.',
    footer_desc: 'SkyFrost Network réunit Minecraft et Hytale dans une seule communauté. Entrez dans le givre et laissez votre marque.',
    footer_disclaimer: 'SkyFrost Network est une communauté indépendante et n’est affiliée ni à Mojang Studios, ni à Microsoft, ni à Hypixel Studios.',
    staff_live_data: 'Données du staff depuis Discord'
  });

  Object.assign(EXTRA_DICTIONARY.de, {
    meta_site_name: 'SkyFrost Network',
    footer_cta_title: 'Bereit, SkyFrost Network beizutreten?',
    footer_cta_desc: 'Tritt der Community bei, spiele auf Minecraft, bereite dich auf Hytale vor und entdecke den offiziellen Shop.',
    footer_desc: 'SkyFrost Network vereint Minecraft und Hytale in einer Community. Betritt den Frost und hinterlasse deine Spur.',
    footer_disclaimer: 'SkyFrost Network ist eine unabhängige Community und nicht mit Mojang Studios, Microsoft oder Hypixel Studios verbunden.',
    staff_live_data: 'Staff-Daten von Discord'
  });

  // CSS for selector
  const style = document.createElement('style');
  style.textContent = `
    .lang-select-wrap {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(88,194,250,0.12);
      border-radius: var(--radius-sm);
      padding-left: 0.6rem;
      transition: all var(--transition);
    }
    .lang-select-wrap:hover {
      border-color: rgba(88,194,250,0.3);
      background: rgba(15, 23, 42, 0.8);
    }
    .lang-select-flag {
      display: block;
      width: 18px;
      height: 12px;
      border-radius: 2px;
      object-fit: cover;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.12);
      flex-shrink: 0;
    }
    .lang-select {
      background: transparent;
      color: var(--text-dim);
      border: none;
      border-radius: var(--radius-sm);
      padding: 0.45rem 0.9rem 0.45rem 0;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: all var(--transition);
      font-family: var(--font-label), "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    }
    .lang-select:hover {
      color: var(--white);
    }
    .lang-select option {
      background: var(--bg-1);
      color: var(--white);
      font-family: var(--font-label), "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    }
    .lang-select-wrap.mob {
      display: flex;
      width: 100%;
      margin-top: 1rem;
      padding-left: 0.85rem;
    }
    .lang-select.mob {
      width: 100%;
      margin: 0;
      padding: 0.7rem 1rem 0.7rem 0;
      font-size: 1rem;
    }
  `;
  document.head.appendChild(style);

  // Initialize after DOM load, or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      SkyFrost.initI18n();
    });
  } else {
    SkyFrost.initI18n();
  }

})();
