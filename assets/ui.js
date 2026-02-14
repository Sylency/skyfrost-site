// SkyFrost UI helpers (logo fallback)
(function(){
  const img = document.getElementById('brandLogo');
  const fb = document.getElementById('brandFallback');
  if (!img || !fb) return;
  const candidates = ["assets/logo.png","assets/icon.png","assets/favicon.png"];
  let i = 0;
  img.addEventListener('error', () => {
    i++;
    if (i < candidates.length) img.src = candidates[i];
    else { img.style.display='none'; fb.style.display='grid'; }
  });
})();