// ==========================================
// 🌀 VORTEX OS - SCRIPT PRINCIPAL v9.6
// Login/Cadastro + OS completo + Engine 100% programável via linguagem Vortex
// ==========================================
//
// MUDANÇAS NESTA VERSÃO (v9.6):
// - Player, bloco e moeda NÃO têm mais comportamento embutido (sem física, sem
//   colisão, sem "andar sozinho", sem moeda sumindo automática). Tudo isso agora
//   é responsabilidade do script .vortex que o desenvolvedor escreve.
// - Nova API `vortex.*` disponível dentro de _ready()/_update() dos scripts,
//   com funções de input, física manual, colisão, câmera e criação de
//   elementos de UI (texto e botão).
// - O runtime da Engine (câmera, criação de entidades, sincronização visual)
//   foi extraído para `createVortexGameInstance(...)`, reaproveitado tanto
//   pelo modo "Testar" quanto pelo executor de jogos publicados (.vexe),
//   corrigindo o problema do .vexe publicado só mostrar o mapa parado.
// - A linguagem Vortex ganhou suporte a `for x in range(...)`, `for x in lista`,
//   `.append()` -> `.push()` e as funções nativas `str()`, `int()`, `float()`,
//   `len()`.
//
// ==========================================
const OS_VERSION = "11.03";

// ---- FIREBASE CONFIG ----
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// ESTADO GLOBAL
// ==========================================
let currentUser = null;
let highestZIndex = 100;
let openApps = new Set();
let clockInterval = null;

let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill(''); // grid 20x12
let currentSceneMeta = {}; // índice -> {text, action, width, height, color, shape}
let currentSceneTransforms = {}; // índice -> {x, y, w, h, rotation}
let selectedSceneIndex = -1;

// Scripts .vortex criados no projeto atual
let vortexScripts = [];          // [{id, name, code}]
let activeScriptId = null;       // script atualmente ligado ao teste da engine


// ==========================================
// VORTEX UI NOTIFICATIONS (sem popups nativos)
// ==========================================
function vortexNotify(message, kind = 'info', duration = 3600) {
    const host = document.getElementById('vortex-notifications') || (() => {
        const el = document.createElement('div');
        el.id = 'vortex-notifications';
        document.body.appendChild(el);
        return el;
    })();
    const item = document.createElement('div');
    item.className = 'vortex-toast ' + kind;
    const title = kind === 'error' ? 'Vortex' : kind === 'success' ? 'Concluído' : 'Vortex OS';
    item.innerHTML = `<div class="vortex-toast-title">${escapeHTML(title)}</div><div class="vortex-toast-text">${escapeHTML(message)}</div>`;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 220); }, duration);
}
function vortexConfirm(message) {
    vortexNotify(message,'info');
    return true;
}

// ==========================================
// 1. AUTENTICAÇÃO (LOGIN / CADASTRO AUTOMÁTICO)
// ==========================================
function loginUser() {
    const usernameInput = document.getElementById('auth-username');
    const pinInput = document.getElementById('auth-pin');
    const emailInput = document.getElementById('auth-email');

    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    const email = emailInput.value.trim();

    if (!username) { vortexNotify('⚠️ Digite um nome de usuário.'); return; }
    if (!/^\d{4}$/.test(pin)) { vortexNotify('⚠️ O PIN deve ter exatamente 4 dígitos numéricos.'); return; }

    const userKey = username.toLowerCase().replace(/[.#$/\[\]]/g, '_');
    const userRef = database.ref('users/' + userKey);

    const loginBtn = document.querySelector('#login-screen .btn-primary');
    if (loginBtn) { loginBtn.disabled = true; loginBtn.innerText = 'Verificando...'; }

    userRef.once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data.pin === pin) {
                    startSession(userKey, data);
                } else {
                    vortexNotify('❌ PIN incorreto para o usuário "' + username + '".');
                }
            } else {
                const newUser = {
                    displayName: username,
                    pin: pin,
                    email: email || '',
                    balance: 0,
                    createdAt: Date.now(),
                    lastDaily: 0
                };
                return userRef.set(newUser).then(() => {
                    startSession(userKey, newUser);
                    vortexNotify('✅ Conta criada com sucesso! Bem-vindo(a), ' + username + '.');
                });
            }
        })
        .catch(err => {
            console.error(err);
            vortexNotify('❌ Erro de conexão com o Firebase: ' + err.message);
        })
        .finally(() => {
            if (loginBtn) { loginBtn.disabled = false; loginBtn.innerText = 'Entrar no Vortex OS'; }
        });
}

function startSession(userKey, data) {
    currentUser = Object.assign({ key: userKey }, data);
    localStorage.setItem('vortex_current_user', userKey);

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('shutdown-screen').style.display = 'none';

    const displayName = data.displayName || userKey;
    document.getElementById('start-username').innerText = displayName;
    document.getElementById('start-email').innerText = data.email || 'online';
    document.getElementById('settings-user').innerText = displayName;
    document.getElementById('settings-email').innerText = data.email || '-';
    updateBalanceUI();
    watchCurrentUserBalance(userKey);
    loadVortexScriptsLocal();

    startClock();
    loadUserFiles();
    watchGlobalSystem();
    if(isVortexAdmin()){ const a=document.getElementById('desktop-admin-icon'); if(a) a.style.display='flex'; const sb=document.getElementById('start-admin-btn'); if(sb) sb.style.display='block'; }
}

function tryAutoLogin() {
    const savedKey = localStorage.getItem('vortex_current_user');
    if (!savedKey) return;

    database.ref('users/' + savedKey).once('value').then(snapshot => {
        if (snapshot.exists()) {
            startSession(savedKey, snapshot.val());
        } else {
            localStorage.removeItem('vortex_current_user');
        }
    }).catch(err => console.error('Erro no auto-login:', err));
}

function logoutUser() {
    localStorage.removeItem('vortex_current_user');
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('auth-pin').value = '';
    if (clockInterval) clearInterval(clockInterval);
}

// ==========================================
// 2. LIGAR / DESLIGAR PC
// ==========================================
function shutdownPC() {
    closeStartMenuIfOpen();
    document.getElementById('shutdown-screen').style.display = 'flex';
    if (clockInterval) clearInterval(clockInterval);
    stopEngineTestLoop();
    stopRunnerInstance();
}

function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
    if (currentUser) {
        document.getElementById('login-screen').style.display = 'none';
        startClock();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
    }
}

// ==========================================
// 3. RELÓGIO DO SISTEMA
// ==========================================
function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    const update = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('os-clock');
        if (clockEl) clockEl.innerText = `${h}:${m}`;
    };
    update();
    clockInterval = setInterval(update, 1000 * 30);
}

// ==========================================
// 4. SISTEMA DE JANELAS
// ==========================================
function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    win.style.display = 'flex';
    win.dataset.minimized='0';
    ensureWindowControls();
    fitWindowToViewport(win);
    bringToFront(win);
    openApps.add(id);
    addTaskbarButton(id);

    if (id === 'win-engine') initMapCanvasOnce();
    if (id === 'win-vscode') renderScriptsSidebarList();
}

function ensureWindowControls(){
    document.querySelectorAll('.window').forEach(win=>{
        const header=win.querySelector('.window-header');
        if(!header)return;
        const controls=header.querySelector('.window-controls');
        if(!controls)return;
        if(controls.dataset.vortexReady==='1')return;
        controls.dataset.vortexReady='1';
        const close=controls.querySelector('button');
        const min=document.createElement('button'); min.className='vortex-win-min'; min.title='Minimizar'; min.innerText='—';
        const max=document.createElement('button'); max.className='vortex-win-max'; max.title='Tela cheia'; max.innerText='□';
        min.onclick=(e)=>{e.stopPropagation();minimizeWindow(win.id);};
        max.onclick=(e)=>{e.stopPropagation();toggleWindowFullscreen(win.id);};
        controls.insertBefore(min,close||null); controls.insertBefore(max,close||null);
    });
}
function minimizeWindow(id){
    const win=document.getElementById(id); if(!win)return;
    win.dataset.minimized='1'; win.style.display='none';
    const task=document.getElementById('task-'+id); if(task)task.classList.add('minimized');
}
function restoreWindow(id){
    const win=document.getElementById(id); if(!win)return;
    win.dataset.minimized='0'; win.style.display='flex'; bringToFront(win);
    const task=document.getElementById('task-'+id); if(task)task.classList.remove('minimized');
    requestAnimationFrame(()=>fitWindowToViewport(win));
}
function toggleWindowFullscreen(id){
    const win=document.getElementById(id); if(!win)return;
    if(win.dataset.fullscreen==='1'){
        const r=win.dataset.prevRect?JSON.parse(win.dataset.prevRect):null;
        if(r){win.style.left=r.left;win.style.top=r.top;win.style.width=r.width;win.style.height=r.height;}
        win.dataset.fullscreen='0';
    }else{
        win.dataset.prevRect=JSON.stringify({left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height});
        win.dataset.fullscreen='1';win.style.left='8px';win.style.top='8px';win.style.width='calc(100vw - 16px)';win.style.height='calc(100vh - 62px)';
    }
    fitWindowToViewport(win); bringToFront(win);
}
function fitWindowToViewport(win){
    if(!win || win.dataset.fullscreen==='1')return;
    const maxW=Math.max(320,window.innerWidth-16),maxH=Math.max(220,window.innerHeight-62);
    const r=win.getBoundingClientRect();
    if(r.width>maxW)win.style.width=maxW+'px';
    if(r.height>maxH)win.style.height=maxH+'px';
    if(win.offsetLeft+win.offsetWidth>window.innerWidth-4)win.style.left=Math.max(4,window.innerWidth-win.offsetWidth-4)+'px';
    if(win.offsetTop+win.offsetHeight>window.innerHeight-50)win.style.top=Math.max(4,window.innerHeight-win.offsetHeight-50)+'px';
}
window.addEventListener('resize',()=>document.querySelectorAll('.window').forEach(fitWindowToViewport));
window.addEventListener('DOMContentLoaded',ensureWindowControls);

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) { win.style.display = 'none'; win.dataset.minimized='0'; }
    openApps.delete(id);
    removeTaskbarButton(id);
    if (id === 'win-engine') stopEngineTestLoop();
    if (id === 'win-runner') stopRunnerInstance();
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);

    let pos3 = e.clientX, pos4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (ev) => {
        ev.preventDefault();
        const pos1 = pos3 - ev.clientX;
        const pos2 = pos4 - ev.clientY;
        pos3 = ev.clientX; pos4 = ev.clientY;
        win.style.top = (win.offsetTop - pos2) + "px";
        win.style.left = (win.offsetLeft - pos1) + "px";
    };
}

function addTaskbarButton(id) {
    const bar = document.getElementById('taskbar-apps');
    if (!bar || document.getElementById('task-' + id)) return;
    const win = document.getElementById(id);
    const title = win.querySelector('.window-header span')?.innerText || id;

    const btn = document.createElement('button');
    btn.id = 'task-' + id;
    btn.className = 'btn-sm taskbar-app-btn';
    btn.innerText = title;
    btn.onclick = () => restoreWindow(id);
    bar.appendChild(btn);
}

function removeTaskbarButton(id) {
    const btn = document.getElementById('task-' + id);
    if (btn) btn.remove();
}

// ==========================================
// 5. MENU INICIAR
// ==========================================
function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    if (!menu) return;
    menu.classList.toggle('open');
    menu.style.display = menu.classList.contains('open') ? 'block' : 'none';
}

function closeStartMenuIfOpen() {
    const menu = document.getElementById('start-menu');
    if (menu) { menu.classList.remove('open'); menu.style.display = 'none'; }
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('start-menu');
    const startBtn = document.querySelector('.start-btn');
    if (!menu || !startBtn) return;
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== startBtn) {
        closeStartMenuIfOpen();
    }
});

// ==========================================
// 6. TEMAS / WALLPAPER
// ==========================================
function setTheme(name) {
    const themes = {
        'purple': 'linear-gradient(135deg, #2e0854, #12002b, #4a154b)',
        'dark-purple': 'linear-gradient(135deg, #0f172a, #1e1b4b, #311042)',
        'cyber-blue': 'linear-gradient(135deg, #0284c7, #0f172a, #1e1b4b)',
        'sunset': 'linear-gradient(135deg, #831843, #312e81, #0f172a)'
    };
    const bg = themes[name] || themes['purple'];
    document.body.style.background = bg;
    document.body.style.backgroundAttachment = 'fixed';
    localStorage.setItem('vortex_theme', name);
}

(function restoreTheme() {
    const saved = localStorage.getItem('vortex_theme');
    if (saved) window.addEventListener('DOMContentLoaded', () => setTheme(saved));
})();

// ==========================================
// 7. CARTEIRA / ECONOMIA (Firebase)
// ==========================================
function updateBalanceUI() {
    const el = document.getElementById('user-balance');
    if (el && currentUser) el.innerText = Number(currentUser.balance || 0).toFixed(2);
}

function addBalance(amount) {
    if (!currentUser) return Promise.reject('Sem sessão ativa');
    const newBalance = Number(currentUser.balance || 0) + amount;
    return database.ref('users/' + currentUser.key + '/balance').set(newBalance).then(() => {
        currentUser.balance = newBalance;
        updateBalanceUI();
    });
}


function watchCurrentUserBalance(userKey) {
    if (!userKey) return;
    if (window._vortexBalanceRef) window._vortexBalanceRef.off();
    window._vortexBalanceRef = database.ref('users/' + userKey + '/balance');
    window._vortexBalanceRef.on('value', snap => {
        if (!currentUser || currentUser.key !== userKey) return;
        currentUser.balance = Number(snap.val() || 0);
        updateBalanceUI();
        const pixBalance=document.getElementById('pix-current-balance');
        if(pixBalance) pixBalance.innerText=Number(currentUser.balance||0).toFixed(2).replace('.',',');
    });
}

function claimDailyReward() {
    if (!currentUser) return vortexNotify('Faça login primeiro.');
    const now = Date.now();
    const last = currentUser.lastDaily || 0;
    const oneDay = 1000 * 60 * 60 * 24;

    if (now - last < oneDay) {
        const horasRestantes = Math.ceil((oneDay - (now - last)) / (1000 * 60 * 60));
        vortexNotify(`⏳ Você já coletou sua recompensa diária. Volte em ~${horasRestantes}h.`);
        return;
    }

    addBalance(10).then(() => {
        currentUser.lastDaily = now;
        database.ref('users/' + currentUser.key + '/lastDaily').set(now);
        vortexNotify('🎁 Você recebeu R$ 10,00 de recompensa diária!');
    }).catch(err => vortexNotify('Erro: ' + err));
}

function openPixWindow(){
    if(!currentUser) return vortexNotify('Faça login primeiro.','error');
    const modal=document.getElementById('pix-modal');
    if(!modal) return vortexNotify('Janela Pix indisponível.','error');
    const amount=document.getElementById('pix-amount');
    const nick=document.getElementById('pix-recipient');
    const balanceEl=document.getElementById('pix-current-balance');
    if(balanceEl) balanceEl.innerText=Number(currentUser.balance||0).toFixed(2).replace('.',',');
    if(amount) amount.value='';
    if(nick) nick.value='';
    modal.style.display='flex';
    setTimeout(()=>nick?.focus(),50);
}
function closePixWindow(){
    const modal=document.getElementById('pix-modal');
    if(modal) modal.style.display='none';
}
function normalizeUserKey(name){
    return String(name||'').trim().toLowerCase().replace(/[.#$/\[\]]/g,'_');
}
async function sendPix(){
    if(!currentUser) return vortexNotify('Faça login primeiro.','error');
    const nick=(document.getElementById('pix-recipient')?.value||'').trim();
    const amount=Number(document.getElementById('pix-amount')?.value);
    if(!nick) return vortexNotify('Digite o nick de quem vai receber.','error');
    if(!Number.isFinite(amount) || amount<=0) return vortexNotify('Digite um valor válido maior que R$ 0,00.','error');
    const targetKey=normalizeUserKey(nick);
    if(targetKey===currentUser.key) return vortexNotify('Você não pode enviar Pix para você mesmo.','error');

    const sendBtn=document.getElementById('pix-send-btn');
    if(sendBtn){sendBtn.disabled=true;sendBtn.innerText='Enviando...';}
    try{
        const targetSnap=await database.ref('users/'+targetKey).once('value');
        if(!targetSnap.exists()) throw new Error('Usuário não encontrado. Confira o nick.');
        const amountCents=Math.round(amount*100);
        const senderRef=database.ref('users/'+currentUser.key+'/balance');
        const receiverRef=database.ref('users/'+targetKey+'/balance');
        const senderResult=await senderRef.transaction(v=>{
            const cents=Math.round(Number(v||0)*100);
            if(cents<amountCents) return;
            return (cents-amountCents)/100;
        });
        if(!senderResult.committed) throw new Error('Saldo insuficiente.');
        try{
            await receiverRef.transaction(v=>(Math.round(Number(v||0)*100)+amountCents)/100);
        }catch(err){
            // Reverte o débito se o crédito falhar.
            await senderRef.transaction(v=>(Math.round(Number(v||0)*100)+amountCents)/100);
            throw err;
        }
        closePixWindow();
        vortexNotify(`Pix de R$ ${amount.toFixed(2)} enviado para ${nick}.`,'success');
    }catch(err){
        vortexNotify('Pix não enviado: '+(err.message||err),'error');
    }finally{
        if(sendBtn){sendBtn.disabled=false;sendBtn.innerText='Enviar Pix';}
    }
}
function simulateIncomingPix(){ openPixWindow(); }

// ==========================================
// 8. TERMINAL
// ==========================================
function handleTerminal(event) {
    if (event.key !== 'Enter') return;

    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const cmd = input.value.trim();
    input.value = '';

    output.innerHTML += `<br>&gt; ${cmd}<br>`;

    switch (cmd.toLowerCase()) {
        case 'help':
            output.innerHTML += 'Comandos: help, clear, whoami, balance, date, apps, version, shutdown';
            break;
        case 'clear':
            output.innerHTML = '';
            break;
        case 'whoami':
            output.innerHTML += currentUser ? (currentUser.displayName || currentUser.key) : 'Nenhum usuário logado';
            break;
        case 'balance':
            output.innerHTML += 'R$ ' + Number(currentUser?.balance || 0).toFixed(2);
            break;
        case 'date':
            output.innerHTML += new Date().toLocaleString('pt-BR');
            break;
        case 'apps':
            output.innerHTML += Array.from(openApps).join(', ') || 'Nenhum app aberto';
            break;
        case 'version':
            output.innerHTML += 'Vortex OS v' + OS_VERSION;
            break;
        case 'shutdown':
            shutdownPC();
            break;
        default:
            output.innerHTML += `Comando não reconhecido: "${cmd}". Digite 'help'.`;
    }

    output.scrollTop = output.scrollHeight;
}

// ==========================================
// 9. CALCULADORA
// ==========================================
function calcInput(val) {
    document.getElementById('calc-display').value += val;
}

function calcClear() {
    document.getElementById('calc-display').value = '';
}

function calcEval() {
    const display = document.getElementById('calc-display');
    try {
        if (!/^[0-9+\-*/.\s]+$/.test(display.value)) throw new Error('Entrada inválida');
        display.value = String(Function('"use strict";return (' + display.value + ')')());
    } catch (e) {
        display.value = 'Erro';
    }
}

// ==========================================
// 10. VORTEX ENGINE 2D — SCENE EDITOR 11.02
// Editor inspirado em workflows de engines 2D profissionais:
// Hierarchy | Scene/Game | Inspector | Project/Console
// -----------------------------------------------------------------------------
let mapCanvasInitialized=false;
let editorCamera={x:0,y:0,zoom:1};
let editorPan={active:false,startX:0,startY:0,camX:0,camY:0};
let editorDrag={active:false,index:-1,startX:0,startY:0,ox:0,oy:0};
let editorResize={active:false,index:-1,corner:'se',startX:0,startY:0,ox:0,oy:0,ow:0,oh:0};
let editorTool='select';
let editorView='scene';
const EDITOR_WORLD_W=5000, EDITOR_WORLD_H=3000;
const SHAPES=['square','circle','triangle','player','coin'];

function initMapCanvasOnce(){
  if(mapCanvasInitialized)return;
  const canvas=document.getElementById('canvas-2d'); if(!canvas)return;
  canvas.innerHTML=''; canvas.classList.add('vortex-scene-viewport');
  canvas.oncontextmenu=e=>{e.preventDefault();return false;};
  canvas.addEventListener('mousedown',vortexScenePointerDown);
  canvas.addEventListener('mousemove',vortexScenePointerMove);
  canvas.addEventListener('mouseup',vortexScenePointerUp);
  canvas.addEventListener('mouseleave',vortexScenePointerUp);
  canvas.addEventListener('wheel',vortexSceneWheel,{passive:false});
  const world=document.createElement('div'); world.id='vortex-scene-world'; world.className='vortex-scene-world';
  canvas.appendChild(world);
  mapCanvasInitialized=true;
  renderScene(); applyEditorCamera(); vortexEditorTool('select');
}

function screenToWorld(e){
  const canvas=document.getElementById('canvas-2d'),r=canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)/editorCamera.zoom+editorCamera.x,y:(e.clientY-r.top)/editorCamera.zoom+editorCamera.y};
}
function applyEditorCamera(){
  const world=document.getElementById('vortex-scene-world');
  if(world)world.style.transform=`translate(${-editorCamera.x*editorCamera.zoom}px,${-editorCamera.y*editorCamera.zoom}px) scale(${editorCamera.zoom})`;
  const label=document.getElementById('engine-viewport-label');
  if(label)label.textContent=`Scene 2D  •  ${Math.round(editorCamera.zoom*100)}%  •  RMB pan  •  Wheel zoom`;
}
function vortexEditorTool(tool){
  editorTool=tool;
  document.querySelectorAll('.scene-tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
  const canvas=document.getElementById('canvas-2d');
  if(canvas)canvas.dataset.tool=tool;
}
function vortexEditorView(view){
  editorView=view;
  document.querySelectorAll('.scene-tab').forEach(b=>b.classList.remove('active'));
  const tab=document.getElementById('scene-tab-'+view);if(tab)tab.classList.add('active');
  const canvas=document.getElementById('canvas-2d');if(!canvas)return;
  canvas.classList.toggle('game-view',view==='game');
  if(view==='game'){
    if(typeof toggleEngineTestMode==='function') toggleEngineTestMode(true);
  }else{
    const test=document.getElementById('engine-test-screen');if(test)test.style.display='none';
  }
}
function vortexScenePointerDown(e){
  if(e.button===2){
    editorPan={active:true,startX:e.clientX,startY:e.clientY,camX:editorCamera.x,camY:editorCamera.y};
    this.classList.add('panning'); return;
  }
  if(e.button!==0)return;
  const obj=e.target.closest?.('.scene-object');
  const handle=e.target.closest?.('.resize-handle');
  if(handle)return;
  if(obj){
    const i=Number(obj.dataset.index);selectSceneObject(i);
    if(editorTool==='move' || editorTool==='select'){
      const tr=currentSceneTransforms[i]||defaultTransform(i),p=screenToWorld(e);
      editorDrag={active:true,index:i,startX:p.x,startY:p.y,ox:tr.x,oy:tr.y};
      e.preventDefault();
    }
    return;
  }
  if(editorTool==='rect'){
    const p=screenToWorld(e);vortexAddObject('square',p.x,p.y);return;
  }
  selectedSceneIndex=-1;renderScene();
}
function vortexScenePointerMove(e){
  if(editorPan.active){
    editorCamera.x=editorPan.camX-(e.clientX-editorPan.startX)/editorCamera.zoom;
    editorCamera.y=editorPan.camY-(e.clientY-editorPan.startY)/editorCamera.zoom;
    applyEditorCamera(); return;
  }
  const p=screenToWorld(e);const coords=document.getElementById('scene-coordinates');if(coords)coords.textContent=`X ${Math.round(p.x)}  Y ${Math.round(p.y)}`;
  if(editorDrag.active){
    const tr=currentSceneTransforms[editorDrag.index];tr.x=editorDrag.ox+p.x-editorDrag.startX;tr.y=editorDrag.oy+p.y-editorDrag.startY;renderScene();}
  if(editorResize.active){vortexResizeMove(e);}
}
function vortexScenePointerUp(){
  editorPan.active=false;editorDrag.active=false;
  document.getElementById('canvas-2d')?.classList.remove('panning');
  if(editorResize.active){editorResize.active=false;renderScene();}
}
function vortexSceneWheel(e){
  e.preventDefault();
  const before=screenToWorld(e),factor=e.deltaY<0?1.12:0.89;
  editorCamera.zoom=Math.max(.2,Math.min(4,editorCamera.zoom*factor));
  const after=screenToWorld(e);editorCamera.x+=before.x-after.x;editorCamera.y+=before.y-after.y;applyEditorCamera();
}
function sceneFreeIndex(){let i=0;while(currentSceneGrid[i])i++;if(i>=currentSceneGrid.length)currentSceneGrid.length=i+1;return i;}
function defaultTransform(i){return currentSceneTransforms[i]||{x:120+(i%8)*100,y:120+Math.floor(i/8)*100,w:64,h:64,rotation:0};}
function vortexCreateObjectMenu(){
  vortexNotify('Escolha um tipo na barra da Scene.','info');
}
function vortexAddObject(type,x,y){
  const canvas=document.getElementById('canvas-2d');if(!canvas)return;
  if(x===undefined||y===undefined){const r=canvas.getBoundingClientRect();x=editorCamera.x+r.width/(2*editorCamera.zoom);y=editorCamera.y+r.height/(2*editorCamera.zoom);}
  const i=sceneFreeIndex();
  if(type==='player'){
    const old=currentSceneGrid.indexOf('player');
    if(old>=0){currentSceneGrid[old]='';delete currentSceneTransforms[old];delete currentSceneMeta[old];}
  }
  currentSceneGrid[i]=type;
  currentSceneTransforms[i]={x:x-32,y:y-32,w:64,h:64,rotation:0};
  const defaults={square:'#8b5cf6',circle:'#a78bfa',triangle:'#c084fc',player:'#22c55e',coin:'#facc15'};
  currentSceneMeta[i]=Object.assign({},currentSceneMeta[i],{color:defaults[type]||'#8b5cf6',name:type.charAt(0).toUpperCase()+type.slice(1)});
  selectedSceneIndex=i;renderScene();selectSceneObject(i);
}
function renderScene(){
  const world=document.getElementById('vortex-scene-world');if(!world)return;
  world.innerHTML='';
  const grid=document.createElement('div');grid.className='vortex-scene-grid';grid.style.width=EDITOR_WORLD_W+'px';grid.style.height=EDITOR_WORLD_H+'px';world.appendChild(grid);
  currentSceneGrid.forEach((type,i)=>{
    if(!type)return;const tr=defaultTransform(i),meta=currentSceneMeta[i]||{};
    const o=document.createElement('div');o.className='scene-object scene-'+type+(i===selectedSceneIndex?' selected':'');o.dataset.index=i;
    o.title=meta.name||`${type} #${i+1}`;
    Object.assign(o.style,{left:tr.x+'px',top:tr.y+'px',width:tr.w+'px',height:tr.h+'px',transform:`rotate(${tr.rotation||0}deg)`});
    if(meta.color)o.style.background=meta.color;
    const label=document.createElement('span');label.className='scene-object-label';label.textContent=meta.name||type; o.appendChild(label);
    world.appendChild(o);
  });
  renderSceneSelectionHandles();renderHierarchy();
}
function renderHierarchy(){
  const tree=document.getElementById('hierarchy-tree');if(!tree)return;tree.innerHTML='';
  const q=(document.getElementById('hierarchy-search')?.value||'').toLowerCase();
  currentSceneGrid.forEach((type,i)=>{if(!type)return;const meta=currentSceneMeta[i]||{},name=meta.name||`${type} #${i+1}`;if(q&&!name.toLowerCase().includes(q))return;
    const li=document.createElement('li');li.className='tree-item '+(i===selectedSceneIndex?'selected':'');li.innerHTML=`<span class="shape-mini shape-${type}"></span><span>${escapeHTML(name)}</span>`;li.onclick=()=>selectSceneObject(i);tree.appendChild(li);
  });
}
function selectSceneObject(index){
  selectedSceneIndex=index;const type=currentSceneGrid[index];if(!type){renderScene();return;}
  const tr=currentSceneTransforms[index]||defaultTransform(index),meta=currentSceneMeta[index]||{};currentSceneTransforms[index]=tr;
  const color=meta.color||'#8b5cf6';
  const ins=document.getElementById('inspector-content');if(ins)ins.innerHTML=`<div class="unity-inspector-header"><span class="inspector-shape shape-${type}"></span><div><strong>${escapeHTML(meta.name||type)}</strong><small>${type}</small></div></div><div class="inspector-section"><div class="inspector-section-title">Transform</div><label>Position X<input id="insp-x" type="number" value="${Math.round(tr.x)}"></label><label>Position Y<input id="insp-y" type="number" value="${Math.round(tr.y)}"></label><label>Width<input id="insp-w" type="number" min="4" value="${Math.round(tr.w)}"></label><label>Height<input id="insp-h" type="number" min="4" value="${Math.round(tr.h)}"></label><label>Rotation<input id="insp-r" type="number" value="${Math.round(tr.rotation||0)}"></label></div><div class="inspector-section"><div class="inspector-section-title">Appearance</div><label>Name<input id="insp-name" type="text" value="${escapeHTML(meta.name||type)}"></label><label>Color<input id="insp-color" type="color" value="${color}"></label></div><div class="inspector-actions"><button class="btn btn-primary" onclick="applyInspectorTransform()">Apply</button><button class="btn danger-btn" onclick="deleteSelectedSceneObject()">Delete</button></div>`;
  renderScene();
}
function applyInspectorTransform(){
  if(selectedSceneIndex<0)return;const i=selectedSceneIndex,tr=currentSceneTransforms[i]||defaultTransform(i),meta=currentSceneMeta[i]||{};
  tr.x=Number(document.getElementById('insp-x')?.value)||0;tr.y=Number(document.getElementById('insp-y')?.value)||0;tr.w=Math.max(4,Number(document.getElementById('insp-w')?.value)||4);tr.h=Math.max(4,Number(document.getElementById('insp-h')?.value)||4);tr.rotation=Number(document.getElementById('insp-r')?.value)||0;
  meta.name=document.getElementById('insp-name')?.value||meta.name||currentSceneGrid[i];meta.color=document.getElementById('insp-color')?.value||meta.color;currentSceneTransforms[i]=tr;currentSceneMeta[i]=meta;renderScene();selectSceneObject(i);
}
function deleteSelectedSceneObject(){if(selectedSceneIndex<0)return;currentSceneGrid[selectedSceneIndex]='';delete currentSceneMeta[selectedSceneIndex];delete currentSceneTransforms[selectedSceneIndex];selectedSceneIndex=-1;renderScene();vortexNotify('GameObject excluído.','info');}
function renderSceneSelectionHandles(){
  const old=document.getElementById('vortex-resize-overlay');if(old)old.remove();if(selectedSceneIndex<0)return;
  const world=document.getElementById('vortex-scene-world'),tr=currentSceneTransforms[selectedSceneIndex]||defaultTransform(selectedSceneIndex);if(!world)return;
  const overlay=document.createElement('div');overlay.id='vortex-resize-overlay';overlay.className='resize-selection-box';Object.assign(overlay.style,{left:tr.x+'px',top:tr.y+'px',width:tr.w+'px',height:tr.h+'px'});
  ['nw','n','ne','e','se','s','sw','w'].forEach(c=>{const h=document.createElement('div');h.className='resize-handle '+c;h.onmousedown=e=>{e.stopPropagation();e.preventDefault();editorResize={active:true,index:selectedSceneIndex,corner:c,startX:e.clientX,startY:e.clientY,ox:tr.x,oy:tr.y,ow:tr.w,oh:tr.h};};overlay.appendChild(h);});world.appendChild(overlay);
}
function vortexResizeMove(e){
  const r=editorResize;if(!r.active)return;const tr=currentSceneTransforms[r.index];const dx=(e.clientX-r.startX)/editorCamera.zoom,dy=(e.clientY-r.startY)/editorCamera.zoom;let x=r.ox,y=r.oy,w=r.ow,h=r.oh;
  if(r.corner.includes('e'))w=Math.max(8,r.ow+dx);if(r.corner.includes('s'))h=Math.max(8,r.oh+dy);if(r.corner.includes('w')){w=Math.max(8,r.ow-dx);x=r.ox+(r.ow-w);}if(r.corner.includes('n')){h=Math.max(8,r.oh-dy);y=r.oy+(r.oh-h);}
  Object.assign(tr,{x,y,w,h});renderScene();
}
function vortexFrameSelected(){
  const tr=selectedSceneIndex>=0?(currentSceneTransforms[selectedSceneIndex]||defaultTransform(selectedSceneIndex)):null;if(!tr)return vortexCenterScene();
  const c=document.getElementById('canvas-2d');editorCamera.zoom=Math.min(2,Math.max(.5,Math.min(c.clientWidth/(tr.w*3),c.clientHeight/(tr.h*3))));editorCamera.x=tr.x+tr.w/2-c.clientWidth/(2*editorCamera.zoom);editorCamera.y=tr.y+tr.h/2-c.clientHeight/(2*editorCamera.zoom);applyEditorCamera();
}
function vortexCenterScene(){const c=document.getElementById('canvas-2d');editorCamera.zoom=1;editorCamera.x=Math.max(0,EDITOR_WORLD_W/2-c.clientWidth/2);editorCamera.y=Math.max(0,EDITOR_WORLD_H/2-c.clientHeight/2);applyEditorCamera();}
function vortexToggleConsole(){const el=document.getElementById('engine-console');if(el)el.classList.toggle('open');}
function addHierarchyItem(type){vortexAddObject(type);}
function setTileMode(mode){if(mode==='select')vortexEditorTool('select');else if(mode==='resize')vortexEditorTool('scale');else vortexAddObject(mode);}

// 12. VORTEX ENGINE - RUNTIME (usado pelo modo "Testar" E pelo executor de .vexe)
// ==========================================
// Nenhuma física/colisão acontece automaticamente aqui. O runtime só:
//  1) instancia as entidades do mapa (player/bloco/moeda) como objetos simples
//     {x,y,vx,vy,w,h,el};
//  2) roda _ready() uma vez e _update() a 60fps;
//  3) depois de cada _update(), sincroniza a posição visual (DOM) com x/y e
//     aplica a câmera definida via vortex.set_camera(x, y).
// Tudo o que é "gameplay" (mover, colidir, coletar moeda, pular) é feito
// pelo próprio script .vortex chamando a API `vortex`.

const globalKeys = {};
window.addEventListener('keydown', e => globalKeys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => globalKeys[e.key.toLowerCase()] = false);

const TILE_W = 32;
const TILE_H = 35;

function checkCollision(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
}

function makeVortexEntity(inst,type,x,y,w,h,meta={}){
    const el=document.createElement('div');
    el.className='runtime-object runtime-'+type;
    const defaultSize=type==='player'?48:type==='coin'?34:56;
    const ww=Number(w)||Number(meta.w)||defaultSize, hh=Number(h)||Number(meta.h)||defaultSize;
    Object.assign(el.style,{position:'absolute',left:(Number(x)||0)+'px',top:(Number(y)||0)+'px',width:ww+'px',height:hh+'px',boxSizing:'border-box',pointerEvents:'none'});
    if(type==='circle'||type==='coin'){el.style.borderRadius='50%';el.style.background=meta.color||'#facc15';}
    else if(type==='triangle'){el.style.background=meta.color||'#a855f7';el.style.clipPath='polygon(50% 0,100% 100%,0 100%)';}
    else if(type==='player'){el.style.background=meta.color||'#22c55e';el.style.borderRadius='8px';}
    else {el.style.background=meta.color||'#8b5cf6';el.style.borderRadius='4px';}
    const entity={x:Number(x)||0,y:Number(y)||0,w:ww,h:hh,vx:0,vy:0,el,type,shape:type};
    if(type==='coin'){entity.collected=false;inst.physicsData.coins.push(entity);}
    else if(type==='player'){inst.physicsData.player=entity;}
    else {inst.physicsData.blocks.push(entity);}
    inst.worldEl.appendChild(el); return entity;
}
// Texto/Botão colocados no editor (não via script) ficam fixos numa posição
// do MUNDO (rolam junto com a câmera) — ideal pra placas, avisos e botões de
// interação dentro do nível (ex: alavanca, baú, porta).
function createWorldText(inst, x, y, text) {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.maxWidth = (TILE_W * 3) + 'px';
    el.style.color = '#fff';
    el.style.fontFamily = 'monospace';
    el.style.fontSize = '0.8rem';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '0 0 4px rgba(0,0,0,0.85)';
    el.style.pointerEvents = 'none';
    el.innerText = text;
    inst.worldEl.appendChild(el);
    return el;
}

function createWorldButton(inst, x, y, text, action) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.className = 'btn btn-sm btn-primary';
    btn.style.position = 'absolute';
    btn.style.left = x + 'px';
    btn.style.top = y + 'px';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
        if (!action) return;
        const fn = inst.handlers && inst.handlers.functions ? inst.handlers.functions[action] : null;
        if (typeof fn === 'function') {
            try { fn(); }
            catch (err) { inst.log('Erro no botão do mapa ("' + action + '"): ' + err.message, true); }
        } else {
            inst.log('Função "' + action + '" não existe no script.', true);
        }
    };
    inst.worldEl.appendChild(btn);
    return btn;
}

function buildVortexAPI(inst) {
    const now=()=>performance.now()/1000;
    return {
        print:(...args)=>inst.log(args.map(String).join(' ')),
        get_delta:()=>1/60,
        get_time:()=>now(),
        get_player:()=>inst.physicsData.player,
        get_blocks:()=>inst.physicsData.blocks,
        get_coins:()=>inst.physicsData.coins,
        get_objects:()=>[...inst.physicsData.blocks,...inst.physicsData.coins,...(inst.physicsData.player?[inst.physicsData.player]:[])],
        is_key_down:key=>!!globalKeys[String(key).toLowerCase()],
        check_collision:(a,b)=>checkCollision(a,b),
        is_on_floor:(entity)=>{if(!entity)return false;return inst.physicsData.blocks.some(b=>entity.x< b.x+b.w && entity.x+entity.w>b.x && Math.abs((entity.y+entity.h)-b.y)<=4);},
        spawn:(type,gridX,gridY)=>makeVortexEntity(inst,type,Number(gridX)*TILE_W,Number(gridY)*TILE_H),
        spawn_at:(type,x,y)=>makeVortexEntity(inst,type,Number(x),Number(y)),
        destroy:(entity)=>{if(!entity)return;if(entity.el)entity.el.remove();inst.physicsData.blocks=inst.physicsData.blocks.filter(b=>b!==entity);inst.physicsData.coins=inst.physicsData.coins.filter(c=>c!==entity);if(inst.physicsData.player===entity)inst.physicsData.player=null;},
        collect_coin:(coin)=>{if(!coin||coin.collected)return;coin.collected=true;coin.el.style.display='none';},
        add_coins:n=>{inst.coinCount+=(Number(n)||0);return inst.coinCount;},
        set_coins:n=>{inst.coinCount=Number(n)||0;},
        get_coins_count:()=>inst.coinCount,
        set_camera:(x,y)=>{inst.camera.x=Number(x)||0;inst.camera.y=Number(y)||0;},
        follow_camera:(entity,offsetX=320,offsetY=180)=>{if(entity) {inst.camera.x=entity.x-offsetX;inst.camera.y=entity.y-offsetY;}},
        get_position:entity=>entity?{x:entity.x,y:entity.y}:null,
        set_position:(entity,x,y)=>{if(entity){entity.x=Number(x)||0;entity.y=Number(y)||0;return entity;}},
        get_size:entity=>entity?{w:entity.w,h:entity.h}:null,
        set_size:(entity,w,h)=>{if(entity){entity.w=Math.max(1,Number(w)||1);entity.h=Math.max(1,Number(h)||1);entity.el.style.width=entity.w+'px';entity.el.style.height=entity.h+'px';return entity;}},
        set_color:(entity,color)=>{if(entity&&entity.el)entity.el.style.background=String(color);},
        set_visible:(entity,visible)=>{if(entity&&entity.el)entity.el.style.display=visible?'':'none';},
        move:(entity,dx,dy)=>{if(entity){entity.x+=Number(dx)||0;entity.y+=Number(dy)||0;return entity;}},
        set_velocity:(entity,vx,vy)=>{if(entity){entity.vx=Number(vx)||0;entity.vy=Number(vy)||0;return entity;}},
        apply_gravity:(entity,gravity=0.5,maxFall=18)=>{if(entity){entity.vy=Math.min(Number(maxFall)||18,entity.vy+(Number(gravity)||0.5));return entity.vy;}},
        move_and_collide:(entity)=>{if(!entity)return;entity.x+=entity.vx;for(const b of inst.physicsData.blocks){if(checkCollision(entity,b)){if(entity.vx>0)entity.x=b.x-entity.w;else if(entity.vx<0)entity.x=b.x+b.w;entity.vx=0;}}entity.y+=entity.vy;for(const b of inst.physicsData.blocks){if(checkCollision(entity,b)){if(entity.vy>0)entity.y=b.y-entity.h;else if(entity.vy<0)entity.y=b.y+b.h;entity.vy=0;}}return entity;},
        create_text:(id,text,x,y,color)=>{const el=document.createElement('div');Object.assign(el.style,{position:'absolute',left:(Number(x)||0)+'px',top:(Number(y)||0)+'px',color:color||'#fff',fontFamily:'monospace',fontSize:'1rem',fontWeight:'bold',textShadow:'0 0 4px #000'});el.innerText=text;inst.uiLayerEl.appendChild(el);inst.uiElements[id]={el,type:'text'};return el;},
        create_button:(id,text,x,y,onClick)=>{const btn=document.createElement('button');btn.innerText=text;btn.className='btn btn-sm btn-primary';Object.assign(btn.style,{position:'absolute',left:(Number(x)||0)+'px',top:(Number(y)||0)+'px',pointerEvents:'auto'});btn.onclick=()=>{if(typeof onClick==='function')try{onClick();}catch(e){inst.log(e.message,true)}};inst.uiLayerEl.appendChild(btn);inst.uiElements[id]={el:btn,type:'button'};return btn;},
        set_text:(id,text)=>{if(inst.uiElements[id])inst.uiElements[id].el.innerText=text;},
        remove_ui:id=>{if(inst.uiElements[id]){inst.uiElements[id].el.remove();delete inst.uiElements[id];}},
        get_mouse:()=>({x:inst.mouse.x+inst.camera.x,y:inst.mouse.y+inst.camera.y,down:inst.mouse.down}),
    };
}

function syncVortexRender(pd) {
    if (pd.player) {
        pd.player.el.style.left = pd.player.x + 'px';
        pd.player.el.style.top = pd.player.y + 'px';
    }
    pd.blocks.forEach(b => { b.el.style.left = b.x + 'px'; b.el.style.top = b.y + 'px'; });
    pd.coins.forEach(c => {
        if (!c.collected) { c.el.style.left = c.x + 'px'; c.el.style.top = c.y + 'px'; }
    });
}

function vortexInstanceTick(inst) {
    if (inst.handlers && inst.handlers._update) {
        try {
            inst.handlers._update();
        } catch (err) {
            inst.log('Erro em _update(): ' + err.message, true);
            inst.handlers._update = null;
        }
    }
    syncVortexRender(inst.physicsData);
    inst.worldEl.style.transform = `translate(${-inst.camera.x}px, ${-inst.camera.y}px)`;
}

// Cria uma instância de jogo rodável a partir de um mapa + código Vortex,
// dentro de qualquer container do DOM (usado pelo modo Testar e pelo executor de .vexe).
function createVortexGameInstance(containerEl, mapData, scriptCode, opts = {}) {
    containerEl.innerHTML = '';
    containerEl.style.position = 'relative';
    containerEl.style.overflow = 'hidden';
    containerEl.style.background = '#0a0a0f';

    const worldEl = document.createElement('div');
    worldEl.style.position = 'absolute';
    worldEl.style.left = '0';
    worldEl.style.top = '0';
    containerEl.appendChild(worldEl);

    const uiLayerEl = document.createElement('div');
    uiLayerEl.style.position = 'absolute';
    uiLayerEl.style.inset = '0';
    uiLayerEl.style.pointerEvents = 'none';
    uiLayerEl.style.zIndex = '50';
    containerEl.appendChild(uiLayerEl);

    const inst = {
        containerEl, worldEl, uiLayerEl,
        physicsData: { player: null, blocks: [], coins: [] },
        uiElements: {},
        camera: { x: 0, y: 0 },
        mouse: {x:0,y:0,down:false},
        coinCount: 0,
        handlers: null,
        loopHandle: null,
        running: false,
        consoleEl: opts.consoleEl || null
    };

    inst.log = (msg, isErr) => {
        if (inst.consoleEl) {
            inst.consoleEl.style.display = 'block';
            const line = document.createElement('div');
            line.style.color = isErr ? '#ff5555' : '#0f0';
            line.innerText = (isErr ? '❌ ' : '> ') + msg;
            inst.consoleEl.appendChild(line);
            inst.consoleEl.scrollTop = inst.consoleEl.scrollHeight;
        } else {
            (isErr ? console.error : console.log)('[Vortex]', msg);
        }
    };

    const uiData = opts.uiData || {};

    (mapData || []).forEach((type, i) => {
        if (!type) return;
        const x = (i % 20) * TILE_W;
        const y = Math.floor(i / 20) * TILE_H;

        if (type === 'text') {
            const meta = uiData[i] || {};
            createWorldText(inst, x, y, meta.text || '');
        } else if (type === 'button') {
            const meta = uiData[i] || {};
            createWorldButton(inst, x, y, meta.text || 'Botão', meta.action || '');
        } else {
            const tr = (opts.transforms && opts.transforms[i]) || {};
            makeVortexEntity(inst, type, tr.x ?? x, tr.y ?? y, tr.w, tr.h, tr);
        }
    });

    containerEl.addEventListener('mousemove', e=>{const r=containerEl.getBoundingClientRect();inst.mouse.x=e.clientX-r.left;inst.mouse.y=e.clientY-r.top;});
    containerEl.addEventListener('mousedown', e=>{if(e.button===0)inst.mouse.down=true;});
    containerEl.addEventListener('mouseup', e=>{if(e.button===0)inst.mouse.down=false;});

    inst.api = buildVortexAPI(inst);

    try {
        const factory = compileVortexScript(scriptCode || '');
        inst.handlers = factory(inst.api);
        if (inst.handlers._ready) inst.handlers._ready();
    } catch (err) {
        inst.log('Erro ao compilar/rodar script: ' + err.message, true);
        inst.handlers = null;
    }

    inst.start = () => {
        if (inst.running) return;
        inst.running = true;
        inst.loopHandle = setInterval(() => vortexInstanceTick(inst), 1000 / 60);
    };
    inst.stop = () => {
        inst.running = false;
        if (inst.loopHandle) clearInterval(inst.loopHandle);
        inst.loopHandle = null;
    };

    return inst;
}

// ---- Ligação com a janela da Engine (modo "Testar") ----
let currentGameInstance = null;

function toggleEngineTestMode(forceStart=false) {
  const editor=document.getElementById('canvas-2d');
  const viewport=document.getElementById('canvas-2d');
  if(!editor||!viewport)return;
  let screen=document.getElementById('engine-test-screen');
  if(!screen){screen=document.createElement('div');screen.id='engine-test-screen';screen.className='engine-runtime-screen';viewport.appendChild(screen);}
  const running=!!currentGameInstance?.running;
  if(running && !forceStart){
    stopEngineTestLoop();
    screen.innerHTML='';screen.style.display='none';
    document.getElementById('vortex-scene-world')?.style.removeProperty('display');
    vortexNotify('Play Mode parado.','info');
    return;
  }
  if(running)return;
  if(!currentSceneGrid.includes('player')){vortexNotify('Coloque um Player na Scene antes de testar.','error');return;}
  const activeScript=vortexScripts.find(s=>s.id===activeScriptId);
  const world=document.getElementById('vortex-scene-world');if(world)world.style.display='none';
  screen.style.display='block';screen.innerHTML='';
  const consoleBox=document.getElementById('engine-console');if(consoleBox)consoleBox.innerHTML='';
  currentGameInstance=createVortexGameInstance(screen,currentSceneGrid,activeScript?activeScript.code:'',{consoleEl:consoleBox,uiData:currentSceneMeta,transforms:currentSceneTransforms});
  currentGameInstance.start();
  document.querySelector('.engine-test-top')?.classList.add('playing');
  document.querySelector('.engine-test-top')?.replaceChildren(document.createTextNode('■ Stop'));
  vortexNotify('Play Mode iniciado.','success');
}

function stopEngineTestLoop() {
    if (currentGameInstance) { currentGameInstance.stop(); currentGameInstance = null; }
    const world=document.getElementById('vortex-scene-world'); if(world) world.style.display='';
    const screen=document.getElementById('engine-test-screen'); if(screen){screen.style.display='none';screen.innerHTML='';}
    const btn=document.querySelector('.engine-test-top'); if(btn){btn.classList.remove('playing');btn.textContent='▶ Play';}
}

// ==========================================
// 13. PUBLICAÇÃO (.vexe) E LOJA GLOBAL
// ==========================================
function openPublishModalFromEngine() {
    const modal = document.getElementById('publish-modal');
    if (modal) modal.style.display = 'flex';
}

function closePublishModal() {
    const modal = document.getElementById('publish-modal');
    if (modal) modal.style.display = 'none';
}

function compileAndPublishEngineGame() {
    if (!currentUser) return vortexNotify('Faça login primeiro.');

    const title = document.getElementById('app-title-input').value.trim();
    const price = Number(document.getElementById('app-price-input').value) || 0;

    if (!title) return vortexNotify('⚠️ Dê um nome ao seu jogo antes de publicar.');
    if (!currentSceneGrid.includes('player')) return vortexNotify('Coloque um Player na cena antes de publicar.','error');

    const activeScript = vortexScripts.find(s => s.id === activeScriptId);
    const scriptCode = activeScript ? activeScript.code : '';

    // Compila o script antes de publicar, pra não deixar subir um .vexe quebrado.
    try {
        compileVortexScript(scriptCode);
    } catch (err) {
        return vortexNotify('❌ Erro ao compilar o script: ' + err.message + '\nCorrija o código antes de publicar.');
    }

    const appId = 'app_' + Date.now();
    const appData = {
        title,
        price,
        author: currentUser.displayName || currentUser.key,
        authorKey: currentUser.key,
        mapData: currentSceneGrid,
        uiData: currentSceneMeta,
        transforms: currentSceneTransforms,
        scriptCode,
        createdAt: Date.now()
    };

    database.ref('publishedApps/' + appId).set(appData)
        .then(() => database.ref('users/' + currentUser.key + '/files/' + appId).set(true))
        .then(() => {
            vortexNotify(`🚀 "${title}" foi compilado e publicado com sucesso!`);
            closePublishModal();
                    loadUserFiles();
        })
        .catch(err => vortexNotify('Erro ao publicar: ' + err.message));
}

function loadGlobalStore() {
    const list = document.getElementById('global-apps-list');
    if (!list) return;
    list.innerHTML = '<p>Carregando nuvem Firebase...</p>';

    database.ref('publishedApps').once('value').then(snapshot => {
        list.innerHTML = '';
        if (!snapshot.exists()) {
            list.innerHTML = '<p>Nenhum jogo publicado ainda. Seja o primeiro na Vortex Engine!</p>';
            return;
        }
        snapshot.forEach(child => {
            const app = child.val();
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h4>🎮 ${app.title}</h4>
                <p>Por: ${app.author}</p>
                <p>R$ ${Number(app.price).toFixed(2)}</p>
                <button class="btn btn-primary">Comprar / Baixar</button>
            `;
            card.querySelector('button').onclick = () => buyApp(child.key, app);
            list.appendChild(card);
        });
    }).catch(err => {
        list.innerHTML = '<p>Erro ao carregar loja: ' + err.message + '</p>';
    });
}

function buyApp(appId, app) {
    if (!currentUser) return vortexNotify('Faça login primeiro.');
    if (Number(currentUser.balance || 0) < Number(app.price || 0)) {
        return vortexNotify('❌ Saldo insuficiente para comprar este jogo.');
    }

    addBalance(-Number(app.price || 0)).then(() => {
        return database.ref('users/' + currentUser.key + '/files/' + appId).set(true);
    }).then(() => {
        vortexNotify(`✅ "${app.title}" adicionado aos seus arquivos!`);
        loadUserFiles();
    }).catch(err => vortexNotify('Erro na compra: ' + err.message));
}

function loadUserFiles() {
    const list = document.getElementById('files-list');
    if (!list || !currentUser) return;
    list.innerHTML = '<p>Carregando seus sites...</p>';
    database.ref('vortSites').orderByChild('authorKey').equalTo(currentUser.key).once('value').then(snapshot => {
        list.innerHTML = '';
        if (!snapshot.exists()) {
            list.innerHTML = '<p>Nenhum site salvo ainda. Abra o Vortex Site Studio para criar um.</p>';
            return;
        }
        snapshot.forEach(child => {
            const site = child.val() || {};
            const card = document.createElement('div');
            card.className = 'file-card vortex-site-file';
            card.innerHTML = `<div class="file-card-icon"><span class="site-file-shape"></span></div><div class="file-card-info"><strong>${escapeHTML(site.domain || child.key + '.vort')}</strong><span>${escapeHTML(site.title || 'Site Vortex')}</span><small>Atualizado ${new Date(Number(site.updatedAt || Date.now())).toLocaleString('pt-BR')}</small></div>`;
            card.onclick = () => openSavedSiteInStudio(child.key, site);
            list.appendChild(card);
        });
    }).catch(err => { list.innerHTML = '<p>Erro ao carregar arquivos: ' + escapeHTML(err.message) + '</p>'; });
}
function openSavedSiteInStudio(slug, site) {
    openSiteStudio();
    const values = {
        'site-domain': slug,
        'site-title': site.title || '',
        'site-html': site.html || '',
        'site-css': site.css || '',
        'site-js': site.js || ''
    };
    Object.entries(values).forEach(([id, value]) => { const el=document.getElementById(id); if(el) el.value=value; });
    vortexNotify('Arquivo aberto no Vortex Site Studio.','success');
}


// ---- Executor de .vexe: agora roda o jogo de verdade (física do script,
// colisão, moedas, câmera e UI), não é mais um preview estático do mapa. ----
let currentRunnerInstance = null;

function runVexeApp(app) {
    openWindow('win-runner');
    document.getElementById('runner-title').innerText = `🎮 Executando: ${app.title}.vexe`;

    stopRunnerInstance();

    const canvas = document.getElementById('runner-canvas');
    currentRunnerInstance = createVortexGameInstance(canvas, app.mapData, app.scriptCode || '', { uiData: app.uiData || {}, transforms: app.transforms || {} });
    currentRunnerInstance.start();
}

function stopRunnerInstance() {
    if (currentRunnerInstance) {
        currentRunnerInstance.stop();
        currentRunnerInstance = null;
    }
}



// ==========================================
// VORTEX 10.5 - ADMIN PANEL
// ==========================================
const VORTEX_ADMINS = ['rip_fallenhero', 'king'];
function isVortexAdmin(){
  const k=(currentUser?.key||'').toLowerCase();
  return k==='rip_fallenhero' || k==='king';
}
function openAdminPanel(){
  if(!isVortexAdmin()) return vortexNotify('Acesso negado ao painel administrativo.','error');
  openWindow('win-admin'); loadAdminUsers(); loadAdminState();
}
function adminSetBalance(){
  if(!isVortexAdmin()) return;
  const key=(document.getElementById('admin-user-key')?.value||'').trim().toLowerCase().replace(/[.#$/\[\]]/g,'_');
  const amount=Number(document.getElementById('admin-balance-value')?.value);
  if(!key || !Number.isFinite(amount) || amount<0) return vortexNotify('Informe usuário e saldo válidos.','error');
  database.ref('users/'+key).once('value').then(s=>{
    if(!s.exists()) throw new Error('Usuário não encontrado.');
    return database.ref('users/'+key+'/balance').set(Number(amount));
  }).then(()=>vortexNotify('Saldo atualizado em tempo real.','success')).catch(e=>vortexNotify(e.message,'error'));
}
function adminToggleMaintenance(){
  if(!isVortexAdmin()) return;
  const enabled=document.getElementById('admin-maintenance')?.checked;
  database.ref('system/maintenance').set(!!enabled).then(()=>vortexNotify(enabled?'Modo manutenção ativado.':'Modo manutenção desativado.','success')).catch(e=>vortexNotify(e.message,'error'));
}
function adminResetGlobal(){
  if(!isVortexAdmin()) return;
  if(!vortexConfirm('Resetar a sessão de todos os usuários conectados?')) return;
  database.ref('system/globalResetAt').set(Date.now()).then(()=>vortexNotify('Sinal de reset global enviado.','success')).catch(e=>vortexNotify(e.message,'error'));
}
function adminBanUser(){
  if(!isVortexAdmin()) return;
  const key=(document.getElementById('admin-ban-user')?.value||'').trim().toLowerCase().replace(/[.#$/\[\]]/g,'_');
  if(!key) return vortexNotify('Informe um nick.','error');
  database.ref('users/'+key+'/messengerBanned').set(true).then(()=>vortexNotify('Usuário banido do Messenger.','success')).catch(e=>vortexNotify(e.message,'error'));
}
function adminUnbanUser(){
  if(!isVortexAdmin()) return;
  const key=(document.getElementById('admin-ban-user')?.value||'').trim().toLowerCase().replace(/[.#$/\[\]]/g,'_');
  if(!key) return vortexNotify('Informe um nick.','error');
  database.ref('users/'+key+'/messengerBanned').set(false).then(()=>vortexNotify('Banimento removido.','success')).catch(e=>vortexNotify(e.message,'error'));
}
function adminDeleteAccount(){
  if(!isVortexAdmin()) return;
  const key=(document.getElementById('admin-delete-user')?.value||'').trim().toLowerCase().replace(/[.#$/\[\]]/g,'_');
  if(!key) return vortexNotify('Informe o nick da conta.','error');
  if(key===currentUser.key) return vortexNotify('Não é permitido excluir a própria conta pelo painel.','error');
  if(!vortexConfirm('Excluir permanentemente os dados desta conta da Realtime Database?')) return;
  database.ref('users/'+key).remove().then(()=>{
    // Remove dados do perfil. Mensagens/grupos podem conter referências e não são apagados automaticamente.
    return Promise.all([
      database.ref('userFiles/'+key).remove().catch(()=>null),
      database.ref('userSites/'+key).remove().catch(()=>null)
    ]);
  }).then(()=>{ vortexNotify('Conta removida da Realtime Database.','success'); loadAdminUsers(); }).catch(e=>vortexNotify(e.message,'error'));
}
function loadAdminState(){
  database.ref('system/maintenance').once('value').then(s=>{const e=document.getElementById('admin-maintenance');if(e)e.checked=!!s.val();});
}
function loadAdminUsers(){
  const list=document.getElementById('admin-users-list'); if(!list)return; list.innerHTML='Carregando...';
  database.ref('users').on('value',s=>{
    list.innerHTML='';
    s.forEach(c=>{const u=c.val()||{};const d=document.createElement('div');d.className='admin-user-row';d.innerHTML=`<strong>${escapeHTML(c.key)}</strong><span>R$ ${Number(u.balance||0).toFixed(2)}</span><span>${u.messengerBanned?'Banido':''}</span>`;list.appendChild(d);});
  });
}
function watchGlobalSystem(){
  database.ref('system/maintenance').on('value',s=>{ if(!s.val()) { const o=document.getElementById('maintenance-screen'); if(o)o.style.display='none'; return; } if(isVortexAdmin()) return; const o=document.getElementById('maintenance-screen'); if(o)o.style.display='flex'; });
  database.ref('system/globalResetAt').on('value',s=>{ const t=Number(s.val()||0); if(t && t>Number(localStorage.getItem('vortex_last_global_reset')||0)){ localStorage.setItem('vortex_last_global_reset',String(t)); shutdownPC(); } });
}

// ==========================================
// VORTEX BROWSER + HISTÓRICO
// ==========================================
let vortexBrowserHistory = JSON.parse(localStorage.getItem('vortex_browser_history') || '[]');
let vortexBrowserStack = [];
let vortexBrowserIndex = -1;
let vortexBrowserCurrent = '';
function saveBrowserHistory(query){
  const q=(query||'').trim(); if(!q)return;
  vortexBrowserHistory=[q,...vortexBrowserHistory.filter(x=>x!==q)].slice(0,50);
  localStorage.setItem('vortex_browser_history',JSON.stringify(vortexBrowserHistory));
}
function openVortexBrowser(){ openWindow('win-browser'); const input=document.getElementById('vortex-browser-address'); if(input) input.focus(); renderBrowserHistory(); }
function browserLoadAddress(q, push=true){
  const frame=document.getElementById('vortex-browser-page'); const input=document.getElementById('vortex-browser-address'); if(!frame)return;
  q=(q||'').trim(); if(!q)return;
  if(push){
    vortexBrowserStack=vortexBrowserStack.slice(0,vortexBrowserIndex+1);
    vortexBrowserStack.push(q); vortexBrowserIndex=vortexBrowserStack.length-1;
  }
  vortexBrowserCurrent=q; if(input) input.value=q; saveBrowserHistory(q);
  const normalized=q.toLowerCase();
  if(normalized==='vortex.features.vort' || normalized==='vortex.updates.vort'){ loadVortexFeaturesSite(frame); renderBrowserHistory(); return; }
  if(normalized==='vortex.api.vort'){ loadVortexApiSite(frame); renderBrowserHistory(); return; }
  if(/^https?:\/\//i.test(q)){ frame.innerHTML='<div class="vortex-browser-home"><h2>Navegação externa</h2><p>O Vortex Browser nesta versão trabalha principalmente com sites .vort.</p></div>'; renderBrowserHistory(); return; }
  if(/^[a-z0-9-]+\.vort$/i.test(q)){ loadVortSite(q.toLowerCase(),frame); renderBrowserHistory(); return; }
  frame.innerHTML=`<div class="vortex-browser-home"><div class="vortex-browser-logo">Vortex</div><p>Pesquisa interna: <strong>${escapeHTML(q)}</strong></p><small>Digite um endereço .vort para abrir um site Vortex.</small></div>`;
  renderBrowserHistory();
}
function browserNavigate(){ const input=document.getElementById('vortex-browser-address'); if(input) browserLoadAddress(input.value,true); }
function browserBack(){ if(vortexBrowserIndex<=0)return; vortexBrowserIndex--; browserLoadAddress(vortexBrowserStack[vortexBrowserIndex],false); }
function browserForward(){ if(vortexBrowserIndex>=vortexBrowserStack.length-1)return; vortexBrowserIndex++; browserLoadAddress(vortexBrowserStack[vortexBrowserIndex],false); }
function browserRefresh(){ if(vortexBrowserCurrent) browserLoadAddress(vortexBrowserCurrent,false); else browserLoadAddress('vortex.features.vort',true); }
function renderBrowserHistory(){
  const box=document.getElementById('vortex-browser-history'); if(!box)return;
  box.innerHTML=vortexBrowserHistory.length?vortexBrowserHistory.map(q=>`<button class="history-item" onclick="browserLoadAddress(${JSON.stringify(q)},true)">${escapeHTML(q)}</button>`).join(''):'<span class="muted">Nenhuma pesquisa ainda.</span>';
}
function clearBrowserHistory(){ vortexBrowserHistory=[]; localStorage.setItem('vortex_browser_history','[]'); renderBrowserHistory(); vortexNotify('Histórico limpo.','success'); }
function loadVortSite(domain,frame){
  const slug=domain.replace(/\.vort$/i,'').replace(/[^a-z0-9-]/g,'').toLowerCase();
  if(slug==='vortex-api') return loadVortexApiSite(frame);
  if(slug==='vortex-features' || slug==='vortex-updates') return loadVortexFeaturesSite(frame);
  database.ref('vortSites/'+slug).once('value').then(s=>{if(!s.exists()){frame.innerHTML='<div class="vortex-browser-home"><h2>404</h2><p>Este domínio .vort não existe.</p></div>';return;}const site=s.val();frame.innerHTML=site.html||'';const st=document.createElement('style');st.textContent=site.css||'';frame.appendChild(st);if(site.js){const sc=document.createElement('script');sc.textContent=site.js;frame.appendChild(sc);}}).catch(e=>frame.innerHTML='<p>Erro ao abrir site: '+escapeHTML(e.message)+'</p>');
}
function loadVortexFeaturesSite(frame){
  frame.innerHTML=`<div class="features-site"><div class="features-hero"><div class="features-mark">V</div><div><div class="features-kicker">Vortex OS</div><h1>Features & Atualizações</h1><p>Histórico das versões e das mudanças importantes do sistema.</p></div></div><section class="feature-release"><span class="release-tag">v11.03</span><h2>Uma nova fase: foco na Web</h2><p>O Vortex OS está deixando para trás sistemas que ficaram complexos demais para o objetivo do projeto. A partir desta versão, o foco passa a ser criar, salvar, publicar e navegar por experiências Web dentro do próprio Vortex.</p></section><section class="feature-release goodbye"><span class="release-tag">Encerrado</span><h2>Adeus... Vortex Engine.</h2><p>A Vortex Engine foi uma parte importante da nossa história. Ela nasceu para permitir que pessoas criassem jogos 2D dentro do Vortex, mas cresceu até ficar complexa, difícil de organizar, difícil de aprender e desnecessária para o rumo que queremos seguir. Por isso, a Engine está sendo encerrada.</p><p>Junto dela, a Loja Global de jogos também deixa de existir. Não faz sentido manter uma loja de executáveis quando o Vortex está se tornando uma plataforma centrada na Web.</p><p>Isso não é o fim do Vortex. É uma simplificação. O sistema agora concentra seus esforços no <strong>Vortex Browser</strong>, no <strong>Vortex Site Studio</strong>, nos domínios <strong>.vort</strong>, no salvamento de sites, no histórico do navegador e na documentação da linguagem e das ferramentas Web.</p><p>Obrigado por tudo que a Vortex Engine representou. Adeus, Engine. E obrigado por ter feito parte da história do Vortex.</p></section><section class="feature-release"><span class="release-tag">v11.02</span><h2>Scene Editor</h2><p>Foi a última grande tentativa de transformar a Engine em um editor 2D completo, com Scene, Hierarchy, Inspector e ferramentas de transformação.</p></section><section class="feature-release"><span class="release-tag">v11.00</span><h2>Vortex Browser e .vort</h2><p>Chegaram o navegador do sistema, o Vortex Site Studio, publicação de sites .vort, histórico de pesquisa e a documentação acessível pelo endereço <strong>vortex.api.vort</strong>.</p></section><section class="feature-release"><span class="release-tag">v10.x</span><h2>Vortex OS: a fase dos jogos</h2><p>As versões anteriores experimentaram Engine 2D, scripts Vortex, jogos publicados, economia, Messenger e ferramentas de criação.</p></section></div>`;
}

// ==========================================
// VORTEX SITE STUDIO (.VORT) — SAVE LOCAL + CLOUD
// ==========================================
function openSiteStudio(){openWindow('win-site-studio'); loadSavedVortSites(); loadVortDraft();}
function vortexSiteSlug(){return (document.getElementById('site-domain')?.value||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');}
function siteDraftKey(){return 'vortex_site_draft_'+(currentUser?.key||'guest');}
function saveVortDraft(){
  const data={domain:document.getElementById('site-domain')?.value||'',title:document.getElementById('site-title')?.value||'',html:document.getElementById('site-html')?.value||'',css:document.getElementById('site-css')?.value||'',js:document.getElementById('site-js')?.value||''};
  localStorage.setItem(siteDraftKey(),JSON.stringify(data)); vortexNotify('Rascunho salvo neste computador.','success');
}
function loadVortDraft(){
  try{const d=JSON.parse(localStorage.getItem(siteDraftKey())||'null');if(!d)return;for(const [id,key] of [['site-domain','domain'],['site-title','title'],['site-html','html'],['site-css','css'],['site-js','js']]){const e=document.getElementById(id);if(e&&d[key]!=null)e.value=d[key];}}catch(e){}
}
function saveVortSite(){
  if(!currentUser)return vortexNotify('Faça login primeiro.','error');
  const slug=vortexSiteSlug(); if(!slug)return vortexNotify('Escolha um domínio.','error');
  const title=(document.getElementById('site-title')?.value||slug).trim();
  const html=document.getElementById('site-html')?.value||''; const css=document.getElementById('site-css')?.value||''; const js=document.getElementById('site-js')?.value||'';
  const data={domain:slug+'.vort',title,html,css,js,authorKey:currentUser.key,author:currentUser.displayName||currentUser.key,updatedAt:Date.now()};
  database.ref('vortSites/'+slug).transaction(old=>{if(old && old.authorKey!==currentUser.key)return;return data;}).then(r=>{if(!r.committed)return vortexNotify('Você não é o dono deste domínio.','error'); localStorage.removeItem(siteDraftKey()); database.ref('users/'+currentUser.key+'/siteFiles/'+slug).set({domain:data.domain,title:data.title,updatedAt:data.updatedAt}); vortexNotify('Site salvo em Meus Arquivos: '+slug+'.vort','success'); loadSavedVortSites(); loadUserFiles();}).catch(e=>vortexNotify('Erro: '+e.message,'error'));
}
function loadSavedVortSites(){
  const box=document.getElementById('saved-sites-list'); if(!box||!currentUser)return;
  database.ref('vortSites').orderByChild('authorKey').equalTo(currentUser.key).once('value').then(s=>{box.innerHTML='';s.forEach(c=>{const site=c.val();const b=document.createElement('button');b.className='saved-site-item';b.innerHTML=`<strong>${escapeHTML(site.domain||c.key+'.vort')}</strong><span>${escapeHTML(site.title||'Sem título')}</span>`;b.onclick=()=>{document.getElementById('site-domain').value=c.key;document.getElementById('site-title').value=site.title||'';document.getElementById('site-html').value=site.html||'';document.getElementById('site-css').value=site.css||'';document.getElementById('site-js').value=site.js||'';};box.appendChild(b);});if(!box.children.length)box.innerHTML='<span class="muted">Nenhum site publicado.</span>';}).catch(()=>{});
}
function previewVortSite(){const f=document.getElementById('site-preview');if(!f)return;f.innerHTML=document.getElementById('site-html').value||'';const st=document.createElement('style');st.textContent=document.getElementById('site-css').value||'';f.appendChild(st);const sc=document.createElement('script');sc.textContent=document.getElementById('site-js').value||'';f.appendChild(sc);}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    tryAutoLogin();

    const pinInput = document.getElementById('auth-pin');
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginUser();
        });
    }
});
