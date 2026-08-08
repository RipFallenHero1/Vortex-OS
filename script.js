/* =========================================================
   VORTEX OS v10.0 — OS + Vortex Engine + Vortex Messenger
   ========================================================= */
const OS_VERSION = "10.0";
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
const globalKeys={};
const TILE_W=32,TILE_H=35;

window.addEventListener("keydown",e=>{globalKeys[e.key.toLowerCase()]=true;});
window.addEventListener("keyup",e=>{globalKeys[e.key.toLowerCase()]=false;});
window.addEventListener("beforeunload",()=>saveEngineLocal());

function keyForNick(n){return String(n||"").trim().toLowerCase().replace(/[.#$/\[\]]/g,"_");}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

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
  updateBalanceUI(); startClock(); loadGlobalStore(); loadUserFiles(); loadFriends();
  loadEngineLocal(); loadMessengerHome();
}
function tryAutoLogin(){
  const k=localStorage.getItem("vortex_current_user"); if(!k)return;
  database.ref("users/"+k).once("value").then(s=>{if(s.exists())startSession(k,s.val());else localStorage.removeItem("vortex_current_user");});
}
function logoutUser(){localStorage.removeItem("vortex_current_user");currentUser=null;clearMessengerListeners();document.getElementById("login-screen").style.display="flex";}
function shutdownPC(){closeStartMenuIfOpen();document.getElementById("shutdown-screen").style.display="flex";if(clockInterval)clearInterval(clockInterval);stopEngineTestLoop();stopRunnerInstance();clearMessengerListeners();}
function powerOn(){document.getElementById("shutdown-screen").style.display="none";if(currentUser){document.getElementById("login-screen").style.display="none";startClock();}else document.getElementById("login-screen").style.display="flex";}
function startClock(){if(clockInterval)clearInterval(clockInterval);const u=()=>{const e=document.getElementById("os-clock");if(e){const d=new Date();e.innerText=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}};u();clockInterval=setInterval(u,30000);}
function openWindow(id){const w=document.getElementById(id);if(!w)return;w.style.display="flex";bringToFront(w);openApps.add(id);addTaskbarButton(id);if(id==="win-engine")initEngineEditor();if(id==="win-messenger")loadMessengerHome();if(id==="win-vscode")renderScriptsSidebarList();}
function closeWindow(id){const w=document.getElementById(id);if(w)w.style.display="none";openApps.delete(id);removeTaskbarButton(id);if(id==="win-engine")stopEngineTestLoop();if(id==="win-runner")stopRunnerInstance();if(id==="win-messenger")clearMessengerListeners();}
function bringToFront(w){if(!w)return;w.style.zIndex=++highestZIndex;}
function dragWindow(e,id){if(e.target.closest("button,input,textarea"))return;const w=document.getElementById(id);if(!w)return;bringToFront(w);let sx=e.clientX,sy=e.clientY,ox=w.offsetLeft,oy=w.offsetTop;const move=ev=>{w.style.left=(ox+ev.clientX-sx)+"px";w.style.top=(oy+ev.clientY-sy)+"px";};const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);};document.addEventListener("mousemove",move);document.addEventListener("mouseup",up);}
function addTaskbarButton(id){const bar=document.getElementById("taskbar-apps");if(!bar||document.getElementById("task-"+id))return;const b=document.createElement("button");b.id="task-"+id;b.className="taskbar-app-btn";b.innerText=document.querySelector("#"+id+" .window-header span")?.innerText||id;b.onclick=()=>{const w=document.getElementById(id);w.style.display="flex";bringToFront(w);};bar.appendChild(b);}
function removeTaskbarButton(id){document.getElementById("task-"+id)?.remove();}
function toggleStartMenu(){const m=document.getElementById("start-menu");m.classList.toggle("open");m.style.display=m.classList.contains("open")?"block":"none";}
function closeStartMenuIfOpen(){const m=document.getElementById("start-menu");if(m){m.classList.remove("open");m.style.display="none";}}
document.addEventListener("click",e=>{const m=document.getElementById("start-menu"),b=document.querySelector(".start-btn");if(m?.classList.contains("open")&&!m.contains(e.target)&&e.target!==b)closeStartMenuIfOpen();});

/* ================= THEME / WALLET / PIX ================= */
function setTheme(name){const t={purple:"linear-gradient(135deg,#2e0854,#12002b,#4a154b)","dark-purple":"linear-gradient(135deg,#0f172a,#1e1b4b,#311042)","cyber-blue":"linear-gradient(135deg,#0284c7,#0f172a,#1e1b4b)",sunset:"linear-gradient(135deg,#831843,#312e81,#0f172a)"};document.body.style.background=t[name]||t.purple;localStorage.setItem("vortex_theme",name);}
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
function handleTerminal(e){if(e.key!=="Enter")return;const i=document.getElementById("terminal-input"),o=document.getElementById("terminal-output"),c=i.value.trim();i.value="";o.innerHTML+="<br>&gt; "+escapeHtml(c)+"<br>";const cmd=c.toLowerCase();if(cmd==="help")o.innerHTML+="Comandos: help, clear, whoami, balance, date, apps, version, messenger, shutdown";else if(cmd==="clear")o.innerHTML="";else if(cmd==="whoami")o.innerHTML+=escapeHtml(currentUser?.displayName||"Nenhum usuário");else if(cmd==="balance")o.innerHTML+="R$ "+Number(currentUser?.balance||0).toFixed(2);else if(cmd==="date")o.innerHTML+=new Date().toLocaleString("pt-BR");else if(cmd==="apps")o.innerHTML+=Array.from(openApps).join(", ")||"Nenhum";else if(cmd==="version")o.innerHTML+="Vortex OS v"+OS_VERSION;else if(cmd==="messenger")openWindow("win-messenger");else if(cmd==="shutdown")shutdownPC();else o.innerHTML+="Comando não reconhecido.";o.scrollTop=o.scrollHeight;}
function calcInput(v){document.getElementById("calc-display").value+=v}
function calcClear(){document.getElementById("calc-display").value=""}
function calcEval(){const d=document.getElementById("calc-display");try{if(!/^[0-9+\-*/.\s]+$/.test(d.value))throw 0;d.value=String(Function('"use strict";return ('+d.value+')')());}catch{d.value="Erro";}}

/* ================= VORTEX ENGINE EDITOR ================= */
function uid(){return "obj_"+Date.now()+"_"+Math.random().toString(36).slice(2,7);}
function defaultObject(type="square"){
  const n=currentSceneObjects.length;
  const types={square:{shape:"square",color:"#8b5cf6",w:64,h:64},circle:{shape:"circle",color:"#facc15",w:48,h:48},triangle:{shape:"triangle",color:"#22c55e",w:60,h:60},player:{shape:"square",color:"#38bdf8",w:48,h:56},coin:{shape:"circle",color:"#facc15",w:32,h:32}};
  const t=types[type]||types.square;
  return {id:uid(),name:(type==="player"?"Player":type==="coin"?"Coin":"Object")+" "+(n+1),type,shape:t.shape,color:t.color,x:80+n*12,y:80+n*8,w:t.w,h:t.h,z:n};
}
function initEngineEditor(){renderEngineScene();renderHierarchy();updateInspector();}
function setEngineTool(t){engineTool=t;document.querySelectorAll("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===t));const e=document.getElementById("engine-tool-label");if(e)e.innerText={select:"Selecionar / Mover",scale:"Aumentar / Reduzir",square:"Quadrado",circle:"Círculo",triangle:"Triângulo",player:"Player",coin:"Moeda",erase:"Apagar"}[t]||t;}
function addEngineObject(type){const o=defaultObject(type);currentSceneObjects.push(o);selectedObjectId=o.id;saveEngineLocal();renderEngineScene();renderHierarchy();updateInspector();}
function selectObject(id){selectedObjectId=id;setEngineTool("select");renderEngineScene();renderHierarchy();updateInspector();}
function getSelected(){return currentSceneObjects.find(o=>o.id===selectedObjectId)||null;}
function updateObjFromInspector(field,val){const o=getSelected();if(!o)return;let v=(field==="name"||field==="color"||field==="shape")?val:Number(val);if(["x","y","w","h"].includes(field))v=Math.max(field==="w"||field==="h"?4:0,v||0);o[field]=v;saveEngineLocal();renderEngineScene();renderHierarchy();}
function shapeStyle(o){
  const s={background:o.color,width:o.w+"px",height:o.h+"px",left:o.x+"px",top:o.y+"px",position:"absolute",boxSizing:"border-box",border:"2px solid rgba(255,255,255,.35)",zIndex:o.z||1};
  if(o.shape==="circle")s.borderRadius="50%";
  if(o.shape==="triangle"){s.background="transparent";s.width="0px";s.height="0px";s.left=o.x+"px";s.top=o.y+"px";s.border="0 solid transparent";s.borderLeft=o.w/2+"px solid transparent";s.borderRight=o.w/2+"px solid transparent";s.borderBottom=o.h+"px solid "+o.color;}
  return s;
}
function applyStyles(el,styles){Object.entries(styles).forEach(([k,v])=>el.style[k]=v);}
function renderEngineScene(){
  const c=document.getElementById("canvas-2d");if(!c)return;
  c.innerHTML="";
  currentSceneObjects.forEach(o=>{
    const el=document.createElement("div");el.className="engine-object";el.dataset.id=o.id;applyStyles(el,shapeStyle(o));
    el.title=o.name;el.addEventListener("mousedown",e=>{e.stopPropagation();handleObjectPointer(e,o.id);});
    if(o.id===selectedObjectId&&o.shape!=="triangle")el.classList.add("selected");
    c.appendChild(el);
  });
  c.onmousedown=e=>{
    if(e.target!==c)return;
    if(["square","circle","triangle","player","coin"].includes(engineTool)){
      const p=pointerToScene(e),o=defaultObject(engineTool);
      o.x=Math.round(p.x/8)*8;o.y=Math.round(p.y/8)*8;
      currentSceneObjects.push(o);selectedObjectId=o.id;saveEngineLocal();renderEngineScene();renderHierarchy();updateInspector();
    }else{
      selectedObjectId=null;renderEngineScene();renderHierarchy();updateInspector();
    }
  };
}
function pointerToScene(e){const c=document.getElementById("canvas-2d"),r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function handleObjectPointer(e,id){
  const o=currentSceneObjects.find(x=>x.id===id);if(!o)return;
  if(engineTool==="erase"){currentSceneObjects=currentSceneObjects.filter(x=>x.id!==id);selectedObjectId=null;saveEngineLocal();renderEngineScene();renderHierarchy();updateInspector();return;}
  selectedObjectId=id;const start=pointerToScene(e), ox=o.x,oy=o.y,ow=o.w,oh=o.h;
  const move=ev=>{const p=pointerToScene(ev);if(engineTool==="scale"){o.w=Math.max(4,Math.round(ow+(p.x-start.x)));o.h=Math.max(4,Math.round(oh+(p.y-start.y)));}else{o.x=Math.max(0,Math.round(ox+p.x-start.x));o.y=Math.max(0,Math.round(oy+p.y-start.y));}renderEngineScene();updateInspector();};
  const up=()=>{document.removeEventListener("mousemove",move);document.removeEventListener("mouseup",up);saveEngineLocal();renderHierarchy();};
  document.addEventListener("mousemove",move);document.addEventListener("mouseup",up);
  renderEngineScene();renderHierarchy();updateInspector();
}
function renderHierarchy(){const t=document.getElementById("hierarchy-tree");if(!t)return;t.innerHTML="";currentSceneObjects.forEach(o=>{const li=document.createElement("li");li.className=o.id===selectedObjectId?"selected":"";li.innerHTML=`<span class="mini-shape" style="background:${escapeHtml(o.color)}"></span>${escapeHtml(o.name)}`;li.onclick=()=>selectObject(o.id);t.appendChild(li);});vortexScripts.forEach(s=>{const li=document.createElement("li");li.className="script-item";li.innerText="▣ "+s.name+".vortex";li.onclick=()=>openVortexScriptEditor(s.id);t.appendChild(li);});}
function updateInspector(){
  const box=document.getElementById("inspector-content");if(!box)return;const o=getSelected();
  if(!o){box.innerHTML="<div class='inspector-empty'>Selecione um objeto na cena ou na hierarquia.</div>";return;}
  box.innerHTML=`<label>Nome<input id="ins-name" value="${escapeHtml(o.name)}"></label>
  <label>Forma<select id="ins-shape"><option value="square">Quadrado</option><option value="circle">Círculo</option><option value="triangle">Triângulo</option></select></label>
  <label>Cor<input id="ins-color" type="color" value="${o.color}"></label>
  <div class="ins-grid"><label>X<input id="ins-x" type="number" value="${o.x}"></label><label>Y<input id="ins-y" type="number" value="${o.y}"></label><label>Largura<input id="ins-w" type="number" min="4" value="${o.w}"></label><label>Altura<input id="ins-h" type="number" min="4" value="${o.h}"></label></div>
  <button class="btn danger" id="ins-delete">Excluir objeto</button>`;
  document.getElementById("ins-shape").value=o.shape;
  ["name","shape","color","x","y","w","h"].forEach(f=>document.getElementById("ins-"+f).addEventListener("input",e=>updateObjFromInspector(f,e.target.value)));
  document.getElementById("ins-delete").onclick=()=>{currentSceneObjects=currentSceneObjects.filter(x=>x.id!==o.id);selectedObjectId=null;saveEngineLocal();renderEngineScene();renderHierarchy();updateInspector();};
}
function saveEngineLocal(){if(!currentUser)return;localStorage.setItem("vortex_scene_"+currentUser.key,JSON.stringify({objects:currentSceneObjects,scripts:vortexScripts,active:activeScriptId}));}
function loadEngineLocal(){if(!currentUser)return;try{const d=JSON.parse(localStorage.getItem("vortex_scene_"+currentUser.key)||"{}");currentSceneObjects=Array.isArray(d.objects)?d.objects:[];vortexScripts=Array.isArray(d.scripts)?d.scripts:[];activeScriptId=d.active||vortexScripts[0]?.id||null;
  }catch{currentSceneObjects=[];vortexScripts=[];activeScriptId=null;}
  if(!currentSceneObjects.length){currentSceneObjects=[Object.assign(defaultObject("player"),{x:80,y:80,name:"Player"}),Object.assign(defaultObject("square"),{x:40,y:220,w:220,h:40,name:"Chão"}),Object.assign(defaultObject("square"),{x:320,y:150,w:120,h:40,name:"Plataforma"}),Object.assign(defaultObject("coin"),{x:350,y:105,name:"Moeda"})];}
  if(!vortexScripts.length){const id="script_"+Date.now();vortexScripts=[{id,name:"main",code:DEFAULT_VORTEX_CODE.replace("function_marker_placeholder","")}];activeScriptId=id;}
  initEngineEditor();}
function clearScene(){if(!confirm("Apagar toda a cena?"))return;currentSceneObjects=[];selectedObjectId=null;saveEngineLocal();initEngineEditor();}

/* ================= VORTEX SCRIPTING ================= */
const DEFAULT_VORTEX_CODE=`# Vortex 10 — movimento pronto
def _ready():
    print("Jogo iniciado!")
    vortex.create_text("hud", "Vortex Engine", 12, 12, "#ffffff")

def _update():
    player = vortex.get_player()
    if player == None:
        return

    # Movimento simples: não precisa programar colisão do zero
    if vortex.is_key_down("a") or vortex.is_key_down("arrowleft"):
        vortex.move_player(-4, 0)
    if vortex.is_key_down("d") or vortex.is_key_down("arrowright"):
        vortex.move_player(4, 0)

    # Gravidade e pulo
    vortex.apply_gravity(player, 0.6)
    if (vortex.is_key_down(" ") or vortex.is_key_down("w")) and vortex.is_on_floor(player):
        player.vy = -12

    vortex.move_and_collide(player)

    for moeda in vortex.get_coins():
        if not moeda.collected and vortex.check_collision(player, moeda):
            vortex.collect_coin(moeda)
            vortex.add_coins(1)
            vortex.set_text("hud", "Moedas: " + str(vortex.get_coins_count()))

    vortex.follow_camera(player, 300, 200)

function_marker_placeholder`;
function createVortexScript(){
  const name=prompt("Nome do script (sem extensão):","main")||"main", id="script_"+Date.now();
  const code=DEFAULT_VORTEX_CODE.replace("function_marker_placeholder","");
  vortexScripts.push({id,name,code});activeScriptId=id;saveEngineLocal();openVortexScriptEditor(id);
}
function openVortexScriptEditor(id){activeScriptId=id;const s=vortexScripts.find(x=>x.id===id);if(!s)return;openWindow("win-vscode");document.getElementById("vortex-filename").value=s.name;document.getElementById("vortex-code-editor").value=s.code;renderScriptsSidebarList();}
function renderScriptsSidebarList(){const l=document.getElementById("vscode-scripts-list");if(!l)return;l.innerHTML="";if(!vortexScripts.length){l.innerHTML="<li>Nenhum script</li>";return;}vortexScripts.forEach(s=>{const li=document.createElement("li");li.innerText=(s.id===activeScriptId?"➤ ":"")+"▣ "+s.name+".vortex";li.onclick=()=>openVortexScriptEditor(s.id);l.appendChild(li);});}
function saveVortexScript(){const name=document.getElementById("vortex-filename").value.trim()||"main",code=document.getElementById("vortex-code-editor").value;let s=vortexScripts.find(x=>x.id===activeScriptId);if(!s){s={id:"script_"+Date.now(),name,code};vortexScripts.push(s);activeScriptId=s.id;}else{s.name=name;s.code=code;}saveEngineLocal();renderScriptsSidebarList();renderHierarchy();}
function runScriptFromStudio(){saveVortexScript();openWindow("win-engine");setTimeout(()=>{if(document.getElementById("engine-test-screen").style.display==="none")toggleEngineTestMode();},50);}

function transpileVortexToJS(code){
  const lines=String(code||"").split("\n"),out=[],stack=[0];
  for(const raw of lines){
    const clean=raw.split("#")[0],trim=clean.trim();if(!trim)continue;
    const indent=raw.match(/^\s*/)[0].replace(/\t/g,"    ").length;
    while(indent<stack.at(-1)){out.push("}");stack.pop();}
    let x=trim.replace(/\bTrue\b/g,"true").replace(/\bFalse\b/g,"false").replace(/\bNone\b/g,"null").replace(/\band\b/g,"&&").replace(/\bor\b/g,"||").replace(/\bnot\s+/g,"!").replace(/\.append\(/g,".push(");
    if(/^def\s+\w+\s*\(.*\)\s*:$/.test(x)){out.push(x.replace(/^def\s+(\w+)\s*\((.*)\)\s*:$/,"function $1($2) {"));stack.push(indent+4);}
    else if(/^for\s+\w+\s+in\s+range\(.+\)\s*:$/.test(x)){const m=x.match(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:$/),p=m[2].split(",").map(a=>a.trim());out.push(p.length===1?`for(let ${m[1]}=0;${m[1]}<${p[0]};${m[1]}++){`:`for(let ${m[1]}=${p[0]};${m[1]}<${p[1]};${m[1]}+=${p[2]||1}){`);stack.push(indent+4);}
    else if(/^for\s+\w+\s+in\s+.+:$/.test(x)){out.push(x.replace(/^for\s+(\w+)\s+in\s+(.+):$/,"for(let $1 of $2){"));stack.push(indent+4);}
    else if(/^if\s+.+:$/.test(x)){out.push(x.replace(/^if\s+(.+):$/,"if($1){"));stack.push(indent+4);}
    else if(/^elif\s+.+:$/.test(x)){out.push(x.replace(/^elif\s+(.+):$/,"}else if($1){"));stack.push(indent+4);}
    else if(/^else\s*:$/.test(x)){out.push("}else{");stack.push(indent+4);}
    else if(/^while\s+.+:$/.test(x)){out.push(x.replace(/^while\s+(.+):$/,"while($1){"));stack.push(indent+4);}
    else {x=x.replace(/\bprint\s*\(/g,"vortex.print(");out.push(/[;{}]$/.test(x)?x:x+";");}
  }
  while(stack.length>1){out.push("}");stack.pop();}return out.join("\n");
}
function extractVortexTopLevelFunctions(code){return String(code||"").split("\n").map(r=>{const m=r.match(/^\s{0}def\s+(\w+)\s*\(/);return m?.[1]}).filter(Boolean);}
function compileVortexScript(code){
  const js=transpileVortexToJS(code), names=extractVortexTopLevelFunctions(code);
  const exports=names.map(n=>`${JSON.stringify(n)}:typeof ${n}==="function"?${n}:null`).join(",");
  const factory=new Function("vortex","str","int","float","len",`"use strict";${js};return{_ready:typeof _ready==="function"?_ready:null,_update:typeof _update==="function"?_update:null,functions:{${exports}}};`);
  return api=>factory(api,String, v=>parseInt(v,10),v=>parseFloat(v),v=>v==null?0:(v.length??Object.keys(v).length));
}

/* ================= ENGINE RUNTIME ================= */
function checkCollision(a,b){return !!a&&!!b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function makeVortexEntity(inst,type,x,y,w,h,color,shape){
  const defaults={block:{w:64,h:64,color:"#8b5cf6",shape:"square"},coin:{w:32,h:32,color:"#facc15",shape:"circle"},player:{w:48,h:56,color:"#38bdf8",shape:"square"}};
  const d=defaults[type]||defaults.block;const o={x:Number(x)||0,y:Number(y)||0,w:Number(w)||d.w,h:Number(h)||d.h,vx:0,vy:0,type,color:color||d.color,shape:shape||d.shape,collected:false,el:null};
  const el=document.createElement("div");el.className="runtime-object";applyStyles(el,shapeStyle(o));if(type==="player")el.style.zIndex=10;o.el=el;inst.worldEl.appendChild(el);
  if(type==="block")inst.physicsData.blocks.push(o);else if(type==="coin")inst.physicsData.coins.push(o);else if(type==="player")inst.physicsData.player=o;return o;
}
function buildVortexAPI(inst){
  const api={
    print:(...a)=>inst.log(a.map(String).join(" ")),
    delta:()=>1/60,
    get_player:()=>inst.physicsData.player,
    get_blocks:()=>inst.physicsData.blocks,
    get_coins:()=>inst.physicsData.coins,
    is_key_down:k=>!!globalKeys[String(k).toLowerCase()],
    check_collision:checkCollision,
    move_player:(dx,dy)=>{const p=inst.physicsData.player;if(p){p.x+=Number(dx)||0;p.y+=Number(dy)||0;}},
    apply_gravity:(e,g=.6)=>{if(e)e.vy+=(Number(g)||0.6)*60*api.delta();},
    is_on_floor:e=>{if(!e)return false;return inst.physicsData.blocks.some(b=>Math.abs((e.y+e.h)-b.y)<=2&&e.x+e.w>b.x&&e.x<b.x+b.w);},
    move_and_collide:e=>{if(!e)return;e.x+=e.vx||0;for(const b of inst.physicsData.blocks){if(checkCollision(e,b)){if(e.vx>0)e.x=b.x-e.w;else if(e.vx<0)e.x=b.x+b.w;e.vx=0;}}e.y+=e.vy||0;for(const b of inst.physicsData.blocks){if(checkCollision(e,b)){if(e.vy>0){e.y=b.y-e.h;e.vy=0;}else if(e.vy<0){e.y=b.y+b.h;e.vy=0;}}}},
    follow_camera:(e,ox=300,oy=200)=>{if(e)api.set_camera(e.x-ox,e.y-oy);},
    spawn:(type,gx,gy)=>makeVortexEntity(inst,type,Number(gx)*TILE_W,Number(gy)*TILE_H),
    spawn_at:(type,x,y)=>makeVortexEntity(inst,type,x,y),
    destroy:e=>{if(!e)return;e.el?.remove();inst.physicsData.blocks=inst.physicsData.blocks.filter(x=>x!==e);inst.physicsData.coins=inst.physicsData.coins.filter(x=>x!==e);if(inst.physicsData.player===e)inst.physicsData.player=null;},
    collect_coin:c=>{if(c&&!c.collected){c.collected=true;c.el.style.display="none";}},
    add_coins:n=>inst.coinCount+=Number(n)||0,set_coins:n=>inst.coinCount=Number(n)||0,get_coins_count:()=>inst.coinCount,
    set_camera:(x,y)=>{inst.camera.x=Number(x)||0;inst.camera.y=Number(y)||0;},
    create_text:(id,text,x,y,color)=>{const e=document.createElement("div");e.className="runtime-ui-text";e.style.left=(Number(x)||0)+"px";e.style.top=(Number(y)||0)+"px";e.style.color=color||"#fff";e.innerText=text;inst.uiLayerEl.appendChild(e);inst.uiElements[id]={el:e};return e;},
    create_button:(id,text,x,y,fn)=>{const b=document.createElement("button");b.className="btn btn-primary";b.innerText=text;b.style.position="absolute";b.style.left=(Number(x)||0)+"px";b.style.top=(Number(y)||0)+"px";b.style.pointerEvents="auto";b.onclick=()=>{if(typeof fn==="function")fn();};inst.uiLayerEl.appendChild(b);inst.uiElements[id]={el:b};return b;},
    set_text:(id,text)=>{if(inst.uiElements[id])inst.uiElements[id].el.innerText=text;},
    remove_ui:id=>{inst.uiElements[id]?.el.remove();delete inst.uiElements[id];},
    set_color:(e,c)=>{if(e){e.color=c;if(e.el)e.el.style.background=c;}},
    set_size:(e,w,h)=>{if(e){e.w=Number(w)||e.w;e.h=Number(h)||e.h;}},
    get_delta:()=>1/60
  };return api;
}
function syncVortexRender(pd){if(pd.player){applyStyles(pd.player.el,{left:pd.player.x+"px",top:pd.player.y+"px"});}pd.blocks.forEach(b=>applyStyles(b.el,{left:b.x+"px",top:b.y+"px",width:b.w+"px",height:b.h+"px"}));pd.coins.forEach(c=>{if(!c.collected)applyStyles(c.el,{left:c.x+"px",top:c.y+"px"});});}
function createVortexGameInstance(container,mapData,scriptCode,opts={}){
  container.innerHTML="";
  container.style.position="relative";
  container.style.overflow="hidden";
  container.style.background="#090512";
  container.style.minHeight="220px";
  container.style.width="100%";
  container.style.height="100%";

  const world=document.createElement("div");
  world.className="runtime-world";
  Object.assign(world.style,{position:"absolute",left:"0",top:"0",width:"3000px",height:"2000px",transformOrigin:"0 0",pointerEvents:"none"});
  container.appendChild(world);

  const ui=document.createElement("div");
  ui.className="runtime-ui";
  Object.assign(ui.style,{position:"absolute",inset:"0",zIndex:"100",pointerEvents:"none"});
  container.appendChild(ui);

  const inst={containerEl:container,worldEl:world,uiLayerEl:ui,physicsData:{player:null,blocks:[],coins:[]},uiElements:{},camera:{x:0,y:0},coinCount:0,running:false,loopHandle:null,consoleEl:opts.consoleEl};
  inst.log=(m,err)=>{
    if(inst.consoleEl){
      inst.consoleEl.style.display="block";
      const l=document.createElement("div");
      l.className=err?"log-error":"";
      l.innerText=(err?"✖ ":"› ")+m;
      inst.consoleEl.appendChild(l);
      inst.consoleEl.scrollTop=inst.consoleEl.scrollHeight;
    }else console[err?"error":"log"]("[Vortex]",m);
  };

  const data=Array.isArray(mapData)?mapData:[];
  if(data.length && typeof data[0]==="object" && !Array.isArray(data[0])){
    data.forEach(o=>{
      // Editor -> runtime mapping. The editor uses square/circle/triangle/player/coin.
      // Runtime uses block/coin/player for gameplay while preserving the shape/color.
      const runtimeType =
        o.type==="player" ? "player" :
        o.type==="coin" || o.shape==="circle" ? "coin" :
        "block";
      makeVortexEntity(inst,runtimeType,o.x,o.y,o.w,o.h,o.color,o.shape);
    });
  }else{
    data.forEach((type,i)=>{
      if(type) makeVortexEntity(inst,type,(i%20)*TILE_W,Math.floor(i/20)*TILE_H);
    });
  }

  // Keep a visible fallback floor if an old scene has only a player.
  if(inst.physicsData.blocks.length===0){
    makeVortexEntity(inst,"block",0,360,900,40,"#6d28d9","square");
  }

  try{
    inst.handlers=compileVortexScript(scriptCode||"")(buildVortexAPI(inst));
    inst.handlers?._ready?.();
  }catch(e){
    inst.handlers=null;
    inst.log("Erro no script: "+e.message,true);
  }

  const tick=()=>{
    if(!inst.running)return;
    try{
      inst.handlers?._update?.();
    }catch(e){
      inst.log("Erro em _update(): "+e.message,true);
      if(inst.handlers)inst.handlers._update=null;
    }
    syncVortexRender(inst.physicsData);
    world.style.transform=`translate(${-inst.camera.x}px,${-inst.camera.y}px)`;
  };

  inst.start=()=>{
    if(!inst.running){
      inst.running=true;
      tick();
      inst.loopHandle=setInterval(tick,1000/60);
    }
  };
  inst.stop=()=>{
    inst.running=false;
    if(inst.loopHandle)clearInterval(inst.loopHandle);
    inst.loopHandle=null;
  };
  return inst;
}
function toggleEngineTestMode(){
  const screen=document.getElementById("engine-test-screen"),
        editor=document.getElementById("canvas-2d"),
        btn=document.getElementById("btn-engine-test"),
        consoleEl=document.getElementById("engine-console");

  if(screen.style.display==="none" || !screen.style.display){
    if(!currentSceneObjects.some(o=>o.type==="player"))
      return alert("Adicione um Player à cena.");

    saveVortexScript();
    const s=vortexScripts.find(x=>x.id===activeScriptId);

    if(consoleEl){
      consoleEl.innerHTML="";
      consoleEl.style.display="none";
    }

    editor.style.display="none";
    screen.style.display="block";
    screen.style.position="relative";
    screen.style.overflow="hidden";
    screen.style.background="#090512";
    screen.style.border="1px solid rgba(168,85,247,.35)";
    screen.style.minHeight="300px";
    screen.style.height="calc(100% - 42px)";

    btn.innerText="■ PARAR";
    btn.classList.add("stop");

    currentGameInstance=createVortexGameInstance(
      screen,
      currentSceneObjects,
      s?.code||"",
      {consoleEl}
    );
    currentGameInstance.start();
  }else{
    stopEngineTestLoop();
  }
}
function stopEngineTestLoop(){
  currentGameInstance?.stop();
  currentGameInstance=null;
  const s=document.getElementById("engine-test-screen"),
        c=document.getElementById("canvas-2d"),
        b=document.getElementById("btn-engine-test");
  if(s)s.style.display="none";
  if(c)c.style.display="block";
  if(b){b.innerText="▶ TESTAR";b.classList.remove("stop");}
}
function openPublishModalFromEngine(){document.getElementById("publish-modal").style.display="flex";}
function closePublishModal(){document.getElementById("publish-modal").style.display="none";}
function compileAndPublishEngineGame(){
  if(!currentUser)return alert("Faça login primeiro.");const title=document.getElementById("app-title-input").value.trim();const price=Math.max(0,Number(document.getElementById("app-price-input").value)||0);if(!title)return alert("Dê um nome ao jogo.");if(!currentSceneObjects.some(o=>o.type==="player"))return alert("Adicione um Player.");
  saveVortexScript();const s=vortexScripts.find(x=>x.id===activeScriptId);try{compileVortexScript(s?.code||"");}catch(e){return alert("Script inválido: "+e.message);}
  const appId="app_"+Date.now(),app={title,price,author:currentUser.displayName||currentUser.key,authorKey:currentUser.key,sceneObjects:currentSceneObjects,scriptCode:s?.code||"",createdAt:Date.now()};
  database.ref("publishedApps/"+appId).set(app).then(()=>database.ref("users/"+currentUser.key+"/files/"+appId).set(true)).then(()=>{alert("Publicado com sucesso!");closePublishModal();loadGlobalStore();loadUserFiles();}).catch(e=>alert("Erro: "+e.message));
}
function loadGlobalStore(){const l=document.getElementById("global-apps-list");if(!l)return;database.ref("publishedApps").once("value").then(s=>{l.innerHTML="";if(!s.exists()){l.innerHTML="<p>Nenhum jogo publicado ainda.</p>";return;}s.forEach(c=>{const a=c.val(),card=document.createElement("div");card.className="app-card";card.innerHTML=`<h4>${escapeHtml(a.title)}</h4><p>Por ${escapeHtml(a.author)}</p><p>R$ ${Number(a.price||0).toFixed(2)}</p><button class="btn btn-primary">Comprar / Adicionar</button>`;card.querySelector("button").onclick=()=>buyApp(c.key,a);l.appendChild(card);});});}
function buyApp(id,a){if(!currentUser)return alert("Faça login.");const price=Number(a.price||0);if(Number(currentUser.balance||0)<price)return alert("Saldo insuficiente.");addBalance(-price).then(()=>database.ref("users/"+currentUser.key+"/files/"+id).set(true)).then(()=>{alert("Adicionado aos seus arquivos.");loadUserFiles();}).catch(e=>alert("Erro: "+e.message));}
function loadUserFiles(){const l=document.getElementById("files-list");if(!l||!currentUser)return;database.ref("users/"+currentUser.key+"/files").once("value").then(async s=>{l.innerHTML="";if(!s.exists()){l.innerHTML="<p>Nenhum .vexe instalado.</p>";return;}for(const id of Object.keys(s.val())){const a=(await database.ref("publishedApps/"+id).once("value")).val();if(!a)continue;const card=document.createElement("div");card.className="app-card";card.innerHTML=`<h4>${escapeHtml(a.title)}.vexe</h4><p>Por ${escapeHtml(a.author)}</p>`;const b=document.createElement("button");b.className="btn btn-primary";b.innerText="Executar";b.onclick=()=>runVexeApp(a);card.appendChild(b);l.appendChild(card);}});}
function runVexeApp(app){openWindow("win-runner");document.getElementById("runner-title").innerText="Executando: "+app.title+".vexe";stopRunnerInstance();currentRunnerInstance=createVortexGameInstance(document.getElementById("runner-canvas"),app.sceneObjects||app.mapData||[],app.scriptCode||"");currentRunnerInstance.start();}
function stopRunnerInstance(){currentRunnerInstance?.stop();currentRunnerInstance=null;}

/* ================= VORTEX MESSENGER ================= */
function clearMessengerListeners(){
  messengerListeners.forEach(u=>{try{u();}catch{}});
  messengerListeners=[];
  if(messengerMessageUnsub){
    try{messengerMessageUnsub();}catch{}
    messengerMessageUnsub=null;
  }
}
function messengerRef(path){return database.ref(path);}
function safeUserName(data,key){
  return String(data?.displayName||data?.username||data?.nick||key||"Usuário");
}
function loadFriends(){
  const l=document.getElementById("friends-list");
  if(!l||!currentUser)return;
  const ref=database.ref("users/"+currentUser.key+"/friends");
  const handler=s=>{
    l.innerHTML="";
    if(!s.exists()){
      l.innerHTML="<div class='muted'>Nenhum amigo. Adicione pelo nick.</div>";
      return;
    }
    Object.keys(s.val()).forEach(k=>{
      const f=s.val()[k]||{}, name=safeUserName(f,k);
      const b=document.createElement("button");
      b.className="friend-row";
      b.innerHTML=`<span class='avatar'>${escapeHtml(name[0].toUpperCase())}</span><span>@${escapeHtml(name)}</span>`;
      b.onclick=()=>openDM(k,name);
      l.appendChild(b);
    });
  };
  ref.on("value",handler);
  messengerListeners.push(()=>ref.off("value",handler));
}
function addFriend(){
  if(!currentUser)return;
  const nick=document.getElementById("friend-nick").value.trim();
  if(!nick)return;
  const k=keyForNick(nick);
  if(k===currentUser.key)return alert("Você não pode adicionar a si mesmo.");

  database.ref("users/"+k).once("value").then(s=>{
    if(!s.exists())throw new Error("Nick não encontrado.");
    const d=s.val()||{}, targetName=safeUserName(d,k), myName=safeUserName(currentUser,currentUser.key);
    return Promise.all([
      database.ref("users/"+currentUser.key+"/friends/"+k).set({displayName:targetName,nick:k}),
      database.ref("users/"+k+"/friends/"+currentUser.key).set({displayName:myName,nick:currentUser.key})
    ]);
  }).then(()=>{
    document.getElementById("friend-nick").value="";
    alert("Amizade adicionada.");
  }).catch(e=>alert("Não foi possível adicionar: "+e.message));
}
function dmId(a,b){return [a,b].sort().join("__");}
function openDM(key,name){
  currentChatType="dm";
  currentChatId=dmId(currentUser.key,key);
  currentGroupId=null;
  document.getElementById("chat-title").innerText="@"+safeUserName({displayName:name},key);
  document.getElementById("chat-subtitle").innerText="Conversa privada";
  listenMessages(currentChatId,"dm");
}
function openGroup(id,name){
  currentChatType="group";
  currentChatId=id;
  currentGroupId=id;
  document.getElementById("chat-title").innerText=name;
  document.getElementById("chat-subtitle").innerText="Grupo Vortex";
  listenMessages(id,"group");
}
function prepareMessengerLayout(){
  const messages=document.getElementById("messages");
  const chat=document.querySelector("#win-messenger .chat");
  const composer=document.querySelector("#win-messenger .composer");
  const emoji=document.querySelector("#win-messenger .emoji-bar");
  if(chat)Object.assign(chat.style,{display:"flex",flexDirection:"column",minHeight:"0",overflow:"hidden"});
  if(messages)Object.assign(messages.style,{flex:"1 1 auto",minHeight:"0",overflowY:"auto",overflowX:"hidden",display:"flex",flexDirection:"column",gap:"8px",padding:"12px",scrollBehavior:"smooth"});
  if(emoji)Object.assign(emoji.style,{flex:"0 0 auto"});
  if(composer)Object.assign(composer.style,{flex:"0 0 auto"});
}
function listenMessages(id,type){
  prepareMessengerLayout();
  if(messengerMessageUnsub){
    try{messengerMessageUnsub();}catch{}
    messengerMessageUnsub=null;
  }

  const box=document.getElementById("messages");
  if(!box)return;
  box.innerHTML="<div class='muted'>Carregando mensagens...</div>";

  const path=type==="dm"?"conversations/"+id+"/messages":"groups/"+id+"/messages";
  const ref=database.ref(path).limitToLast(100);

  const handler=s=>{
    const nearBottom=(box.scrollHeight-box.scrollTop-box.clientHeight)<120;
    box.innerHTML="";

    if(!s.exists()){
      box.innerHTML="<div class='muted'>Nenhuma mensagem ainda.</div>";
      return;
    }

    s.forEach(c=>renderMessage(box,c.val()||{}));

    if(nearBottom){
      requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});
    }
  };

  ref.on("value",handler);
  messengerMessageUnsub=()=>ref.off("value",handler);
}
function renderMessage(box,m){
  const wrap=document.createElement("div");
  wrap.className="message "+(m.senderKey===currentUser.key?"mine":"theirs");
  let content=escapeHtml(m.text||"").replace(/\n/g,"<br>");
  if(m.image){
    content+=`<img class="chat-image" src="${escapeHtml(m.image)}" alt="imagem enviada">`;
  }
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
  if(!currentUser||!currentChatId)return;const input=document.getElementById("image-input");input.click();input.onchange=()=>{const file=input.files[0];if(!file)return;if(file.size>700*1024)return alert("Imagem muito grande. Use até 700 KB.");const r=new FileReader();r.onload=()=>{const path=currentChatType==="dm"?"conversations/"+currentChatId+"/messages":"groups/"+currentChatId+"/messages";database.ref(path).push({senderKey:currentUser.key,senderName:safeUserName(currentUser,currentUser.key),image:r.result,createdAt:Date.now()});};r.readAsDataURL(file);input.value="";};
}
function loadMessengerHome(){prepareMessengerLayout();loadFriends();loadGroups();renderGroupMembers();if(!currentChatId){document.getElementById("chat-title").innerText="Vortex Messenger";document.getElementById("chat-subtitle").innerText="Escolha um amigo para conversar";}}
function renderGroupMembers(){const l=document.getElementById("group-members");if(!l||!currentUser)return;database.ref("users/"+currentUser.key+"/friends").once("value").then(s=>{l.innerHTML="";if(s.exists())Object.entries(s.val()).forEach(([k,f])=>{l.innerHTML+=`<label><input class="group-member-check" type="checkbox" value="${k}"> @${escapeHtml(f.displayName||k)}</label>`;});});}

/* ================= STARTUP ================= */
window.addEventListener("DOMContentLoaded",()=>{
  const saved=localStorage.getItem("vortex_theme");if(saved)setTheme(saved);
  tryAutoLogin();
  document.getElementById("message-input")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
  document.getElementById("group-name")?.addEventListener("input",renderGroupMembers);
});
