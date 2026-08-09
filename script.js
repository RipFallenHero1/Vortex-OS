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
const OS_VERSION = "11.00";

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
    return window.confirm(message);
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
    loadGlobalStore();
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
    bringToFront(win);
    openApps.add(id);
    addTaskbarButton(id);

    if (id === 'win-engine') initMapCanvasOnce();
    if (id === 'win-vscode') renderScriptsSidebarList();
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.style.display = 'none';
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
    btn.onclick = () => {
        const w = document.getElementById(id);
        if (w.style.display === 'none') w.style.display = 'flex';
        bringToFront(w);
    };
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

function simulateIncomingPix() {
    if (!currentUser) return vortexNotify('Faça login primeiro.');
    const valor = Math.floor(Math.random() * 41) + 10;
    addBalance(valor).then(() => {
        vortexNotify(`💸 Você recebeu um Pix simulado de R$ ${valor.toFixed(2)}!`);
    }).catch(err => vortexNotify('Erro: ' + err));
}

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
// 10. VORTEX ENGINE 2D — SCENE EDITOR 11.00
// ==========================================
let mapCanvasInitialized=false;
let editorCamera={x:0,y:0,zoom:1};
let editorPan={active:false,startX:0,startY:0,camX:0,camY:0};
const EDITOR_W=1200, EDITOR_H=800;
const SHAPES=['square','circle','triangle','player','coin','text','button'];

function initMapCanvasOnce(){
  if(mapCanvasInitialized)return;
  const canvas=document.getElementById('canvas-2d'); if(!canvas)return;
  canvas.innerHTML=''; canvas.classList.add('vortex-scene-viewport');
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onmousedown=e=>{
    if(e.button===2){editorPan.active=true;editorPan.startX=e.clientX;editorPan.startY=e.clientY;editorPan.camX=editorCamera.x;editorPan.camY=editorCamera.y;canvas.classList.add('panning');}
    else if(e.button===0 && e.target===canvas && currentTileMode!=='resize' && currentTileMode!=='select') createSceneObjectAtEvent(e);
  };
  canvas.onmousemove=e=>{if(editorPan.active){editorCamera.x=editorPan.camX-(e.clientX-editorPan.startX)/editorCamera.zoom;editorCamera.y=editorPan.camY-(e.clientY-editorPan.startY)/editorCamera.zoom;applyEditorCamera();}};
  window.addEventListener('mouseup',()=>{editorPan.active=false;canvas.classList.remove('panning');});
  canvas.addEventListener('wheel',e=>{e.preventDefault();const old=editorCamera.zoom;editorCamera.zoom=Math.max(.35,Math.min(2.5,old*(e.deltaY<0?1.1:.9)));applyEditorCamera();},{passive:false});
  const world=document.createElement('div'); world.id='vortex-scene-world'; world.className='vortex-scene-world'; canvas.appendChild(world);
  mapCanvasInitialized=true; renderScene(); applyEditorCamera();
}
function applyEditorCamera(){const world=document.getElementById('vortex-scene-world');if(world)world.style.transform=`translate(${-editorCamera.x*editorCamera.zoom}px,${-editorCamera.y*editorCamera.zoom}px) scale(${editorCamera.zoom})`;const label=document.getElementById('engine-viewport-label');if(label)label.innerText=`CENA 2D  •  Câmera ${Math.round(editorCamera.x)}, ${Math.round(editorCamera.y)}  •  Zoom ${Math.round(editorCamera.zoom*100)}%  •  Botão direito: mover câmera`}
function sceneFreeIndex(){let i=0;while(currentSceneGrid[i])i++;if(i>=1000)currentSceneGrid.length=1100;return i;}
function defaultTransform(i){return currentSceneTransforms[i]||{x:80+(i%10)*64,y:80+Math.floor(i/10)*64,w:56,h:56,rotation:0};}
function setTileMode(mode){currentTileMode=mode;['square','circle','triangle','player','coin','text','button','select','resize','erase'].forEach(m=>{const b=document.getElementById('btn-t-'+m);if(b)b.classList.toggle('active',m===mode);});const ins=document.getElementById('inspector-content');if(ins)ins.innerHTML=mode==='resize'?'<strong>Tamanho</strong><p>Selecione um objeto e arraste qualquer alça. O redimensionamento funciona direto na cena.</p>':mode==='select'?'<strong>Seleção</strong><p>Clique em um objeto para selecionar. Arraste para mover.</p>':`<strong>Ferramenta</strong><p>${escapeHTML(mode)}</p>`;renderScene();}
function createSceneObjectAtEvent(e){const canvas=document.getElementById('canvas-2d');const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/editorCamera.zoom+editorCamera.x;const y=(e.clientY-rect.top)/editorCamera.zoom+editorCamera.y;const i=sceneFreeIndex();if(currentTileMode==='erase')return;let type=currentTileMode;if(!SHAPES.includes(type))type='square';if(type==='player'){const old=currentSceneGrid.indexOf('player');if(old>=0){currentSceneGrid[old]='';delete currentSceneTransforms[old];}}currentSceneGrid[i]=type;currentSceneTransforms[i]={x:x-28,y:y-28,w:56,h:56,rotation:0};selectedSceneIndex=i;renderScene();selectSceneObject(i);}
function applyTool(index){selectSceneObject(index);}
function renderScene(){const world=document.getElementById('vortex-scene-world');if(!world)return;world.innerHTML='';const grid=document.createElement('div');grid.className='vortex-scene-grid';grid.style.width='2400px';grid.style.height='1600px';world.appendChild(grid);currentSceneGrid.forEach((type,i)=>{if(!type)return;const tr=defaultTransform(i),meta=currentSceneMeta[i]||{};const o=document.createElement('div');o.className='scene-object scene-'+type+(i===selectedSceneIndex?' selected':'');o.dataset.index=i;Object.assign(o.style,{left:tr.x+'px',top:tr.y+'px',width:tr.w+'px',height:tr.h+'px',transform:`rotate(${tr.rotation||0}deg)`});if(meta.color)o.style.background=meta.color;o.onmousedown=e=>{if(e.button!==0)return;e.stopPropagation();if(currentTileMode==='erase'){deleteSelectedSceneObject();return;}selectSceneObject(i);if(currentTileMode==='select'){const sx=e.clientX,sy=e.clientY,ox=tr.x,oy=tr.y;const move=ev=>{tr.x=ox+(ev.clientX-sx)/editorCamera.zoom;tr.y=oy+(ev.clientY-sy)/editorCamera.zoom;renderScene();};const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);}};world.appendChild(o);});renderSceneSelectionHandles();renderHierarchy();}
function renderHierarchy(){const tree=document.getElementById('hierarchy-tree');if(!tree)return;tree.innerHTML='';currentSceneGrid.forEach((type,i)=>{if(!type)return;const li=document.createElement('li');li.className='tree-item '+(i===selectedSceneIndex?'selected':'');li.innerHTML=`<span class="shape-mini shape-${type}"></span><span>${type} #${i+1}</span>`;li.onclick=()=>selectSceneObject(i);tree.appendChild(li);});vortexScripts.forEach(s=>{const li=document.createElement('li');li.className='tree-script';li.innerHTML=`<span>V</span>${escapeHTML(s.name)}.vortex`;li.onclick=()=>openVortexScriptEditor(s.id);tree.appendChild(li);});}
function selectSceneObject(index){selectedSceneIndex=index;const type=currentSceneGrid[index];if(!type)return;const tr=defaultTransform(index),meta=currentSceneMeta[index]||{};currentSceneTransforms[index]=tr;const color=meta.color||(type==='coin'?'#facc15':type==='player'?'#22c55e':'#8b5cf6');const ins=document.getElementById('inspector-content');if(ins)ins.innerHTML=`<div class="inspector-form"><strong>${type.toUpperCase()}</strong><label>X<input id="insp-x" type="number" value="${Math.round(tr.x)}"></label><label>Y<input id="insp-y" type="number" value="${Math.round(tr.y)}"></label><label>Largura<input id="insp-w" type="number" min="4" value="${Math.round(tr.w)}"></label><label>Altura<input id="insp-h" type="number" min="4" value="${Math.round(tr.h)}"></label><label>Cor<input id="insp-color" type="color" value="${color}"></label><button class="btn btn-primary" onclick="applyInspectorTransform()">Aplicar</button><button class="btn danger-btn" onclick="deleteSelectedSceneObject()">Excluir objeto</button></div>`;renderScene();}
function applyInspectorTransform(){if(selectedSceneIndex<0)return;const i=selectedSceneIndex,tr=currentSceneTransforms[i]||defaultTransform(i);tr.x=Number(document.getElementById('insp-x').value)||0;tr.y=Number(document.getElementById('insp-y').value)||0;tr.w=Math.max(4,Number(document.getElementById('insp-w').value)||4);tr.h=Math.max(4,Number(document.getElementById('insp-h').value)||4);currentSceneTransforms[i]=tr;currentSceneMeta[i]=Object.assign({},currentSceneMeta[i],{color:document.getElementById('insp-color').value});renderScene();}
function deleteSelectedSceneObject(){if(selectedSceneIndex<0)return;currentSceneGrid[selectedSceneIndex]='';delete currentSceneMeta[selectedSceneIndex];delete currentSceneTransforms[selectedSceneIndex];selectedSceneIndex=-1;renderScene();}
function renderSceneSelectionHandles(){const old=document.getElementById('vortex-resize-overlay');if(old)old.remove();if(selectedSceneIndex<0)return;const world=document.getElementById('vortex-scene-world');const tr=defaultTransform(selectedSceneIndex);const o=document.querySelector(`.scene-object[data-index="${selectedSceneIndex}"]`);if(!world||!o)return;const overlay=document.createElement('div');overlay.id='vortex-resize-overlay';overlay.className='resize-selection-box';Object.assign(overlay.style,{left:tr.x+'px',top:tr.y+'px',width:tr.w+'px',height:tr.h+'px'});['nw','ne','sw','se'].forEach(c=>{const h=document.createElement('div');h.className='resize-handle '+c;h.onmousedown=e=>{e.stopPropagation();e.preventDefault();const sx=e.clientX,sy=e.clientY,ox=tr.x,oy=tr.y,ow=tr.w,oh=tr.h;const move=ev=>{let dx=(ev.clientX-sx)/editorCamera.zoom,dy=(ev.clientY-sy)/editorCamera.zoom;if(c.includes('e'))tr.w=Math.max(8,ow+dx);if(c.includes('s'))tr.h=Math.max(8,oh+dy);if(c.includes('w')){tr.x=ox+dx;tr.w=Math.max(8,ow-dx);}if(c.includes('n')){tr.y=oy+dy;tr.h=Math.max(8,oh-dy);}renderScene();};const up=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);};overlay.appendChild(h);});world.appendChild(overlay);}
function addHierarchyItem(type){currentTileMode=type;createSceneObjectAtEvent({clientX:document.getElementById('canvas-2d').getBoundingClientRect().left+120,clientY:document.getElementById('canvas-2d').getBoundingClientRect().top+120});}

// ==========================================
// 11. LINGUAGEM VORTEX (PYTHON-LIKE) — CRIAÇÃO DE SCRIPTS
// ==========================================
//
// API disponível dentro de _ready() e _update() via objeto global `vortex`:
//
//   vortex.print(...)                     -> loga no console da engine
//   vortex.get_player()                   -> {x,y,vx,vy,w,h,el} ou null
//   vortex.get_blocks()                   -> lista de blocos {x,y,w,h}
//   vortex.get_coins()                    -> lista de moedas {x,y,w,h,collected}
//   vortex.is_key_down("a"/"arrowleft"/" "/etc)
//   vortex.check_collision(a, b)          -> bool (colisão de retângulos)
//   vortex.spawn(tipo, gridX, gridY)      -> cria entidade na grade (32x35)
//   vortex.spawn_at(tipo, x, y)           -> cria entidade em pixel
//   vortex.destroy(entidade)
//   vortex.collect_coin(moeda)            -> some com a moeda (você decide quando chamar)
//   vortex.add_coins(n) / vortex.set_coins(n) / vortex.get_coins_count()
//   vortex.set_camera(x, y)               -> desloca a câmera (mundo) manualmente
//   vortex.create_text(id, texto, x, y, cor?)
//   vortex.create_button(id, texto, x, y, funcaoDeCallback)
//   vortex.set_text(id, texto)
//   vortex.remove_ui(id)
//
// Funções nativas da linguagem: str(x), int(x), float(x), len(x)
//
// Nada de física, movimento ou colisão é automático: o script precisa
// implementar isso chamando as funções acima dentro de _update().

function saveVortexScriptsLocal(){if(currentUser)localStorage.setItem('vortex_scripts_'+currentUser.key,JSON.stringify(vortexScripts));}
function loadVortexScriptsLocal(){if(!currentUser)return;try{vortexScripts=JSON.parse(localStorage.getItem('vortex_scripts_'+currentUser.key)||'[]')||[];activeScriptId=vortexScripts[0]?.id||null;}catch(e){vortexScripts=[];activeScriptId=null;}}

function createVortexScript() {
    const name = prompt('Nome do script (sem extensão):', 'meu_script') || 'script_' + (vortexScripts.length + 1);
    const id = 'script_' + Date.now();
    const defaultCode =
`# Script Vortex - ${name}.vortex
# Nada aqui é automático: você programa o movimento, a gravidade,
# a colisão, a coleta de moedas e a câmera.

def _ready():
    print("Script ${name} carregado!")
    vortex.create_text("hud_moedas", "Moedas: 0", 10, 10)

def _update():
    player = vortex.get_player()
    if player == None:
        return

    # --- Movimento horizontal ---
    if vortex.is_key_down("a") or vortex.is_key_down("arrowleft"):
        player.x = player.x - 4
    if vortex.is_key_down("d") or vortex.is_key_down("arrowright"):
        player.x = player.x + 4

    # --- Gravidade simples ---
    player.vy = player.vy + 0.6
    player.y = player.y + player.vy

    # --- Colisão com blocos (pouso e pulo) ---
    for bloco in vortex.get_blocks():
        if vortex.check_collision(player, bloco):
            player.y = bloco.y - player.h
            player.vy = 0
            if vortex.is_key_down(" "):
                player.vy = -12

    # --- Coleta de moedas ---
    for moeda in vortex.get_coins():
        if not moeda.collected and vortex.check_collision(player, moeda):
            vortex.collect_coin(moeda)
            vortex.add_coins(1)
            vortex.set_text("hud_moedas", "Moedas: " + str(vortex.get_coins_count()))

    # --- Câmera seguindo o jogador ---
    vortex.set_camera(player.x - 300, player.y - 200)

# Qualquer função como esta pode ser chamada por um botão colocado
# no mapa (ferramenta "🔘 Botão" na Engine), digitando "abrir_bau" no
# campo de ação do botão.
def abrir_bau():
    print("O baú foi aberto!")
    vortex.add_coins(5)`;

    vortexScripts.push({ id, name, code: defaultCode });
    saveVortexScriptsLocal();

    // Adiciona na hierarquia da engine
    const tree = document.getElementById('hierarchy-tree');
    if (tree) {
        const li = document.createElement('li');
        li.innerText = `📜 ${name}.vortex`;
        li.style.cursor = 'pointer';
        li.dataset.scriptId = id;
        li.onclick = () => openVortexScriptEditor(id);
        tree.appendChild(li);
    }

    openVortexScriptEditor(id);
}

function openVortexScriptEditor(scriptId) {
    activeScriptId = scriptId;
    const script = vortexScripts.find(s => s.id === scriptId);
    if (!script) return;

    openWindow('win-vscode');
    document.getElementById('vortex-filename').value = script.name;
    document.getElementById('vortex-code-editor').value = script.code;
    renderScriptsSidebarList();
}

function renderScriptsSidebarList() {
    const list = document.getElementById('vscode-scripts-list');
    if (!list) return;
    list.innerHTML = '';

    if (vortexScripts.length === 0) {
        list.innerHTML = '<li style="color:#666;">Nenhum script ainda</li>';
        return;
    }

    vortexScripts.forEach(s => {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;';
        const openBtn = document.createElement('button');
        openBtn.className = 'btn';
        openBtn.style.cssText = 'flex:1;text-align:left;padding:4px 6px;';
        openBtn.innerText = (s.id === activeScriptId ? '➤ ' : '📜 ') + s.name + '.vortex';
        openBtn.onclick = () => openVortexScriptEditor(s.id);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn';
        delBtn.style.cssText = 'padding:4px 7px;color:#ff6b81;';
        delBtn.innerText = '🗑️';
        delBtn.title = 'Excluir script';
        delBtn.onclick = (e) => { e.stopPropagation(); deleteVortexScript(s.id); };
        li.append(openBtn, delBtn);
        list.appendChild(li);
    });
}

function deleteVortexScript(scriptId) {
    const script = vortexScripts.find(s => s.id === scriptId);
    if (!script) return;
    if (!confirm(`Excluir o script \"${script.name}.vortex\"?`)) return;
    vortexScripts = vortexScripts.filter(s => s.id !== scriptId);
    saveVortexScriptsLocal();
    if (activeScriptId === scriptId) {
        activeScriptId = vortexScripts[0]?.id || null;
        if (activeScriptId) openVortexScriptEditor(activeScriptId);
        else {
            const ed=document.getElementById('vortex-code-editor'); if(ed) ed.value='';
            const fn=document.getElementById('vortex-filename'); if(fn) fn.value='';
        }
    }
    renderScriptsSidebarList();
    renderHierarchy();
}

function saveVortexScript() {
    const filenameInput = document.getElementById('vortex-filename');
    const codeEditor = document.getElementById('vortex-code-editor');
    const name = filenameInput.value.trim() || 'sem_nome';
    const code = codeEditor.value;

    let script = vortexScripts.find(s => s.id === activeScriptId);
    if (!script) {
        script = { id: 'script_' + Date.now(), name, code };
        vortexScripts.push(script);
        activeScriptId = script.id;

        const tree = document.getElementById('hierarchy-tree');
        if (tree) {
            const li = document.createElement('li');
            li.innerText = `📜 ${name}.vortex`;
            li.style.cursor = 'pointer';
            li.dataset.scriptId = script.id;
            li.onclick = () => openVortexScriptEditor(script.id);
            tree.appendChild(li);
        }
    } else {
        script.name = name;
        script.code = code;
    }

    renderScriptsSidebarList();
    vortexNotify(`💾 "${name}.vortex" foi salvo!`);
}

function runScriptFromStudio() {
    saveVortexScript();
    openWindow('win-engine');
    bringToFront(document.getElementById('win-engine'));
    const testScreen = document.getElementById('engine-test-screen');
    if (testScreen.style.display === 'none') {
        toggleEngineTestMode();
    } else {
        stopEngineTestLoop();
        toggleEngineTestMode();
    }
}

// ---- TRANSPILADOR: Vortex (Python-like) -> JavaScript ----
function transpileVortexToJS(code) {
    const lines = code.split('\n');
    const output = [];
    const indentStack = [0];

    for (let raw of lines) {
        let line = raw.split('#')[0];
        if (line.trim() === '') continue;

        const indent = raw.match(/^\s*/)[0].replace(/\t/g, '    ').length;
        let trimmed = line.trim();

        while (indent < indentStack[indentStack.length - 1]) {
            output.push('}');
            indentStack.pop();
        }

        trimmed = trimmed
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null')
            .replace(/\band\b/g, '&&')
            .replace(/\bor\b/g, '||')
            .replace(/\bnot\s+/g, '!')
            .replace(/\.append\(/g, '.push(')
            .replace(/\bpass\b/g, ';');

        const isBlockOpener = /:$/.test(trimmed);

        if (/^def\s+\w+\s*\(.*\)\s*:$/.test(trimmed)) {
            trimmed = trimmed.replace(/^def\s+(\w+)\s*\((.*)\)\s*:$/, 'function $1($2) {');
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^for\s+\w+\s+in\s+range\(.+\)\s*:$/.test(trimmed)) {
            // for i in range(n) / range(a, b) / range(a, b, passo)
            trimmed = trimmed.replace(/^for\s+(\w+)\s+in\s+range\((.+)\)\s*:$/, (m, varName, args) => {
                const parts = args.split(',').map(a => a.trim());
                if (parts.length === 1) {
                    return `for (let ${varName} = 0; ${varName} < ${parts[0]}; ${varName}++) {`;
                }
                const step = parts[2] || '1';
                return `for (let ${varName} = ${parts[0]}; ${varName} < ${parts[1]}; ${varName} += ${step}) {`;
            });
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^for\s+\w+\s+in\s+.+:$/.test(trimmed)) {
            // for item in lista
            trimmed = trimmed.replace(/^for\s+(\w+)\s+in\s+(.+):$/, 'for (let $1 of $2) {');
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^if\s+.+:$/.test(trimmed)) {
            trimmed = trimmed.replace(/^if\s+(.+):$/, 'if ($1) {');
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^elif\s+.+:$/.test(trimmed)) {
            trimmed = trimmed.replace(/^elif\s+(.+):$/, '} else if ($1) {');
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^else\s*:$/.test(trimmed)) {
            trimmed = '} else {';
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (/^while\s+.+:$/.test(trimmed)) {
            trimmed = trimmed.replace(/^while\s+(.+):$/, 'while ($1) {');
            output.push(trimmed);
            indentStack.push(indent + 4);
        } else if (isBlockOpener) {
            output.push(trimmed.slice(0, -1) + ' {');
            indentStack.push(indent + 4);
        } else {
            trimmed = trimmed.replace(/\bprint\s*\(/g, 'vortex.print(');
            if (!/[;{}]\s*$/.test(trimmed)) trimmed += ';';
            output.push(trimmed);
        }
    }

    while (indentStack.length > 1) {
        output.push('}');
        indentStack.pop();
    }

    return output.join('\n');
}

// Descobre os nomes de todas as funções definidas no nível raiz do script
// (usado pra permitir que botões colocados no mapa chamem uma função por nome).
function extractVortexTopLevelFunctions(code) {
    const names = [];
    const lines = code.split('\n');
    for (let raw of lines) {
        const line = raw.split('#')[0];
        if (line.trim() === '') continue;
        const indent = raw.match(/^\s*/)[0].replace(/\t/g, '    ').length;
        if (indent !== 0) continue;
        const m = line.trim().match(/^def\s+(\w+)\s*\(.*\)\s*:$/);
        if (m) names.push(m[1]);
    }
    return names;
}

// Compila o código Vortex e devolve uma função (vortexAPI) => { _ready, _update, functions }
function compileVortexScript(code) {
    code = code || '';
    const jsCode = transpileVortexToJS(code);
    const functionNames = extractVortexTopLevelFunctions(code);
    const exportEntries = functionNames
        .map(n => `${JSON.stringify(n)}: (typeof ${n} === 'function' ? ${n} : null)`)
        .join(', ');

    const rawFactory = new Function('vortex', 'str', 'int', 'float', 'len', `
        "use strict";
        ${jsCode}
        return {
            _ready: typeof _ready === 'function' ? _ready : null,
            _update: typeof _update === 'function' ? _update : null,
            functions: { ${exportEntries} }
        };
    `);

    const strFn = (v) => String(v);
    const intFn = (v) => parseInt(v, 10);
    const floatFn = (v) => parseFloat(v);
    const lenFn = (v) => (v == null) ? 0 : (v.length !== undefined ? v.length : Object.keys(v).length);

    return (vortexAPI) => rawFactory(vortexAPI, strFn, intFn, floatFn, lenFn);
}

// ==========================================
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

function makeVortexEntity(inst, type, x, y, w, h, meta = {}) {
    type = type === 'block' ? 'square' : type;
    w = Math.max(1, Number(w || meta.w || TILE_W)); h = Math.max(1, Number(h || meta.h || TILE_H));
    const el = document.createElement('div');
    el.className='runtime-object runtime-'+type;
    Object.assign(el.style,{position:'absolute',left:x+'px',top:y+'px',width:w+'px',height:h+'px',boxSizing:'border-box',background:meta.color || (type==='coin'?'#facc15':type==='player'?'#22c55e':'#8b5cf6'),border:'1px solid rgba(255,255,255,.25)',zIndex:type==='player'?'10':'2'});
    if(type==='circle'||type==='coin') el.style.borderRadius='50%';
    if(type==='triangle') el.style.clipPath='polygon(50% 0%, 100% 100%, 0% 100%)';
    if(type==='coin') el.style.boxShadow='0 0 16px rgba(250,204,21,.55)';
    if(type==='player') el.style.borderRadius='7px';
    const entity={x:Number(x)||0,y:Number(y)||0,w,h,vx:0,vy:0,el,type,shape:type};
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

function toggleEngineTestMode() {
    const btn = document.getElementById('btn-engine-test');
    const editor = document.getElementById('canvas-2d');
    const screen = document.getElementById('engine-test-screen');
    const consoleBox = document.getElementById('engine-console');

    if (screen.style.display === 'none') {
        if (!currentSceneGrid.includes('player')) {
            vortexNotify('Coloque um Player na cena antes de testar.','error');
            return;
        }
        if (consoleBox) { consoleBox.innerHTML = ''; consoleBox.style.display = 'none'; }

        btn.innerText = '🛑 PARAR';
        btn.style.background = '#ef4444';
        editor.style.display = 'none';
        screen.style.display = 'block';

        const activeScript = vortexScripts.find(s => s.id === activeScriptId);
        currentGameInstance = createVortexGameInstance(
            screen,
            currentSceneGrid,
            activeScript ? activeScript.code : '',
            { consoleEl: consoleBox, uiData: currentSceneMeta, transforms: currentSceneTransforms }
        );
        currentGameInstance.start();
    } else {
        stopEngineTestLoop();
        btn.innerText = '▶️ TESTAR';
        btn.style.background = '#22c55e';
        editor.style.display = 'grid';
        screen.style.display = 'none';
    }
}

function stopEngineTestLoop() {
    if (currentGameInstance) {
        currentGameInstance.stop();
        currentGameInstance = null;
    }
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
            loadGlobalStore();
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
    list.innerHTML = '<p>Carregando seus arquivos...</p>';

    database.ref('users/' + currentUser.key + '/files').once('value').then(async filesSnap => {
        list.innerHTML = '';
        if (!filesSnap.exists()) {
            list.innerHTML = '<p>Nenhum executável (.vexe) instalado ainda.</p>';
            return;
        }
        const fileIds = Object.keys(filesSnap.val());
        for (const appId of fileIds) {
            const appSnap = await database.ref('publishedApps/' + appId).once('value');
            if (!appSnap.exists()) continue;
            const app = appSnap.val();
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `<h4>🎮 ${app.title}.vexe</h4><p>Por: ${app.author}</p>`;
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.innerText = 'Executar';
            btn.onclick = () => runVexeApp(app);
            card.appendChild(btn);
            list.appendChild(card);
        }
    }).catch(err => {
        list.innerHTML = '<p>Erro ao carregar arquivos: ' + err.message + '</p>';
    });
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
function saveBrowserHistory(query){
  const q=String(query||'').trim(); if(!q) return;
  vortexBrowserHistory=[q,...vortexBrowserHistory.filter(x=>x!==q)].slice(0,50);
  localStorage.setItem('vortex_browser_history',JSON.stringify(vortexBrowserHistory));
}
function openVortexBrowser(){ openWindow('win-browser'); const input=document.getElementById('vortex-browser-address'); if(input) input.focus(); renderBrowserHistory(); }
function browserNavigate(){
  const input=document.getElementById('vortex-browser-address'); const frame=document.getElementById('vortex-browser-page'); if(!input||!frame)return;
  let q=input.value.trim(); if(!q) return;
  saveBrowserHistory(q);
  if(!/^https?:\/\//i.test(q) && /^[a-z0-9-]+\.vort$/i.test(q)) q='vort://'+q;
  if(/^vort:\/\//i.test(q)){ loadVortSite(q.slice(7).toLowerCase(),frame); return; }
  if(q.toLowerCase()==='vortex.api.vort'){ loadVortexApiSite(frame); return; }
  frame.innerHTML=`<div class="vortex-browser-home"><div class="vortex-browser-logo">Vortex</div><p>Pesquisa interna: <strong>${escapeHTML(q)}</strong></p><small>Digite um endereço .vort para abrir um site Vortex.</small></div>`;
  renderBrowserHistory();
}
function renderBrowserHistory(){
  const box=document.getElementById('vortex-browser-history'); if(!box)return;
  box.innerHTML=vortexBrowserHistory.length?vortexBrowserHistory.map(q=>`<button class="history-item" onclick="document.getElementById('vortex-browser-address').value=${JSON.stringify(q)};browserNavigate()">${escapeHTML(q)}</button>`).join(''):'<span class="muted">Nenhuma pesquisa ainda.</span>';
}
function clearBrowserHistory(){ vortexBrowserHistory=[]; localStorage.setItem('vortex_browser_history','[]'); renderBrowserHistory(); vortexNotify('Histórico limpo.','success'); }
function loadVortSite(domain,frame){
  const slug=domain.replace(/\.vort$/i,'').replace(/[^a-z0-9-]/g,'').toLowerCase();
  if(slug==='vortex-api') return loadVortexApiSite(frame);
  database.ref('vortSites/'+slug).once('value').then(s=>{if(!s.exists()){frame.innerHTML='<div class="vortex-browser-home"><h2>404</h2><p>Este domínio .vort não existe.</p></div>';return;}const site=s.val();frame.innerHTML=site.html||'';const st=document.createElement('style');st.textContent=site.css||'';frame.appendChild(st);if(site.js){const sc=document.createElement('script');sc.textContent=site.js;frame.appendChild(sc);}}).catch(e=>frame.innerHTML='<p>Erro ao abrir site: '+escapeHTML(e.message)+'</p>');
}
function loadVortexApiSite(frame){
  frame.innerHTML=`<div class="api-site"><div class="api-site-hero"><div class="api-site-mark">V</div><div><h1>Vortex API</h1><p>Documentação da linguagem Vortex e da Engine 2D.</p></div></div><div class="api-site-grid"><aside class="api-site-nav"><button onclick="apiSiteJump('comece')">Começando</button><button onclick="apiSiteJump('ciclo')">Ciclo do jogo</button><button onclick="apiSiteJump('input')">Input</button><button onclick="apiSiteJump('movimento')">Movimento</button><button onclick="apiSiteJump('colisao')">Colisão</button><button onclick="apiSiteJump('objetos')">Objetos</button><button onclick="apiSiteJump('camera')">Câmera</button><button onclick="apiSiteJump('ui')">UI</button><button onclick="apiSiteJump('listas')">Listas</button><button onclick="apiSiteJump('exemplo')">Exemplo</button></aside><main class="api-site-content"><section id="comece"><h2>Começando</h2><p>Crie um script .vortex e use <code>_ready()</code> para inicialização e <code>_update()</code> para a lógica por frame.</p><pre>def _ready():\n    print("Jogo iniciado")\n\ndef _update():\n    p = vortex.get_player()\n    if p != None:\n        p.x = p.x + 2</pre></section><section id="ciclo"><h2>Ciclo do jogo</h2><p><code>_ready()</code> roda uma vez. <code>_update()</code> roda continuamente.</p></section><section id="input"><h2>Input</h2><pre>vortex.is_key_down("a")\nvortex.is_key_down("d")\nvortex.is_key_down("space")</pre></section><section id="movimento"><h2>Movimento</h2><pre>vortex.move(player, dx, dy)\nvortex.set_velocity(player, vx, vy)\nvortex.apply_gravity(player, 0.5)\nvortex.move_and_collide(player)</pre></section><section id="colisao"><h2>Colisão</h2><pre>vortex.check_collision(a, b)\nvortex.is_on_floor(player)\nfor bloco in vortex.get_blocks():\n    if vortex.check_collision(player, bloco):\n        pass</pre></section><section id="objetos"><h2>Objetos</h2><pre>vortex.spawn("square", 100, 100)\nvortex.spawn("circle", 200, 100)\nvortex.spawn("triangle", 300, 100)\nvortex.spawn("coin", 400, 100)\nvortex.set_size(obj, 64, 64)\nvortex.set_color(obj, "#a855f7")\nvortex.destroy(obj)</pre></section><section id="camera"><h2>Câmera</h2><pre>vortex.set_camera(x, y)\nvortex.follow_camera(player, 320, 180)</pre></section><section id="ui"><h2>Interface</h2><pre>vortex.create_text("score", "0", 20, 20)\nvortex.set_text("score", "100")\nvortex.create_button("play", "Jogar", 20, 60, iniciar)</pre></section><section id="listas"><h2>Dados</h2><pre>for i in range(10):\n    print(i)\n\nmoedas = [1, 2, 3]\nmoedas.append(4)\nprint(len(moedas))</pre></section><section id="exemplo"><h2>Exemplo: coletar moedas</h2><pre>def _update():\n    p = vortex.get_player()\n    if p == None:\n        return\n    if vortex.is_key_down("d"):\n        p.x = p.x + 4\n    for moeda in vortex.get_coins():\n        if not moeda.collected and vortex.check_collision(p, moeda):\n            vortex.collect_coin(moeda)\n            vortex.add_coins(1)</pre></section></main></div></div>`;
}
function apiSiteJump(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth'});}

// ==========================================
// VORTEX SITE STUDIO (.VORT) — SAVE LOCAL + CLOUD
// ==========================================
function openSiteStudio(){openWindow('win-site-studio'); loadSavedVortSites();}
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
  database.ref('vortSites/'+slug).transaction(old=>{if(old && old.authorKey!==currentUser.key)return;return data;}).then(r=>{if(!r.committed)return vortexNotify('Você não é o dono deste domínio.','error'); localStorage.removeItem(siteDraftKey()); vortexNotify('Site publicado/atualizado em '+slug+'.vort','success'); loadSavedVortSites();}).catch(e=>vortexNotify('Erro: '+e.message,'error'));
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
