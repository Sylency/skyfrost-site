// assets/js/auth.js
// In produzione: sostituisci con OAuth Discord / sessione server-side.
function isLoggedIn(){
  return localStorage.getItem("demo_auth") === "1";
}
function requireAuth(){
  if(!isLoggedIn()){
    location.href = "login.html";
  }
}
function loginDemo(){
  localStorage.setItem("demo_auth","1");
  location.href = "dashboard.html";
}
function logoutDemo(){
  localStorage.removeItem("demo_auth");
  location.href = "index.html";
}

window.AUTH = { isLoggedIn, requireAuth, loginDemo, logoutDemo };