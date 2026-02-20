// assets/js/api.js
function apiUrl(path){
  const base = (window.SITE_CONFIG?.api?.baseUrl ?? "").replace(/\/+$/,"");
  const p = (path ?? "").startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function safeFetchJson(url, fallback = null){
  try{
    const res = await fetch(url, { credentials: "include" });
    if(!res.ok) return fallback;
    return await res.json();
  }catch(_e){
    return fallback;
  }
}

window.API = { apiUrl, safeFetchJson };