/* =========================================================
   VORTEX OS v11.0 — Complete OS & Engine & Vortex Chromium
   ========================================================= */
const OS_VERSION = "11.0";
const firebaseConfig = {
  apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
  authDomain: "vortex-os-971fc.firebaseapp.com",
  databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
  projectId: "vortex-os-971fc"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentUser=null, highestZIndex=100, openApps=new Set(), clockInterval=null;
let currentSceneObjects=[], selectedObjectId=null, engineTool="select";
let vortexScripts=[], activeScriptId=null, currentGameInstance=null, currentRunnerInstance=null;
let currentChatId=null, currentChatType="dm", messengerListeners=[], currentGroupId=null, messengerMessageUnsub=null;
const ADMIN_KEYS=new Set(["rip_fallenhero","king"]);
let systemListeners=[];
function isAdmin(){return !!currentUser && ADMIN_KEYS.has(currentUser.key);}
function isMessengerBanned(){return !!currentUser?.messengerBanned;}
const globalKeys={};

/* ================= ENGINE PAN & RESIZE STATE ================= */
let enginePan = { x: 0, y: 0 };
let isPanning = false, panStart = { x: 0, y: 0 };
let activeResizeHandle = null, resizeStart = { x: 0, y: 0, ox: 0, oy: 0, ow: 0, oh: 0 };

/* ================= VORTEX CHROMIUM DATA ================= */
let browserHistory = [];
let browserHistoryIndex = -1;

window.addEventListener("keydown",e=>{globalKeys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>{globalKeys[e.key.toLowerCase()]=false;});
window.addEventListener("beforeunload",()=>saveEngineLocal());

function keyForNick(n){return String(n||"").trim().toLowerCase().replace(/[.#$/\[\]]/g,"_");}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

/* ================= INJEÇÃO DINÂMICA DE UI & ESTILOS DA ENGINE ================= */
function injectDynamicEngineStyles(){
  if(document.getElementById("vortex-dynamic-styles")) return;
  const style = document.createElement("style");
  style.id = "vortex-dynamic-styles";
  style.innerHTML = `
    .engine-object.selected-unity {
      outline: 2px solid #8b5cf6 !important;
      outline-offset: 1px;
    }
    .resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #8b5cf6;
      border: 1px solid #ffffff;
      border-radius: 2px;
      z-index: 99;
      pointer-events: auto;
    }
    .handle-nw { top: -6px; left: -6px; cursor: nwse-resize; }
    .handle-n  { top: -6px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-ne { top: -6px; right: -6px; cursor: nesw-resize; }
    .handle-e  { top: calc(50% - 5px); right: -6px; cursor: ew-resize; }
    .handle-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
    .handle-s  { bottom: -6px; left: calc(50% - 5px); cursor: ns-resize; }
    .handle-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
    .handle-w  { top: calc(50% - 5px); left: -6px; cursor: ew-resize; }

    .vort-studio-card {
      padding: 15px; background: #181825; border-radius: 8px; color: #fff; display: flex; flex-direction: column; gap: 10px;
    }
    .vort-studio-card input, .vort-studio-card textarea {
      background: #11111b; border: 1px solid #313244; color: #cdd6f4; border-radius: 6px; padding: 8px; outline: none; font-family: monospace;
    }
  `;
  document.head.appendChild(style);
}

function ensureDynamicAppWindows(){
  injectDynamicEngineStyles();

  if(!document.getElementById("icon-vort-studio") && document.getElementById("desktop")){
    const icon = document.createElement("div");
    icon.id = "icon-vort-studio";
    icon.className = "desktop-icon";
    icon.onclick = () => openWindow("win-vort-studio");
    icon.innerHTML = `<div class="app-icon" style="background:linear-gradient(135deg,#8b5cf6,#a855f7)">🌐</div><span>Criador .vort</span>`;
    document.getElementById("desktop").appendChild(icon);
  }

  if(!document.getElementById("win-vort-studio")){
    const win = document.createElement("div");
    win.id = "win-vort-studio";
    win.className = "window";
    win.style.cssText = "top:100px;left:220px;width:700px;height:520px;display:none;";
    win.innerHTML = `
      <div class="window-header" onmousedown="dragWindow(event,'win-vort-studio')">
        <span>Vortex Web Studio — Criador de Sites .vort</span>
        <div class="window-controls"><button onclick="closeWindow('win-vort-studio')">×</button></div>
      </div>
      <div class="window-body" style="padding:15px; background:#1e1e2e; height:calc(100% - 35px); overflow-y:auto;">
        <div class="vort-studio-card">
          <h3>🚀 Criar ou Editar seu Site .vort</h3>
          <label>Nome do Domínio (ex: meujogo.vort ou comunidade.vort)
            <input id="vort-site-domain" placeholder="exemplo.vort" style="width:100%; margin-top:4px;">
          </label>
          <label>Título da Página
            <input id="vort-site-title" placeholder="Meu Site Incrível" style="width:100%; margin-top:4px;">
          </label>
          <label>Conteúdo HTML / CSS do Site
            <textarea id="vort-site-html" rows="10" style="width:100%; margin-top:4px; height:180px;" placeholder="<h1>Bem-vindo ao meu site .vort!</h1>\n<p>Criado no Vortex OS v11.0.</p>"></textarea>
          </label>
          <button class="btn primary" onclick="publishVortSite()">Publicar Site na Rede .vort</button>
        </div>
      </div>
    `;
    document.body.appendChild(win);
  }
}

/* ================= AUTH / OS ================= */
function loginUser(){
  const username=document.getElementById("auth-username").value.trim(), pin=document.getElementById("auth-pin").value.trim(), email=document.getElementById("auth-email").value.trim();
  if(!username) return alert("Digite um nome de usuário.");
  if(!/^\d{4}$/.test(pin)) return alert("O PIN deve ter exatamente 4 dígitos.");
  const userKey=keyForNick(username), ref=database.ref("users/"+userKey), btn=document.querySelector("#login-screen .btn-primary");
  if(btn){btn.disabled=true;btn.innerText="Entrando...";}
  ref.once("value").then(s=>{
    if(s.exists()){
      const d=s.val();
      if(d.pin!==pin) throw new Error("PIN incorreto para este usuário.");
      startSession(userKey,d);
    }else{
      const d={displayName:username,pin,email:email||"",balance:0,createdAt:Date.now(),lastDaily:0,friends:{},groups:{}};
      return ref.set(d).then(()=>startSession(userKey,d));
    }
  }).catch(e=>alert("Erro: "+e.message)).finally(()=>{if(btn){btn.disabled=false;btn.innerText="Entrar no Vortex OS";}});
}
function startSession(userKey,data){
  currentUser=Object.assign({key:userKey},data);
  localStorage.setItem("vortex_current_user",userKey);
  document.getElementById("login-screen").style.display="none";
  document.getElementById("shutdown-screen").style.display="none";
  ["start-username","settings-user"].forEach(id=>{const e=document.getElementById(id);if(e)e.innerText=data.displayName||userKey;});
  const se=document.getElementById("start-email"), set=document.getElementById("settings-email");
  if(se)se.innerText=data.email||"online"; if(set)set.innerText=data.email||"-";
  ensureDynamicAppWindows();
  updateBalanceUI(); startClock(); loadGlobalStore(); loadUserFiles(); loadFriends();
  loadEngineLocal(); loadMessengerHome(); updateAdminVisibility(); startSystemListeners();
}
function tryAutoLogin(){
  const k=localStorage.getItem("vortex_current_user"); if(!k)return;
  database.ref("users/"+k).once("value").then(s=>{if(s.exists())startSession(k,s.val());else localStorage.removeItem("vortex_current_user");});
}
function logoutUser(){saveEngineLocal();localStorage.removeItem("vortex_current_user");currentUser=null;clearMessengerListeners();stopSystemListeners();document.getElementById("login-screen").style.display="flex";}
function shutdownPC(){saveEngineLocal();closeStartMenuIfOpen();document.getElementById("shutdown-screen").style.display="flex";if(clockInterval)clearInterval(clockInterval);stopEngineTestLoop();stopRunnerInstance();clearMessengerListeners();}
function powerOn(){document.getElementById("shutdown-screen").style.display="none";if(currentUser){document.getElementById("login-screen").style.display="none";startClock();}else document.getElementById("login-screen").style.display="flex";}
function startClock(){if(clockInterval)clearInterval(clockInterval);const u=()=>{const e=document.getElementById("os-clock");if(e){const d=new Date();e.innerText=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}};u();clockInterval=setInterval(u,30000);}

function openWindow(id){
  if(id==="win-messenger"&&isMessengerBanned())return alert("Seu acesso ao Messenger está bloqueado.");
  if(id==="win-admin"&&!isAdmin())return alert("Acesso negado.");
  const w=document.getElementById(id);if(!w)return;
  w.style.display="flex";bringToFront(w);openApps.add(id);addTaskbarButton(id);
  if(id==="win-engine")initEngineEditor();
  if(id==="win-messenger")loadMessengerHome();
  if(id==="win-vscode")renderScriptsSidebarList();
  if(id==="win-admin")loadAdminState();
  if(id==="win-browser"&&browserHistory.length===0)navigateBrowser("vortex chromium.vort");
}
function closeWindow(id){const w=document.getElementById(id);if(w)w.style.display="none";openApps.delete(id);removeTaskbarButton(id);if(id==="win-engine")stopEngineTestLoop();if(id==="win-runner")stopRunnerInstance();if(id==="win-messenger")clearMessengerListeners();}
function bringToFront(w){if(!w)return;w.style.zIndex=++highestZIndex;}
function dragWindow(e,id){if(e.target.closest("button,input,textarea"))return;const w=document.getElementById(id);if(!w)return;bringToFront(w);let sx=e.clientX,sy=e.clientY,ox=w.offsetLeft,oy=w.offsetTop;const move=ev=>{w.style.left=(ox+ev.clientX-sx)+"px";w.style.top=(oy+ev.clientY-sy)+"px";};const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);};document.addEventListener("mousemove",move);document.addEventListener("mouseup",up);}
function addTaskbarButton(id){const bar=document.getElementById("taskbar-apps");if(!bar||document.getElementById("task-"+id))return;const b=document.createElement("button");b.id="task-"+id;b.className="taskbar-app-btn";b.innerText=document.querySelector("#"+id+" .window-header span")?.innerText||id;b.onclick=()=>{const w=document.getElementById(id);w.style.display="flex";bringToFront(w);};bar.appendChild(b);}
function removeTaskbarButton(id){document.getElementById("task-"+id)?.remove();}
function toggleStartMenu(){const m=document.getElementById("start-menu");m.classList.toggle("open");m.style.display=m.classList.contains("open")?"block":"none";}
function closeStartMenuIfOpen(){const m=document.getElementById("start-menu");if(m){m.classList.remove("open");m.style.display="none";}}
document.addEventListener("click",e=>{const m=document.getElementById("start-menu"),b=document.querySelector(".start-btn");if(m?.classList.contains("open")&&!m.contains(e.target)&&e.target!==b)closeStartMenuIfOpen();});

/* ================= VORTEX CHROMIUM ================= */
function navigateBrowser(targetUrl){
  const input = document.getElementById("browser-url");
  const iframe = document.getElementById("browser-iframe");
  if(!input || !iframe) return;

  let query = (targetUrl !== undefined ? targetUrl : input.value).trim();
  if(!query) query = "vortex chromium.vort";

  let cleanUrl = query.toLowerCase();
  if(!cleanUrl.endsWith(".vort") && cleanUrl !== "vortex chromium.vort"){
    cleanUrl = cleanUrl + ".vort";
  }

  input.value = cleanUrl;

  if(cleanUrl === "vortex chromium.vort"){
    renderIframeContent(iframe, getChromiumHomeHTML());
  } else if(cleanUrl === "vortex.api.vort"){
    renderIframeContent(iframe, getVortexApiDocHTML());
  } else {
    const siteKey = cleanUrl.replace(".vort","").replace(/[.#$/\[\]]/g,"_");
    database.ref("vortSites/"+siteKey).once("value").then(s=>{
      if(s.exists()){
        const data = s.val();
        renderIframeContent(iframe, getCustomVortSiteHTML(data.title, data.html, data.author));
      } else {
        renderIframeContent(iframe, getNotFoundVortHTML(cleanUrl));
      }
    }).catch(()=>{
      renderIframeContent(iframe, getNotFoundVortHTML(cleanUrl));
    });
  }

  if(browserHistoryIndex === -1 || browserHistory[browserHistoryIndex] !== cleanUrl){
    browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
    browserHistory.push(cleanUrl);
    browserHistoryIndex = browserHistory.length - 1;
  }
}

function renderIframeContent(iframe, html){ iframe.srcdoc = html; }

function browserNav(action){
  if(action === "back" && browserHistoryIndex > 0){
    browserHistoryIndex--;
    navigateBrowser(browserHistory[browserHistoryIndex]);
  } else if(action === "forward" && browserHistoryIndex < browserHistory.length - 1){
    browserHistoryIndex++;
    navigateBrowser(browserHistory[browserHistoryIndex]);
  } else if(action === "reload"){
    if(browserHistory[browserHistoryIndex]) navigateBrowser(browserHistory[browserHistoryIndex]);
  } else if(action === "home"){
    navigateBrowser("vortex chromium.vort");
  }
}

function getChromiumHomeHTML(){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; padding:0; background:#0f0f17; color:#fff; font-family:system-ui,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
    .logo { font-size:42px; font-weight:800; background:linear-gradient(135deg,#8b5cf6,#c084fc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:8px; }
    .sub { color:#94a3b8; font-size:14px; margin-bottom:28px; }
    .search-box { width:80%; max-width:540px; display:flex; gap:8px; }
    input { flex:1; padding:12px 18px; border-radius:24px; border:1px solid #334155; background:#1e293b; color:#fff; font-size:15px; outline:none; box-shadow:0 4px 12px rgba(0,0,0,0.3); }
    input:focus { border-color:#8b5cf6; }
    button { padding:12px 24px; border-radius:24px; border:none; background:#8b5cf6; color:#fff; font-weight:bold; cursor:pointer; }
    .shortcuts { display:flex; gap:16px; margin-top:32px; }
    .card { background:#1e293b; border:1px solid #334155; padding:12px 20px; border-radius:12px; cursor:pointer; transition:0.2s; text-align:center; }
    .card:hover { transform:translateY(-3px); border-color:#8b5cf6; }
  </style></head><body>
    <div class="logo">Vortex Chromium</div>
    <div class="sub">Navegador Oficial da Rede .vort</div>
    <div class="search-box">
      <input id="q" placeholder="Digite um endereço .vort (ex: vortex.api.vort)" onkeydown="if(event.key==='Enter')go()">
      <button onclick="go()">Acessar</button>
    </div>
    <div class="shortcuts">
      <div class="card" onclick="location.href='about:blank'; window.parent.navigateBrowser('vortex.api.vort')">📚 Documentação API (vortex.api.vort)</div>
    </div>
    <script>function go(){ var v=document.getElementById('q').value; if(v) window.parent.navigateBrowser(v); }</script>
  </body></html>`;
}

function getVortexApiDocHTML(){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; padding:24px; background:#11111b; color:#cdd6f4; font-family:sans-serif; line-height:1.6; }
    h1 { color:#cba6f7; border-bottom:2px solid #313244; padding-bottom:8px; }
    h2 { color:#89b4fa; margin-top:24px; }
    code { background:#1e1e2e; color:#f38ba8; padding:3px 7px; border-radius:4px; font-family:monospace; }
    pre { background:#181825; padding:14px; border-radius:8px; border:1px solid #313244; overflow-x:auto; color:#a6e3a1; font-family:monospace; }
    .box { background:#1e1e2e; padding:16px; border-radius:8px; border-left:4px solid #cba6f7; margin-bottom:16px; }
  </style></head><body>
    <h1>📖 Vortex Engine — Documentação da API (v11.0)</h1>
    <p>Bem-vindo à documentação oficial dos scripts <code>.vortex</code>.</p>
    <div class="box">
      <b>🚀 Ciclo Principal do Jogo:</b>
      <p>Todo script pode declarar duas funções principais:</p>
      <code>def _ready():</code> — Executada 1 vez quando o jogo inicia.<br>
      <code>def _update():</code> — Executada a cada quadro (60 FPS).
    </div>
    <h2>1. Controle do Jogador e Física</h2>
    <pre>
player = vortex.get_player()               # Retorna o objeto do Jogador
vortex.move_player(dx, dy)                 # Move o jogador (ex: vortex.move_player(4, 0))
vortex.apply_gravity(player, 0.6)          # Aplica gravidade contínua
vortex.is_on_floor(player)                 # Retorna True se o jogador toca no chão
vortex.move_and_collide(player)            # Trata colisões automáticas com blocos
    </pre>
  </body></html>`;
}

function getNotFoundVortHTML(url){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; padding:0; background:#0f0f17; color:#fff; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; }
    h1 { font-size:36px; color:#f38ba8; }
    p { color:#94a3b8; }
    button { padding:10px 20px; border-radius:8px; border:none; background:#8b5cf6; color:#fff; cursor:pointer; font-weight:bold; }
  </style></head><body>
    <h1>404 — Site .vort não encontrado</h1>
    <p>O endereço <b>${escapeHtml(url)}</b> ainda não foi publicado na rede Vortex.</p>
    <button onclick="window.parent.openWindow('win-vort-studio')">Criar este site no Criador .vort</button>
  </body></html>`;
}

function getCustomVortSiteHTML(title, contentHtml, author){
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body { margin:0; padding:20px; background:#1e1e2e; color:#cdd6f4; font-family:sans-serif; }
    footer { margin-top:40px; font-size:12px; color:#6c7086; border-top:1px solid #313244; padding-top:10px; }
  </style></head><body>
    ${contentHtml}
    <footer>Site hospedado na rede .vort por @${escapeHtml(author||"desconhecido")}</footer>
  </body></html>`;
}

function publishVortSite(){
  if(!currentUser) return alert("Faça login para publicar.");
  let domain = document.getElementById("vort-site-domain").value.trim().toLowerCase();
  const title = document.getElementById("vort-site-title").value.trim() || domain;
  const html = document.getElementById("vort-site-html").value;

  if(!domain) return alert("Digite um domínio .vort.");
  if(!domain.endsWith(".vort")) domain += ".vort";

  const siteKey = domain.replace(".vort","").replace(/[.#$/\[\]]/g,"_");
  database.ref("vortSites/"+siteKey).set({
    domain, title, html, author: currentUser.displayName||currentUser.key, authorKey: currentUser.key, updatedAt: Date.now()
  }).then(()=>{
    alert("✅ Site "+domain+" publicado com sucesso!");
    closeWindow("win-vort-studio");
    openWindow("win-browser");
    navigateBrowser(domain);
  }).catch(e=>alert("Erro ao publicar site: "+e.message));
}

/* ================= ADMIN / GLOBAL SYSTEM ================= */
function updateAdminVisibility(){
  const icon=document.getElementById("admin-desktop-icon"), start=document.getElementById("admin-start-btn");
  const yes=isAdmin();
  if(icon) icon.style.display=yes?"block":"none";
  if(start) start.style.display=yes?"block":"none";
}
function startSystemListeners(){
  stopSystemListeners();
  const maintenanceRef=database.ref("system/maintenance");
  const resetRef=database.ref("system/globalResetAt");
  const banRef=currentUser?database.ref("users/"+currentUser.key+"/messengerBanned"):null;
  const maintenanceHandler=s=>{const on=!!s.val(); document.body.dataset.maintenance=on?"1":"0"; if(on&&!isAdmin()) showMaintenanceOverlay(); else hideMaintenanceOverlay();};
  const resetHandler=s=>{const ts=Number(s.val()||0); if(ts && ts!==Number(localStorage.getItem("vortex_last_global_reset")||0)){localStorage.setItem("vortex_last_global_reset",String(ts)); shutdownPC(); alert("O Vortex OS v11.0 foi reiniciado globalmente.");}};
  const banHandler=s=>{if(!currentUser)return;currentUser.messengerBanned=!!s.val(); if(currentUser.messengerBanned){clearMessengerListeners(); if(document.getElementById("win-messenger")?.style.display!=="none") closeWindow("win-messenger"); alert("Seu acesso ao Messenger foi bloqueado.");}};
  maintenanceRef.on("value",maintenanceHandler); resetRef.on("value",resetHandler); if(banRef)banRef.on("value",banHandler);
  systemListeners.push(()=>maintenanceRef.off("value",maintenanceHandler),()=>resetRef.off("value",resetHandler)); if(banRef)systemListeners.push(()=>banRef.off("value",banHandler));
}
function stopSystemListeners(){systemListeners.forEach(fn=>{try{fn();}catch{}});systemListeners=[];}
function showMaintenanceOverlay(){
  let e=document.getElementById("maintenance-overlay"); if(!e){e=document.createElement("div");e.id="maintenance-overlay";e.className="full-overlay dark";e.innerHTML='<div class="power-card"><div class="brand-mark">V</div><h1>Vortex OS</h1><p>O sistema está em manutenção.</p><small>Volte em alguns minutos.</small></div>';document.body.appendChild(e);} e.style.display="flex";
}
function hideMaintenanceOverlay(){document.getElementById("maintenance-overlay")?.remove();}

/* ================= THEME / WALLET / PIX ================= */
function setTheme(name){
  const t={
    purple:"linear-gradient(135deg,#2e0854,#12002b,#4a154b)",
    "dark-purple":"linear-gradient(135deg,#0f172a,#1e1b4b,#311042)",
    "cyber-blue":"linear-gradient(135deg,#0284c7,#0f172a,#1e1b4b)",
    sunset:"linear-gradient(135deg,#831843,#312e81,#0f172a)"
  };
  document.body.style.background=t[name]||t.purple;
  localStorage.setItem("vortex_theme",name);
}
function updateBalanceUI(){const value=Number(currentUser?.balance||0).toFixed(2);const e=document.getElementById("user-balance");if(e)e.innerText=value;const p=document.getElementById("pay-balance");if(p)p.innerText=value;}
function addBalance(amount){if(!currentUser)return Promise.reject("Sem sessão");amount=Number(amount)||0;return database.ref("users/"+currentUser.key+"/balance").transaction(v=>Number(v||0)+amount).then(r=>{currentUser.balance=Number(r.snapshot.val()||0);updateBalanceUI();});}
function claimDailyReward(){if(!currentUser)return alert("Faça login primeiro.");const now=Date.now(),last=Number(currentUser.lastDaily||0),day=86400000;if(now-last<day)return alert("Você já coletou a diária hoje.");return addBalance(10).then(()=>database.ref("users/"+currentUser.key+"/lastDaily").set(now)).then(()=>{currentUser.lastDaily=now;alert("Você recebeu R$ 10,00.");}).catch(e=>alert("Erro: "+e.message));}
function openPix(){openWindow("win-pix");document.getElementById("pix-recipient").value="";document.getElementById("pix-amount").value="";}
function sendPix(){
  if(!currentUser)return alert("Faça login primeiro.");
  const nick=document.getElementById("pix-recipient").value.trim(), amount=Number(document.getElementById("pix-amount").value);
  if(!nick||!amount||amount<=0)return alert("Informe destinatário e valor.");
  const targetKey=keyForNick(nick);
  if(targetKey===currentUser.key)return alert("❌ Você não pode enviar Pix para você mesmo.");
  database.ref("users/"+targetKey).once("value").then(s=>{
    if(!s.exists())throw new Error("Usuário não encontrado.");
    const senderRef=database.ref("users/"+currentUser.key+"/balance");
    return senderRef.transaction(v=>{const n=Number(v||0);return n>=amount?n-amount:v;}).then(r=>{
      const balance=Number(r.snapshot.val()||0);
      if(balance<0||balance===Number(currentUser.balance||0))throw new Error("Saldo insuficiente.");
      currentUser.balance=balance;updateBalanceUI();
      return database.ref("users/"+targetKey+"/balance").transaction(v=>Number(v||0)+amount);
    });
  }).then(()=>alert("✅ Pix enviado para @"+nick+" no valor de R$ "+amount.toFixed(2)+"."))
    .catch(e=>alert("Pix não enviado: "+e.message));
}

/* ================= TERMINAL / CALC ================= */
function handleTerminal(e){if(e.key!=="Enter")return;const i=document.getElementById("terminal-input"),o=document.getElementById("terminal-output"),c=i.value.trim();i.value="";o.innerHTML+="<br>&gt; "+escapeHtml(c)+"<br>";const cmd=c.toLowerCase();if(cmd==="help")o.innerHTML+="Comandos: help, clear, whoami, balance, date, apps, version, messenger, browser, shutdown";else if(cmd==="clear")o.innerHTML="";else if(cmd==="whoami")o.innerHTML+=escapeHtml(currentUser?.displayName||"Nenhum usuário");else if(cmd==="balance")o.innerHTML+="R$ "+Number(currentUser?.balance||0).toFixed(2);else if(cmd==="date")o.innerHTML+=new Date().toLocaleString("pt-BR");else if(cmd==="apps")o.innerHTML+=Array.from(openApps).join(", ")||"Nenhum";else if(cmd==="version")o.innerHTML+="Vortex OS v"+OS_VERSION;else if(cmd==="messenger")openWindow("win-messenger");else if(cmd==="browser")openWindow("win-browser");else if(cmd==="shutdown")shutdownPC();else o.innerHTML+="Comando não reconhecido.";o.scrollTop=o.scrollHeight;}
function calcInput(v){document.getElementById("calc-display").value+=v}
function calcClear(){document.getElementById("calc-display").value=""}
function calcEval(){const d=document.getElementById("calc-display");try{if(!/^[0-9+\-*/.\s]+$/.test(d.value))throw 0;d.value=String(Function('"use strict";return ('+d.value+')')());}catch{d.value="Erro";}}

/* ================= VORTEX ENGINE EDITOR ================= */
function uid(){return "obj_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);}
function defaultObject(type="square"){
  const n=currentSceneObjects.length;
  const types={
    square:{shape:"square",color:"#8b5cf6",w:64,h:64},
    circle:{shape:"circle",color:"#facc15",w:48,h:48},
    triangle:{shape:"triangle",color:"#22c55e",w:60,h:60},
    player:{shape:"square",color:"#38bdf8",w:48,h:56},
    coin:{shape:"circle",color:"#facc15",w:32,h:32},
    ui_text:{shape:"ui_text",color:"#ffffff",w:120,h:32,text:"Novo Texto",fontSize:20},
    ui_button:{shape:"ui_button",color:"#8b5cf6",w:100,h:36,text:"Botão",textColor:"#ffffff",fontSize:14},
    ui_panel:{shape:"ui_panel",color:"rgba(30, 30, 46, 0.8)",w:180,h:120}
  };
  const t=types[type]||types.square;
  return {
    id:uid(), name:(type.startsWith("ui_")?type.replace("ui_","UI ").toUpperCase():type.toUpperCase())+" "+(n+1),
    type, shape:t.shape, color:t.color, x:80+n*12, y:80+n*8, w:t.w, h:t.h, z:n,
    text:t.text||"", fontSize:t.fontSize||16, textColor:t.textColor||"#ffffff"
  };
}

function initEngineEditor(){
  injectDynamicEngineStyles();
  renderEngineScene();
  renderHierarchy();
  updateInspector();
}

function setEngineTool(t){
  engineTool=t;
  document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===t));
  const e=document.getElementById("engine-tool-label");
  if(e)e.innerText={select:"Selecionar / Mover",scale:"Dimensionar (Unity Style)",square:"Quadrado",circle:"Círculo",triangle:"Triângulo",player:"Player",coin:"Moeda",ui_text:"Texto UI",ui_button:"Botão UI",ui_panel:"Painel UI",erase:"Apagar"}[t]||t;
}

function addEngineObject(type){
  const o=defaultObject(type);
  currentSceneObjects.push(o);
  selectedObjectId=o.id;
  saveEngineLocal();
  renderEngineScene();
  renderHierarchy();
  updateInspector();
}

function duplicateSelectedObject(){
  const o=getSelected(); if(!o) return;
  const copy=JSON.parse(JSON.stringify(o));
  copy.id=uid(); copy.name=o.name+" (Cópia)"; copy.x+=20; copy.y+=20;
  currentSceneObjects.push(copy);
  selectedObjectId=copy.id;
  saveEngineLocal(); renderEngineScene(); renderHierarchy(); updateInspector();
}

function deleteSelectedObject(){
  if(!selectedObjectId) return;
  currentSceneObjects=currentSceneObjects.filter(x=>x.id!==selectedObjectId);
  selectedObjectId=null;
  saveEngineLocal(); renderEngineScene(); renderHierarchy(); updateInspector();
}

function selectObject(id){
  selectedObjectId=id;
  renderEngineScene(); renderHierarchy(); updateInspector();
}

function getSelected(){return currentSceneObjects.find(o=>o.id===selectedObjectId)||null;}

function updateObjFromInspector(field,val){
  const o=getSelected();if(!o)return;
  if(["name","color","shape","text","textColor"].includes(field)) o[field]=val;
  else o[field]=Number(val);
  saveEngineLocal(); renderEngineScene(); renderHierarchy();
}

function shapeStyle(o){
  const s={
    position:"absolute", boxSizing:"border-box", zIndex:o.z||1,
    left:(o.x + enginePan.x)+"px", top:(o.y + enginePan.y)+"px",
    width:o.w+"px", height:o.h+"px"
  };
  if(o.shape==="circle"){ s.background=o.color; s.borderRadius="50%"; }
  else if(o.shape==="triangle"){
    s.background="transparent"; s.width="0px"; s.height="0px";
    s.border="0 solid transparent"; s.borderLeft=o.w/2+"px solid transparent"; s.borderRight=o.w/2+"px solid transparent"; s.borderBottom=o.h+"px solid "+o.color;
  }
  else if(o.shape==="ui_text"){
    s.background="transparent"; s.color=o.color||"#fff"; s.fontSize=(o.fontSize||18)+"px"; s.fontWeight="bold"; s.userSelect="none";
  }
  else if(o.shape==="ui_button"){
    s.background=o.color; s.color=o.textColor||"#fff"; s.borderRadius="6px"; s.display="flex"; s.alignItems="center"; s.justifyContent="center"; s.fontSize=(o.fontSize||14)+"px"; s.fontWeight="bold"; s.userSelect="none";
  }
  else if(o.shape==="ui_panel"){
    s.background=o.color; s.border="1px solid rgba(255,255,255,0.2)"; s.borderRadius="8px";
  }
  else { s.background=o.color; s.border="1px solid rgba(255,255,255,0.2)"; }
  return s;
}

function applyStyles(el,styles){Object.entries(styles).forEach(([k,v])=>el.style[k]=v);}

function renderEngineScene(){
  const c=document.getElementById("canvas-2d");if(!c)return;
  c.innerHTML="";

  currentSceneObjects.forEach(o=>{
    const el=document.createElement("div");
    el.className="engine-object";
    el.dataset.id=o.id;
    applyStyles(el,shapeStyle(o));

    if(o.shape==="ui_text") el.innerText=o.text||"Texto";
    if(o.shape==="ui_button") el.innerText=o.text||"Botão";

    if(o.id===selectedObjectId){
      el.classList.add("selected-unity");
      attachUnityScaleHandles(el, o);
    }

    el.onmousedown=e=>{
      e.stopPropagation();
      if(e.button===0) handleObjectPointer(e,o.id);
    };

    c.appendChild(el);
  });

  c.onmousedown=e=>{
    if(e.target!==c) return;
    if(e.button===0){
      if(["square","circle","triangle","player","coin","ui_text","ui_button","ui_panel"].includes(engineTool)){
        const p=pointerToScene(e);
        const o=defaultObject(engineTool);
        o.x=Math.round(p.x - enginePan.x);
        o.y=Math.round(p.y - enginePan.y);
        currentSceneObjects.push(o); selectedObjectId=o.id;
        saveEngineLocal(); renderEngineScene(); renderHierarchy(); updateInspector();
      } else {
        isPanning=true;
        panStart={ x: e.clientX - enginePan.x, y: e.clientY - enginePan.y };
        selectedObjectId=null; renderEngineScene(); renderHierarchy(); updateInspector();
      }
    }
  };
}

document.addEventListener("mousemove",e=>{
  if(isPanning){
    enginePan.x = e.clientX - panStart.x;
    enginePan.y = e.clientY - panStart.y;
    renderEngineScene();
  }
});
document.addEventListener("mouseup",()=>{ isPanning=false; });

function pointerToScene(e){const c=document.getElementById("canvas-2d"),r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}

function attachUnityScaleHandles(el, o){
  const handles = ["nw","n","ne","e","se","s","sw","w"];
  handles.forEach(h=>{
    const hd = document.createElement("div");
    hd.className = `resize-handle handle-${h}`;
    hd.onmousedown = (e) => {
      e.stopPropagation();
      activeResizeHandle = h;
      resizeStart = { x: e.clientX, y: e.clientY, ox: o.x, oy: o.y, ow: o.w, oh: o.h };
      
      const onMove = (ev) => {
        const dx = ev.clientX - resizeStart.x;
        const dy = ev.clientY - resizeStart.y;
        
        if(h.includes("e")) o.w = Math.max(10, resizeStart.ow + dx);
        if(h.includes("s")) o.h = Math.max(10, resizeStart.oh + dy);
        if(h.includes("w")){
          const nw = Math.max(10, resizeStart.ow - dx);
          o.x = resizeStart.ox + (resizeStart.ow - nw);
          o.w = nw;
        }
        if(h.includes("n")){
          const nh = Math.max(10, resizeStart.oh - dy);
          o.y = resizeStart.oy + (resizeStart.oh - nh);
          o.h = nh;
        }
        renderEngineScene(); updateInspector();
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        saveEngineLocal();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    el.appendChild(hd);
  });
}

function handleObjectPointer(e,id){
  const o=currentSceneObjects.find(x=>x.id===id);if(!o)return;
  if(engineTool==="erase"){
    currentSceneObjects=currentSceneObjects.filter(x=>x.id!==id);
    selectedObjectId=null; saveEngineLocal(); renderEngineScene(); renderHierarchy(); updateInspector(); return;
  }
  selectedObjectId=id;
  const start=pointerToScene(e), ox=o.x, oy=o.y;
  const move=ev=>{
    const p=pointerToScene(ev);
    o.x=Math.round(ox + p.x - start.x);
    o.y=Math.round(oy + p.y - start.y);
    renderEngineScene(); updateInspector();
  };
  const up=()=>{
    document.removeEventListener("mousemove",move);
    document.removeEventListener("mouseup",up);
    saveEngineLocal(); renderHierarchy();
  };
  document.addEventListener("mousemove",move); document.addEventListener("mouseup",up);
  renderEngineScene(); renderHierarchy(); updateInspector();
}

function renderHierarchy(){
  const t=document.getElementById("hierarchy-tree");if(!t)return;
  t.innerHTML="";

  if(!document.getElementById("ui-hierarchy-tools")){
    const div = document.createElement("div");
    div.id = "ui-hierarchy-tools";
    div.style.cssText = "display:flex; gap:4px; margin:6px 0; flex-wrap:wrap;";
    div.innerHTML = `
      <button class="add-object" style="padding:4px; font-size:11px;" onclick="addEngineObject('ui_text')">+ Texto UI</button>
      <button class="add-object" style="padding:4px; font-size:11px;" onclick="addEngineObject('ui_button')">+ Botão UI</button>
      <button class="add-object" style="padding:4px; font-size:11px;" onclick="addEngineObject('ui_panel')">+ Painel UI</button>
    `;
    t.parentNode.insertBefore(div, t);
  }

  currentSceneObjects.forEach(o=>{
    const li=document.createElement("li");
    li.className=o.id===selectedObjectId?"selected":"";
    li.innerHTML=`<span class="mini-shape" style="background:${escapeHtml(o.color)}"></span>${escapeHtml(o.name)}`;
    li.onclick=()=>selectObject(o.id);
    t.appendChild(li);
  });

  vortexScripts.forEach(s=>{
    const li=document.createElement("li");
    li.className="script-item";
    li.style.cssText = "display:flex; justify-content:space-between; align-items:center;";
    li.innerHTML=`<span>▣ ${escapeHtml(s.name)}.vortex</span>
      <div style="display:flex; gap:4px;">
        <button style="background:none;border:none;color:#8b5cf6;cursor:pointer;" onclick="event.stopPropagation(); duplicateVortexScript('${s.id}')" title="Duplicar">📋</button>
        <button style="background:none;border:none;color:#f38ba8;cursor:pointer;" onclick="event.stopPropagation(); deleteVortexScript('${s.id}')" title="Remover">🗑</button>
      </div>`;
    li.onclick=()=>openVortexScriptEditor(s.id);
    t.appendChild(li);
  });
}

function updateInspector(){
  const box=document.getElementById("inspector-content");if(!box)return;
  const o=getSelected();
  if(!o){
    box.innerHTML="<div class='inspector-empty'>Selecione um objeto na cena ou na hierarquia.</div>";
    return;
  }

  let extraUiFields = "";
  if(o.shape.startsWith("ui_")){
    if(o.shape==="ui_text" || o.shape==="ui_button"){
      extraUiFields += `<label>Texto<input id="ins-text" value="${escapeHtml(o.text||"")}"></label>
                        <label>Tamanho da Fonte<input id="ins-fontSize" type="number" value="${o.fontSize||16}"></label>`;
    }
    if(o.shape==="ui_button"){
      extraUiFields += `<label>Cor do Texto<input id="ins-textColor" type="color" value="${o.textColor||"#ffffff"}"></label>`;
    }
  }

  box.innerHTML=`<label>Nome<input id="ins-name" value="${escapeHtml(o.name)}"></label>
  <label>Forma / Tipo<select id="ins-shape"><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option><option value="ui_text">Texto UI</option><option value="ui_button">Botão UI</option><option value="ui_panel">Painel UI</option></select></label>
  <label>Cor<input id="ins-color" value="${o.color}"></label>
  ${extraUiFields}
  <div class="ins-grid"><label>X<input id="ins-x" type="number" value="${o.x}"></label><label>Y<input id="ins-y" type="number" value="${o.y}"></label><label>Largura<input id="ins-w" type="number" min="4" value="${o.w}"></label><label>Altura<input id="ins-h" type="number" min="4" value="${o.h}"></label></div>
  <div style="display:flex; gap:6px; margin-top:10px;">
    <button class="btn" style="flex:1;" onclick="duplicateSelectedObject()">Duplicar</button>
    <button class="btn danger" style="flex:1;" onclick="deleteSelectedObject()">Excluir</button>
  </div>`;

  document.getElementById("ins-shape").value=o.shape;
  ["name","shape","color","text","fontSize","textColor","x","y","w","h"].forEach(f=>{
    const el = document.getElementById("ins-"+f);
    if(el) el.addEventListener("input",e=>updateObjFromInspector(f,e.target.value));
  });
}

/* ================= PERSISTÊNCIA DO PROJETO VORTEX ENGINE ================= */
function saveEngineLocal(){
  const userStorageKey = currentUser ? "vortex_scene_" + currentUser.key : "vortex_scene_guest";
  const payload = {
    objects: currentSceneObjects,
    scripts: vortexScripts,
    active: activeScriptId
  };
  try {
    localStorage.setItem(userStorageKey, JSON.stringify(payload));
  } catch(e) {
    console.error("Erro ao salvar projeto Vortex:", e);
  }
}

function loadEngineLocal(){
  const userStorageKey = currentUser ? "vortex_scene_" + currentUser.key : "vortex_scene_guest";
  try {
    const d = JSON.parse(localStorage.getItem(userStorageKey) || "{}");
    currentSceneObjects = Array.isArray(d.objects) ? d.objects : [];
    vortexScripts = Array.isArray(d.scripts) ? d.scripts : [];
    activeScriptId = d.active || vortexScripts[0]?.id || null;
  } catch(e) {
    currentSceneObjects = [];
    vortexScripts = [];
    activeScriptId = null;
  }

  if(!currentSceneObjects.length){
    currentSceneObjects = [
      Object.assign(defaultObject("player"), {x:80, y:80, name:"Player"}),
      Object.assign(defaultObject("square"), {x:40, y:220, w:220, h:40, name:"Chão"}),
      Object.assign(defaultObject("coin"), {x:120, y:170, name:"Moeda"})
    ];
  }

  if(!vortexScripts.length){
    const id = "script_" + Date.now();
    vortexScripts = [{id, name:"main", code: DEFAULT_VORTEX_CODE}];
    activeScriptId = id;
  }
  initEngineEditor();
}

function clearScene(){if(!confirm("Apagar toda a cena?"))return;currentSceneObjects=[];selectedObjectId=null;saveEngineLocal();initEngineEditor();}

/* ================= VORTEX SCRIPTING ENGINE ================= */
const DEFAULT_VORTEX_CODE=`# Vortex OS v11.0 — Script de Exemplo
def _ready():
    print("Jogo iniciado!")
    vortex.create_text("hud", "Vortex Engine v11.0", 12, 12, "#ffffff")

def _update():
    player = vortex.get_player()
    if player == None:
        return

    if vortex.is_key_down("a") or vortex.is_key_down("arrowleft"):
        vortex.move_player(-4, 0)
    if vortex.is_key_down("d") or vortex.is_key_down("arrowright"):
        vortex.move_player(4, 0)

    vortex.apply_gravity(player, 0.6)
    if (vortex.is_key_down(" ") or vortex.is_key_down("w")) and vortex.is_on_floor(player):
        player.vy = -12

    vortex.move_and_collide(player)

    for moeda in vortex.get_coins():
        if not moeda.collected and vortex.check_collision(player, moeda):
            vortex.collect_coin(moeda)
            vortex.add_coins(1)
            vortex.set_text("hud", "Moedas: " + str(vortex.get_coins_count()))

    vortex.follow_camera(player, 300, 200)`;

function createVortexScript(){
  const name=prompt("Nome do script (sem extensão):","script")||"script", id="script_"+Date.now();
  const code=DEFAULT_VORTEX_CODE;
  vortexScripts.push({id,name,code});activeScriptId=id;saveEngineLocal();openVortexScriptEditor(id);
}
function duplicateVortexScript(id){
  const s=vortexScripts.find(x=>x.id===id); if(!s) return;
  const copy={ id:"script_"+Date.now(), name:s.name+"_copia", code:s.code };
  vortexScripts.push(copy); activeScriptId=copy.id; saveEngineLocal(); renderHierarchy(); renderScriptsSidebarList();
}

function deleteVortexScript(id) {
  const scriptToDelete = vortexScripts.find(x => x.id === id);
  if (!scriptToDelete) return;

  if (!confirm(`Deseja excluir o script "${scriptToDelete.name}.vortex"?`)) return;

  // Remove o script da lista
  vortexScripts = vortexScripts.filter(x => x.id !== id);

  // Se o script deletado era o ativo, escolhe o primeiro da lista restante
  if (activeScriptId === id) {
    activeScriptId = vortexScripts[0]?.id || null;
  }

  saveEngineLocal();
  renderHierarchy();
  renderScriptsSidebarList();

  // Atualiza a tela do editor de código
  if (activeScriptId) {
    openVortexScriptEditor(activeScriptId);
  } else {
    // Se não restou nenhum script
    const fileNameEl = document.getElementById("vortex-filename");
    const codeEditorEl = document.getElementById("vortex-code-editor");
    if (fileNameEl) fileNameEl.value = "";
    if (codeEditorEl) codeEditorEl.value = "# Nenhum script aberto. Crie um novo script!";
  }
}

function openVortexScriptEditor(id){activeScriptId=id;const s=vortexScripts.find(x=>x.id===id);if(!s)return;openWindow("win-vscode");document.getElementById("vortex-filename").value=s.name;document.getElementById("vortex-code-editor").value=s.code;renderScriptsSidebarList();}
function renderScriptsSidebarList(){
  const l=document.getElementById("vscode-scripts-list");if(!l)return;l.innerHTML="";
  vortexScripts.forEach(s=>{
    const li=document.createElement("li");
    li.innerText=(s.id===activeScriptId?"➤ ":"")+"▣ "+s.name+".vortex";
    li.onclick=()=>openVortexScriptEditor(s.id);
    l.appendChild(li);
  });
}
function saveVortexScript(){
  const name=document.getElementById("vortex-filename").value.trim()||"main",code=document.getElementById("vortex-code-editor").value;
  let s=vortexScripts.find(x=>x.id===activeScriptId);
  if(!s){s={id:"script_"+Date.now(),name,code};vortexScripts.push(s);activeScriptId=s.id;}
  else{s.name=name;s.code=code;}
  saveEngineLocal();renderScriptsSidebarList();renderHierarchy();
}
function runScriptFromStudio(){saveVortexScript();openWindow("win-engine");setTimeout(()=>{if(document.getElementById("engine-test-screen").style.display==="none")toggleEngineTestMode();},50);}

function transpileVortexToJS(code){
  let safeCode = String(code || "").replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"').replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  function removeComments(line) {
    let inSingle = false, inDouble = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inSingle) inDouble = !inDouble;
      else if (c === "'" && !inDouble) inSingle = !inSingle;
      else if (c === '#' && !inSingle && !inDouble) return line.slice(0, i);
    }
    return line;
  }

  const lines = safeCode.split("\n"), out = [], stack = [0];

  for (const raw of lines) {
    const clean = removeComments(raw), trim = clean.trim();
    if (!trim) continue;

    const indent = raw.match(/^\s*/)[0].replace(/\t/g, "    ").length;
    while (indent < stack.at(-1)) { out.push("}"); stack.pop(); }

    let x = trim.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null").replace(/\band\b/g, "&&").replace(/\bor\b/g, "||").replace(/\bnot\s+/g, "!").replace(/\.append\(/g, ".push(");

    if (/^def\s+\w+\s*\(.*\)\s*:$/.test(x)) {
      out.push(x.replace(/^def\s+(\w+)\s*\((.*)\)\s*:$/, "function $1($2) {"));
      stack.push(indent + 4);
    } else if (/^if\s+.+:$/.test(x)) {
      out.push(x.replace(/^if\s+(.+):$/, "if($1){"));
      stack.push(indent + 4);
    } else if (/^else\s*:$/.test(x)) {
      out.push("}else{");
      stack.push(indent + 4);
    } else if (/^for\s+\w+\s+in\s+.+:$/.test(x)) {
      out.push(x.replace(/^for\s+(\w+)\s+in\s+(.+):$/, "for(let $1 of $2){"));
      stack.push(indent + 4);
    } else {
      x = x.replace(/\bprint\s*\(/g, "vortex.print(");
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*/.test(x) && !/^(let|var|const)\s/.test(x)) x = "var " + x;
      out.push(/[;{}]$/.test(x) ? x : x + ";");
    }
  }
  while (stack.length > 1) { out.push("}"); stack.pop(); }
  return out.join("\n");
}

function extractVortexTopLevelFunctions(code){return String(code||"").split("\n").map(r=>{const m=r.match(/^\s{0}def\s+(\w+)\s*\(/);return m?.[1]}).filter(Boolean);}
function compileVortexScript(code){
  const js=transpileVortexToJS(code), names=extractVortexTopLevelFunctions(code);
  const exports=names.map(n=>`${JSON.stringify(n)}:typeof ${n}==="function"?${n}:null`).join(",");
  const factory=new Function("vortex","str","int","float","len",`${js};return{_ready:typeof _ready==="function"?_ready:null,_update:typeof _update==="function"?_update:null,functions:{${exports}}};`);
  return api=>factory(api,String, v=>parseInt(v,10),v=>parseFloat(v),v=>v==null?0:(v.length??Object.keys(v).length));
}

/* ================= ENGINE RUNTIME ================= */
function checkCollision(a,b){return !!a&&!!b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function makeVortexEntity(inst,type,x,y,w,h,color,shape,extra={}){
  const defaults={block:{w:64,h:64,color:"#8b5cf6",shape:"square"},coin:{w:32,h:32,color:"#facc15",shape:"circle"},player:{w:48,h:56,color:"#38bdf8",shape:"square"}};
  const d=defaults[type]||defaults.block;
  const o=Object.assign({x:Number(x)||0,y:Number(y)||0,w:Number(w)||d.w,h:Number(h)||d.h,vx:0,vy:0,type,color:color||d.color,shape:shape||d.shape,collected:false,el:null},extra);
  const el=document.createElement("div");el.className="runtime-object";applyStyles(el,shapeStyle(o));if(type==="player")el.style.zIndex=10;
  if(o.shape==="ui_text") el.innerText=o.text||"";
  if(o.shape==="ui_button") el.innerText=o.text||"";
  o.el=el;inst.worldEl.appendChild(el);
  if(type==="block")inst.physicsData.blocks.push(o);else if(type==="coin")inst.physicsData.coins.push(o);else if(type==="player")inst.physicsData.player=o;return o;
}

function buildVortexAPI(inst){
  const api={
    print:(...a)=>inst.log(a.map(String).join(" ")),
    delta:()=>1/60,
    get_player:()=>inst.physicsData.player,
    get_blocks:()=>inst.physicsData.blocks,
    get_coins:()=>inst.physicsData.coins,
    is_key_down:k=>{
      const key=String(k).toLowerCase();
      if(key==="space"||key===" ") return !!(globalKeys[" "]||globalKeys["space"]);
      if(key==="arrowleft"||key==="left") return !!(globalKeys["arrowleft"]||globalKeys["left"]);
      if(key==="arrowright"||key==="right") return !!(globalKeys["arrowright"]||globalKeys["right"]);
      if(key==="arrowup"||key==="up") return !!(globalKeys["arrowup"]||globalKeys["up"]);
      if(key==="arrowdown"||key==="down") return !!(globalKeys["arrowdown"]||globalKeys["down"]);
      return !!globalKeys[key];
    },
    check_collision:checkCollision,
    move_player:(dx,dy)=>{
      const p=inst.physicsData.player;
      if(p){ p.vx=Number(dx)||0; if(dy!==undefined) p.vy=Number(dy); }
    },
    apply_gravity:(e,g=.6)=>{if(e)e.vy+=(Number(g)||0.6)*60*api.delta();},
    is_on_floor:e=>{
      if(!e)return false;
      return inst.physicsData.blocks.some(b=>Math.abs((e.y+e.h)-b.y)<=4 && e.x+e.w>b.x && e.x<b.x+b.w);
    },
    move_and_collide:e=>{
      if(!e)return;
      e.x+=e.vx||0;
      for(const b of inst.physicsData.blocks){
        if(checkCollision(e,b)){
          if(e.vx>0) e.x=b.x-e.w;
          else if(e.vx<0) e.x=b.x+b.w;
          e.vx=0;
        }
      }
      e.y+=e.vy||0;
      for(const b of inst.physicsData.blocks){
        if(checkCollision(e,b)){
          if(e.vy>0){ e.y=b.y-e.h; e.vy=0; }
          else if(e.vy<0){ e.y=b.y+b.h; e.vy=0; }
        }
      }
    },
    follow_camera:(e,ox=300,oy=200)=>{if(e)api.set_camera(e.x-ox,e.y-oy);},
    spawn_at:(type,x,y)=>makeVortexEntity(inst,type,x,y),
    destroy:e=>{if(!e)return;e.el?.remove();inst.physicsData.blocks=inst.physicsData.blocks.filter(x=>x!==e);inst.physicsData.coins=inst.physicsData.coins.filter(x=>x!==e);if(inst.physicsData.player===e)inst.physicsData.player=null;},
    collect_coin:c=>{if(c&&!c.collected){c.collected=true;c.el.style.display="none";}},
    add_coins:n=>inst.coinCount+=Number(n)||0,get_coins_count:()=>inst.coinCount,
    set_camera:(x,y)=>{inst.camera.x=Number(x)||0;inst.camera.y=Number(y)||0;},
    create_text:(id,text,x,y,color)=>{const e=document.createElement("div");e.style.cssText=`position:absolute;left:${x}px;top:${y}px;color:${color||"#fff"};font-weight:bold;font-family:sans-serif;`;e.innerText=text;inst.uiLayerEl.appendChild(e);inst.uiElements[id]={el:e};return e;},
    create_button:(id,text,x,y,fn)=>{const b=document.createElement("button");b.className="btn btn-primary";b.innerText=text;b.style.cssText=`position:absolute;left:${x}px;top:${y}px;pointer-events:auto;`;b.onclick=()=>{if(typeof fn==="function")fn();};inst.uiLayerEl.appendChild(b);inst.uiElements[id]={el:b};return b;},
    set_text:(id,text)=>{if(inst.uiElements[id])inst.uiElements[id].el.innerText=text;}
  };return api;
}

function syncVortexRender(pd){
  if(pd.player)applyStyles(pd.player.el,shapeStyle(pd.player));
  pd.blocks.forEach(b=>applyStyles(b.el,shapeStyle(b)));
  pd.coins.forEach(c=>{if(!c.collected)applyStyles(c.el,shapeStyle(c));});
}

function createVortexGameInstance(container,mapData,scriptCode,opts={}){
  container.innerHTML=""; container.style.cssText="position:relative;overflow:hidden;background:#090512;width:100%;height:100%;";
  const world=document.createElement("div");
  world.style.cssText="position:absolute;left:0;top:0;width:3000px;height:2000px;transform-origin:0 0;pointer-events:none;";
  container.appendChild(world);

  const ui=document.createElement("div");
  ui.style.cssText="position:absolute;inset:0;z-index:100;pointer-events:none;";
  container.appendChild(ui);

  const inst={
    containerEl:container, worldEl:world, uiLayerEl:ui,
    physicsData:{player:null,blocks:[],coins:[]}, uiElements:{},
    camera:{x:0,y:0}, coinCount:0, running:false,
    animFrameId:null, consoleEl:opts.consoleEl
  };

  inst.log=(m,err)=>{
    if(inst.consoleEl){
      inst.consoleEl.style.display="block";
      const l=document.createElement("div"); l.innerText=(err?"✖ ":"› ")+m; inst.consoleEl.appendChild(l);
    }
  };

  const data=Array.isArray(mapData)?mapData:[];
  data.forEach(o=>{
    const runtimeType = o.type==="player" ? "player" : o.type==="coin" ? "coin" : "block";
    makeVortexEntity(inst,runtimeType,o.x,o.y,o.w,o.h,o.color,o.shape,o);
  });

  try{
    inst.handlers=compileVortexScript(scriptCode||"")(buildVortexAPI(inst));
    inst.handlers?._ready?.();
  }catch(e){ inst.log("Erro no script: "+e.message,true); }

  const tick=()=>{
    if(!inst.running)return;
    if(inst.physicsData.player) inst.physicsData.player.vx=0;
    try{ inst.handlers?._update?.(); }catch(e){ if(inst.handlers)inst.handlers._update=null; }
    syncVortexRender(inst.physicsData);
    world.style.transform=`translate(${-inst.camera.x}px,${-inst.camera.y}px)`;
    inst.animFrameId = requestAnimationFrame(tick);
  };

  inst.start=()=>{
    if(!inst.running){
      inst.running=true;
      inst.animFrameId = requestAnimationFrame(tick);
    }
  };

  inst.stop=()=>{
    inst.running=false;
    if(inst.animFrameId!==null){
      cancelAnimationFrame(inst.animFrameId);
      inst.animFrameId=null;
    }
  };

  return inst;
}

/* ================= GERENCIADOR DE CENAS DA VORTEX ENGINE ================= */
let currentEngineScene = "Editor"; // Estado atual da cena: "Editor" ou "Game"

/**
 * Alterna explicitamente entre as cenas 'Editor' e 'Game' na Vortex Engine
 */
function switchEngineScene(targetScene) {
  const editorCanvas = document.getElementById("canvas-2d");
  const gameCanvas = document.getElementById("engine-test-screen");
  const btnPlay = document.getElementById("btn-engine-test");
  const consoleEl = document.getElementById("engine-console");

  if (targetScene === "Game") {
    // Validação de segurança antes de ir para a cena Game
    if (!currentSceneObjects.some(o => o.type === "player")) {
      return alert("Adicione um Player à cena antes de ir para a cena Game.");
    }

    saveVortexScript();
    const s = vortexScripts.find(x => x.id === activeScriptId);

    if (consoleEl) {
      consoleEl.innerHTML = "";
      consoleEl.style.display = "none";
    }

    // Oculta a cena Editor e exibe a cena Game
    if (editorCanvas) editorCanvas.style.display = "none";
    if (gameCanvas) {
      gameCanvas.style.cssText = "display:block;position:relative;overflow:hidden;background:#090512;height:calc(100% - 42px);";
    }

    if (btnPlay) {
      btnPlay.innerText = "■ PARAR (Voltar ao Editor)";
      btnPlay.classList.add("stop");
    }

    // Limpa qualquer execução anterior antes de iniciar a nova
    if (currentGameInstance) currentGameInstance.stop();

    // Instancia e roda a cena Game
    currentGameInstance = createVortexGameInstance(gameCanvas, currentSceneObjects, s?.code || "", { consoleEl });
    currentGameInstance.start();
    currentEngineScene = "Game";

  } else if (targetScene === "Editor") {
    // Interrompe e destrói o loop do jogo
    if (currentGameInstance) {
      currentGameInstance.stop();
      currentGameInstance = null;
    }

    // Oculta a cena Game e exibe a cena Editor
    if (gameCanvas) gameCanvas.style.display = "none";
    if (editorCanvas) editorCanvas.style.display = "block";

    if (btnPlay) {
      btnPlay.innerText = "▶ PLAY (Ir para Game)";
      btnPlay.classList.remove("stop");
    }

    currentEngineScene = "Editor";

    // Recarrega e renderiza a cena do Editor limpa
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

/**
 * Função chamada ao clicar no botão Play/Parar no topo da Engine
 */
function toggleEngineTestMode() {
  if (currentEngineScene === "Editor") {
    switchEngineScene("Game");
  } else {
    switchEngineScene("Editor");
  }
}

/**
 * Para o loop do jogo e força o retorno para a cena Editor
 */
function stopEngineTestLoop() {
  switchEngineScene("Editor");
}

function openPublishModalFromEngine(){document.getElementById("publish-modal").style.display="flex";}
function closePublishModal(){document.getElementById("publish-modal").style.display="none";}

function compileAndPublishEngineGame(){
  if(!currentUser)return alert("Faça login primeiro.");
  const title=document.getElementById("app-title-input").value.trim();
  const price=Math.max(0,Number(document.getElementById("app-price-input").value)||0);
  if(!title)return alert("Dê um nome ao jogo.");
  if(!currentSceneObjects.some(o=>o.type==="player"))return alert("Adicione um Player.");
  
  saveVortexScript();
  const s=vortexScripts.find(x=>x.id===activeScriptId);

  database.ref("publishedApps").once("value").then(sSnapshot=>{
    let existingAppId = null;
    if(sSnapshot.exists()){
      sSnapshot.forEach(child=>{
        const val = child.val();
        if(val.authorKey===currentUser.key && val.title.toLowerCase()===title.toLowerCase()){
          existingAppId = child.key;
        }
      });
    }

    if(existingAppId && !confirm(`Você já publicou "${title}". Deseja ATUALIZAR a build .vexe existente?`)){
      return;
    }

    const appId = existingAppId || ("app_" + Date.now());
    const app = {
      title, price, author:currentUser.displayName||currentUser.key, authorKey:currentUser.key,
      sceneObjects:currentSceneObjects, scriptCode:s?.code||"", updatedAt:Date.now()
    };

    return database.ref("publishedApps/"+appId).set(app)
      .then(()=>database.ref("users/"+currentUser.key+"/files/"+appId).set(true))
      .then(()=>{
        alert(existingAppId ? "✅ Build .vexe atualizada na loja!" : "✅ Jogo publicado na loja!");
        closePublishModal(); loadGlobalStore(); loadUserFiles();
      });
  }).catch(e=>alert("Erro: "+e.message));
}

function loadGlobalStore(){
  const l=document.getElementById("global-apps-list"); if(!l)return;
  database.ref("publishedApps").once("value").then(s=>{
    l.innerHTML="";
    if(!s.exists()){l.innerHTML="<p>Nenhum jogo publicado ainda.</p>";return;}
    s.forEach(c=>{
      const a=c.val()||{}, card=document.createElement("div"); card.className="app-card";
      card.innerHTML=`<h4>${escapeHtml(a.title||c.key)}</h4><p>Por ${escapeHtml(a.author||a.authorKey||"Usuário")}</p><p>R$ ${Number(a.price||0).toFixed(2)}</p><div class="store-actions"></div>`;
      const actions=card.querySelector(".store-actions"), buy=document.createElement("button");
      buy.className="btn btn-primary"; buy.innerText=(currentUser&&a.authorKey===currentUser.key)?"Adicionar à biblioteca":"Comprar"; buy.onclick=()=>buyApp(c.key,a); actions.appendChild(buy);
      if((currentUser&&a.authorKey===currentUser.key)||isAdmin()){const del=document.createElement("button");del.className="btn danger";del.innerText="Excluir";del.onclick=()=>deletePublishedGame(c.key,a);actions.appendChild(del);}
      l.appendChild(card);
    });
  });
}

function buyApp(id,a){
  if(!currentUser)return alert("Faça login.");
  const price=Math.max(0,Number(a.price||0));
  if(a.authorKey===currentUser.key){
    return database.ref("users/"+currentUser.key+"/files/"+id).set(true).then(()=>{ alert("Jogo adicionado aos seus arquivos."); loadUserFiles(); });
  }
  if(Number(currentUser.balance||0)<price)return alert("Saldo insuficiente.");
  const buyerRef=database.ref("users/"+currentUser.key+"/balance"), sellerRef=database.ref("users/"+a.authorKey+"/balance");
  let oldBuyer;
  return buyerRef.transaction(v=>{oldBuyer=Number(v||0);if(oldBuyer<price)return;return oldBuyer-price;})
    .then(r=>{if(!r.committed)throw new Error("Saldo insuficiente.");return sellerRef.transaction(v=>Number(v||0)+price);})
    .then(()=>database.ref("users/"+currentUser.key+"/files/"+id).set(true))
    .then(()=>{currentUser.balance=Number((oldBuyer-price).toFixed(2));updateBalanceUI();alert(`Compra concluída!`);loadUserFiles();})
    .catch(e=>alert("Erro: "+e.message));
}

function deletePublishedGame(id,a,admin=false){
  if(!currentUser)return; const owner=a?.authorKey===currentUser.key; if(!admin&&!owner&&!isAdmin())return alert("Acesso negado."); if(!confirm(`Excluir "${a?.title||id}"?`))return;
  return database.ref("publishedApps/"+id).remove().then(()=>database.ref("users/"+(a.authorKey||currentUser.key)+"/files/"+id).remove()).then(()=>{alert("Jogo excluído.");loadGlobalStore();loadUserFiles();}).catch(e=>alert("Erro: "+e.message));
}

function loadUserFiles(){
  const l=document.getElementById("files-list");if(!l||!currentUser)return;
  database.ref("users/"+currentUser.key+"/files").once("value").then(async s=>{
    l.innerHTML="";
    if(!s.exists()){l.innerHTML="<p>Nenhum .vexe instalado.</p>";return;}
    for(const id of Object.keys(s.val())){
      const a=(await database.ref("publishedApps/"+id).once("value")).val();
      if(!a)continue;
      const card=document.createElement("div");card.className="app-card";
      card.innerHTML=`<h4>${escapeHtml(a.title)}.vexe</h4><p>Por ${escapeHtml(a.author)}</p>`;
      const b=document.createElement("button");b.className="btn btn-primary";b.innerText="Executar";b.onclick=()=>runVexeApp(a);card.appendChild(b);l.appendChild(card);
    }
  });
}
function runVexeApp(app){openWindow("win-runner");document.getElementById("runner-title").innerText="Executando: "+app.title+".vexe";stopRunnerInstance();currentRunnerInstance=createVortexGameInstance(document.getElementById("runner-canvas"),app.sceneObjects||app.mapData||[],app.scriptCode||"");currentRunnerInstance.start();}
function stopRunnerInstance(){currentRunnerInstance?.stop();currentRunnerInstance=null;}

/* ================= VORTEX MESSENGER ================= */
function clearMessengerListeners(){messengerListeners.forEach(u=>{try{u();}catch{}});messengerListeners=[];if(messengerMessageUnsub){try{messengerMessageUnsub();}catch{}messengerMessageUnsub=null;}}
function safeUserName(data,key){return String(data?.displayName||data?.username||data?.nick||key||"Usuário");}
function loadFriends(){
  const l=document.getElementById("friends-list"); if(!l||!currentUser)return;
  const ref=database.ref("users/"+currentUser.key+"/friends");
  const handler=s=>{
    l.innerHTML=""; if(!s.exists()){l.innerHTML="<div class='muted'>Nenum amigo.</div>";return;}
    Object.keys(s.val()).forEach(k=>{
      const f=s.val()[k]||{}, name=safeUserName(f,k);
      const b=document.createElement("button"); b.className="friend-row";
      b.innerHTML=`<span class='avatar'>${escapeHtml(name[0].toUpperCase())}</span><span>@${escapeHtml(name)}</span>`;
      b.onclick=()=>openDM(k,name); l.appendChild(b);
    });
  };
  ref.on("value",handler); messengerListeners.push(()=>ref.off("value",handler));
}
function addFriend(){
  if(!currentUser)return; const nick=document.getElementById("friend-nick").value.trim(); if(!nick)return; const k=keyForNick(nick);
  if(k===currentUser.key)return alert("Você não pode adicionar a si mesmo.");
  database.ref("users/"+k).once("value").then(s=>{
    if(!s.exists())throw new Error("Nick não encontrado.");
    const d=s.val()||{}, targetName=safeUserName(d,k), myName=safeUserName(currentUser,currentUser.key);
    return Promise.all([
      database.ref("users/"+currentUser.key+"/friends/"+k).set({displayName:targetName,nick:k}),
      database.ref("users/"+k+"/friends/"+currentUser.key).set({displayName:myName,nick:currentUser.key})
    ]);
  }).then(()=>{document.getElementById("friend-nick").value="";alert("Amizade adicionada.");}).catch(e=>alert("Erro: "+e.message));
}
function dmId(a,b){return [a,b].sort().join("__");}
function openDM(key,name){currentChatType="dm";currentChatId=dmId(currentUser.key,key);currentGroupId=null;document.getElementById("chat-title").innerText="@"+safeUserName({displayName:name},key);document.getElementById("chat-subtitle").innerText="Conversa privada";listenMessages(currentChatId,"dm");}
function listenMessages(id,type){
  if(messengerMessageUnsub){try{messengerMessageUnsub();}catch{}messengerMessageUnsub=null;}
  const box=document.getElementById("messages"); if(!box)return; box.innerHTML="<div class='muted'>Carregando...</div>";
  const path=type==="dm"?"conversations/"+id+"/messages":"groups/"+id+"/messages";
  const ref=database.ref(path).limitToLast(100);
  const handler=s=>{
    box.innerHTML=""; if(!s.exists()){box.innerHTML="<div class='muted'>Nenhuma mensagem.</div>";return;}
    s.forEach(c=>renderMessage(box,c.val()||{})); box.scrollTop=box.scrollHeight;
  };
  ref.on("value",handler); messengerMessageUnsub=()=>ref.off("value",handler);
}
function renderMessage(box,m){
  const wrap=document.createElement("div"); wrap.className="message "+(m.senderKey===currentUser.key?"mine":"theirs");
  let content=escapeHtml(m.text||"").replace(/\n/g,"<br>");
  if(m.image) content+=`<img class="chat-image" src="${escapeHtml(m.image)}">`;
  wrap.innerHTML=`<div class="message-name">${escapeHtml(safeUserName(m,m.senderKey))}</div><div>${content}</div><small>${new Date(m.createdAt||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>`;
  box.appendChild(wrap);
}
function sendMessage(){
  if(!currentUser||!currentChatId)return;const input=document.getElementById("message-input"),text=input.value.trim();if(!text)return;
  const path=currentChatType==="dm"?"conversations/"+currentChatId+"/messages":"groups/"+currentChatId+"/messages";
  database.ref(path).push({senderKey:currentUser.key,senderName:safeUserName(currentUser,currentUser.key),text,createdAt:Date.now()});input.value="";
}
function sendEmoji(e){const i=document.getElementById("message-input");i.value+=(e||"🙂");i.focus();}
function sendImage(){
  if(!currentUser||!currentChatId)return;const input=document.getElementById("image-input");input.click();input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>700*1024)return alert("Imagem muito grande (máx 700KB).");const r=new FileReader();r.onload=()=>{const path=currentChatType==="dm"?"conversations/"+currentChatId+"/messages":"groups/"+currentChatId+"/messages";database.ref(path).push({senderKey:currentUser.key,senderName:safeUserName(currentUser,currentUser.key),image:r.result,createdAt:Date.now()});};r.readAsDataURL(file);input.value="";};
}
function loadMessengerHome(){loadFriends();if(!currentChatId){document.getElementById("chat-title").innerText="Vortex Messenger";document.getElementById("chat-subtitle").innerText="Escolha um amigo para conversar";}}

/* ================= INICIALIZAÇÃO DA APLICAÇÃO ================= */
window.addEventListener("DOMContentLoaded",()=>{
  const saved=localStorage.getItem("vortex_theme")||"purple";
  setTheme(saved);
  ensureDynamicAppWindows();
  tryAutoLogin();
  document.getElementById("message-input")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
});
