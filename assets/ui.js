// SkyFrost UI helpers (logo fallback + copy buttons)
(function(){
  const img = document.getElementById('brandLogo');
  const fb = document.getElementById('brandFallback');
  if (img && fb){
    const candidates = ["assets/logo.png","assets/icon.png","assets/favicon.png"];
    let i = 0;
    img.addEventListener('error', () => {
      i++;
      if (i < candidates.length) img.src = candidates[i];
      else { img.style.display='none'; fb.style.display='grid'; }
    });
  }

  // copy buttons: <button data-copy="text">
  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.getAttribute('data-copy') || '';
    try{
      await navigator.clipboard.writeText(text);
      const prev = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check2"></i> Copiato';
      setTimeout(()=>{ btn.innerHTML = prev; }, 1200);
    }catch(e){}
  });
})();