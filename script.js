// ==========================================
// 🌀 VORTEX OS - SCRIPT PRINCIPAL (compatível com index.html)
// ==========================================
const OS_VERSION = "9.5";

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
let currentUser = null;       // { username, pin, email, balance, createdAt, lastDaily }
let highestZIndex = 100;
let openApps = new Set();
let clockInterval = null;

let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill(''); // grid 20x12

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

    if (!username) {
        alert('⚠️ Digite um nome de usuário.');
        return;
    }
    if (!/^\d{4}$/.test(pin)) {
        alert('⚠️ O PIN deve ter exatamente 4 dígitos numéricos.');
        return;
    }

    // Sanitiza o nome de usuário para usar como chave no Firebase
    const userKey = username.toLowerCase().replace(/[.#$/\[\]]/g, '_');
    const userRef = database.ref('users/' + userKey);

    const loginBtn = document.querySelector('#login-screen .btn-primary');
    if (loginBtn) { loginBtn.disabled = true; loginBtn.innerText = 'Verificando...'; }

    userRef.once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                // USUÁRIO JÁ EXISTE -> tenta logar
                const data = snapshot.val();
                if (data.pin === pin) {
                    startSession(userKey, data);
                } else {
                    alert('❌ PIN incorreto para o usuário "' + username + '".');
                }
            } else {
                // USUÁRIO NÃO EXISTE -> cadastra automaticamente
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
                    alert('✅ Conta criada com sucesso! Bem-vindo(a), ' + username + '.');
                });
            }
        })
        .catch(err => {
            console.error(err);
            alert('❌ Erro de conexão com o Firebase: ' + err.message);
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

    startClock();
    loadGlobalStore();
    loadUserFiles();
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
}

function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
    if (currentUser) {
        // Já tem sessão válida, volta direto pro desktop
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
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.style.display = 'none';
    openApps.delete(id);
    removeTaskbarButton(id);
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
        if (w.style.display === 'none') {
            w.style.display = 'flex';
        }
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

// Fecha o menu iniciar se clicar fora dele
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

// Aplica tema salvo ao carregar
(function restoreTheme() {
    const saved = localStorage.getItem('vortex_theme');
    if (saved) {
        window.addEventListener('DOMContentLoaded', () => setTheme(saved));
    }
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

function claimDailyReward() {
    if (!currentUser) return alert('Faça login primeiro.');
    const now = Date.now();
    const last = currentUser.lastDaily || 0;
    const oneDay = 1000 * 60 * 60 * 24;

    if (now - last < oneDay) {
        const horasRestantes = Math.ceil((oneDay - (now - last)) / (1000 * 60 * 60));
        alert(`⏳ Você já coletou sua recompensa diária. Volte em ~${horasRestantes}h.`);
        return;
    }

    addBalance(10).then(() => {
        currentUser.lastDaily = now;
        database.ref('users/' + currentUser.key + '/lastDaily').set(now);
        alert('🎁 Você recebeu R$ 10,00 de recompensa diária!');
    }).catch(err => alert('Erro: ' + err));
}

function simulateIncomingPix() {
    if (!currentUser) return alert('Faça login primeiro.');
    const valor = Math.floor(Math.random() * 41) + 10; // R$10 a R$50
    addBalance(valor).then(() => {
        alert(`💸 Você recebeu um Pix simulado de R$ ${valor.toFixed(2)}!`);
    }).catch(err => alert('Erro: ' + err));
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
            output.innerHTML += 'Comandos: help, clear, whoami, balance, date, apps, shutdown';
            break;
        case 'clear':
            output.innerHTML = '';
            break;
        case 'whoami':
            output.innerHTML += currentUser ? currentUser.displayName || currentUser.key : 'Nenhum usuário logado';
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
    const display = document.getElementById('calc-display');
    display.value += val;
}

function calcEval() {
    const display = document.getElementById('calc-display');
    try {
        // Apenas dígitos e operadores básicos são permitidos
        if (!/^[0-9+\-*/.\s]+$/.test(display.value)) throw new Error('Entrada inválida');
        display.value = String(Function('"use strict";return (' + display.value + ')')());
    } catch (e) {
        display.value = 'Erro';
    }
}

// ==========================================
// 10. VORTEX ENGINE 2D
// ==========================================
let mapCanvasInitialized = false;

function initMapCanvasOnce() {
    if (mapCanvasInitialized) return;
    const canvas = document.getElementById('canvas-2d');
    if (!canvas) return;

    canvas.style.display = 'grid';
    canvas.style.gridTemplateColumns = 'repeat(20, 1fr)';
    canvas.style.gridTemplateRows = 'repeat(12, 1fr)';
    canvas.style.gap = '1px';
    canvas.style.background = '#000';

    canvas.innerHTML = '';
    for (let i = 0; i < 240; i++) {
        const tile = document.createElement('div');
        tile.dataset.index = i;
        tile.style.display = 'flex';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.style.background = '#111';
        tile.style.cursor = 'crosshair';
        tile.style.fontSize = '1.1rem';
        tile.style.userSelect = 'none';
        tile.onmousedown = () => applyTool(i, tile);
        tile.onmouseenter = (e) => { if (e.buttons === 1) applyTool(i, tile); };
        canvas.appendChild(tile);
    }
    mapCanvasInitialized = true;
}

function setTileMode(mode) {
    currentTileMode = mode;
    const inspector = document.getElementById('inspector-content');
    if (inspector) inspector.innerText = `Ferramenta ativa: ${mode}. Clique e arraste na cena para pintar.`;
}

function applyTool(index, tileElement) {
    if (currentTileMode === 'player') {
        const oldIdx = currentSceneGrid.indexOf('player');
        if (oldIdx !== -1) {
            currentSceneGrid[oldIdx] = '';
            const oldTile = document.querySelector(`#canvas-2d [data-index='${oldIdx}']`);
            if (oldTile) oldTile.innerText = '';
        }
    }
    currentSceneGrid[index] = currentTileMode === 'erase' ? '' : currentTileMode;
    renderTile(tileElement, currentSceneGrid[index]);
}

function renderTile(tile, mode) {
    tile.innerText = '';
    if (mode === 'block') tile.innerText = '🧱';
    if (mode === 'coin') tile.innerText = '🪙';
    if (mode === 'player') tile.innerText = '👾';
}

function addHierarchyItem(type) {
    const tree = document.getElementById('hierarchy-tree');
    if (!tree) return;

    const icons = { square: '🧱', coin: '🪙', script: '📜' };
    const labels = { square: 'Bloco Solido', coin: 'Item Moeda', script: 'Script.js' };

    const li = document.createElement('li');
    li.innerText = `${icons[type] || '❔'} ${labels[type] || type} #${tree.children.length + 1}`;
    li.style.cursor = 'pointer';
    li.onclick = () => {
        const inspector = document.getElementById('inspector-content');
        if (inspector) inspector.innerText = `Item selecionado: ${li.innerText}`;
    };
    tree.appendChild(li);
}

// ==========================================
// 11. PUBLICAÇÃO (.vexe) E LOJA GLOBAL
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
    if (!currentUser) return alert('Faça login primeiro.');

    const title = document.getElementById('app-title-input').value.trim();
    const price = Number(document.getElementById('app-price-input').value) || 0;

    if (!title) return alert('⚠️ Dê um nome ao seu jogo antes de publicar.');
    if (!currentSceneGrid.includes('player')) return alert('⚠️ Coloque um Player (👾) na cena antes de publicar.');

    const appId = 'app_' + Date.now();
    const appData = {
        title,
        price,
        author: currentUser.displayName || currentUser.key,
        authorKey: currentUser.key,
        mapData: currentSceneGrid,
        createdAt: Date.now()
    };

    database.ref('publishedApps/' + appId).set(appData)
        .then(() => database.ref('users/' + currentUser.key + '/files/' + appId).set(true))
        .then(() => {
            alert(`🚀 "${title}" foi compilado e publicado com sucesso!`);
            closePublishModal();
            loadGlobalStore();
            loadUserFiles();
        })
        .catch(err => alert('Erro ao publicar: ' + err.message));
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
    if (!currentUser) return alert('Faça login primeiro.');
    if (Number(currentUser.balance || 0) < Number(app.price || 0)) {
        return alert('❌ Saldo insuficiente para comprar este jogo.');
    }

    addBalance(-Number(app.price || 0)).then(() => {
        return database.ref('users/' + currentUser.key + '/files/' + appId).set(true);
    }).then(() => {
        alert(`✅ "${app.title}" adicionado aos seus arquivos!`);
        loadUserFiles();
    }).catch(err => alert('Erro na compra: ' + err.message));
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

function runVexeApp(app) {
    openWindow('win-runner');
    document.getElementById('runner-title').innerText = `🎮 Executando: ${app.title}.vexe`;
    const canvas = document.getElementById('runner-canvas');
    canvas.innerHTML = '';
    canvas.style.display = 'grid';
    canvas.style.gridTemplateColumns = 'repeat(20, 1fr)';
    canvas.style.gridTemplateRows = 'repeat(12, 1fr)';
    canvas.style.gap = '1px';
    canvas.style.background = '#000';

    (app.mapData || []).forEach(type => {
        const tile = document.createElement('div');
        tile.style.display = 'flex';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'center';
        tile.style.background = '#111';
        if (type === 'block') tile.innerText = '🧱';
        if (type === 'coin') tile.innerText = '🪙';
        if (type === 'player') tile.innerText = '👾';
        canvas.appendChild(tile);
    });
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    tryAutoLogin();

    // Permite logar pressionando Enter no campo de PIN
    const pinInput = document.getElementById('auth-pin');
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginUser();
        });
    }
});
