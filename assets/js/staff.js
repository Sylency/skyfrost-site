// assets/js/staff.js
(async function(){
  const root = document.querySelector("[data-staff]");
  if(!root) return;

  const data = await window.API.safeFetchJson(window.API.apiUrl("/api/staff"), null);

  // Atteso: [{ name, role, avatarUrl }]
  const staff = Array.isArray(data) ? data : [
    { name:"SitoOwner", role:"Owner", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Owner" },
    { name:"SrAdmin", role:"Sr. Admin", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=SrAdmin" },
    { name:"AdminOne", role:"Admin", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Admin" },
    { name:"Staffer", role:"Staff", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Staff" },
    { name:"VipPlayer", role:"VIP", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=VIP" },
    { name:"User", role:"Utente", avatarUrl:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=User" }
  ];

  root.innerHTML = staff.map(s => `
    <div class="item" style="display:flex;gap:12px;align-items:center;">
      <img src="${s.avatarUrl}" alt="" style="width:46px;height:46px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.02)"/>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
          <strong style="font-size:15px">${s.name}</strong>
          <span class="badge role">${s.role}</span>
        </div>
        <div class="meta">Staff member</div>
      </div>
    </div>
  `).join("");
})();