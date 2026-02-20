// assets/js/vote.js
(function(){
  const list = document.querySelector("[data-vote-list]");
  if(!list) return;

  // Metti qui i tuoi link veri
  const sites = [
    { name: "Vote Site #1", url: "https://example.com/vote1", reward: "+1 Key" },
    { name: "Vote Site #2", url: "https://example.com/vote2", reward: "+500 Coins" },
    { name: "Vote Site #3", url: "https://example.com/vote3", reward: "+1 Crate" }
  ];

  list.innerHTML = sites.map(s => `
    <div class="item" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
      <div>
        <div style="font-weight:900">${s.name}</div>
        <div class="meta">Reward: ${s.reward}</div>
      </div>
      <a class="btn good" href="${s.url}" target="_blank" rel="noreferrer">Vote</a>
    </div>
  `).join("");
})();