// assets/js/snow.js
(function(){
  const canvas = document.getElementById("snow");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;

  const flakes = Array.from({length: 120}, () => ({
    x: Math.random()*w,
    y: Math.random()*h,
    r: 1 + Math.random()*2.4,
    s: 0.5 + Math.random()*1.4,
    d: Math.random()*Math.PI*2
  }));

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);

  function tick(){
    ctx.clearRect(0,0,w,h);
    ctx.globalAlpha = 0.9;
    for(const f of flakes){
      f.d += 0.01;
      f.y += f.s;
      f.x += Math.sin(f.d) * 0.6;

      if(f.y > h + 10){ f.y = -10; f.x = Math.random()*w; }
      if(f.x > w + 10) f.x = -10;
      if(f.x < -10) f.x = w + 10;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();