// ==========================================
// 🌀 VORTEX OS - VERSÃO 8.5 (STABLE BUILD)
// ==========================================
const OS_VERSION = "9.0";

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc",
    storageBucket: "vortex-os-971fc.firebasestorage.app",
    messagingSenderId: "128698321803",
    appId: "1:128698321803:web:fa6ad595d268980019bd8e",
    measurementId: "G-387R68F77S"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// INJEÇÃO AUTOMÁTICA DE ESTILOS CSS DA V8.5
(function initV85EngineAndStyles() {
    document.title = `Vortex ${OS_VERSION}`;

    const style = document.createElement('style');
    style.innerHTML = `
        /* ESTILOS DE JANELAS (SISTEMA ESTILO WINDOWS) */
        .window.minimized { display: none !important; }
        .window.maximized { top: 0 !important; left: 0 !important; width: 100vw !important; height: calc(100vh - 45px) !important; border-radius: 0 !important; z-index: 9999 !important; }
        
        .window-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(30, 27, 75, 0.9); cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none; }
        .window-controls { display: flex; gap: 4px; }
        .window-controls button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
        .window-controls button:hover { background: rgba(255,255,255,0.25); }
        .window-controls button.btn-close:hover { background: #ef4444; }

        /* SCROLL E GRID NA LOJA */
        .apps-grid { max-height: 330px !important; overflow-y: auto !important; padding-right: 5px; }
        .apps-grid::-webkit-scrollbar { width: 6px; }
        .apps-grid::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 4px; }

        /* ENGINE CANVAS FIXED GRID */
        #canvas-2d { display: grid !important; grid-template-columns: repeat(20, 1fr) !important; grid-template-rows: repeat(12, 1fr) !important; gap: 2px !important; background: #0f172a !important; padding: 4px; border: 1px solid #a78bfa; }
        .tile { display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0.9rem !important; cursor: pointer; min-height: 24px; background: #1e1b4b; border: 1px solid rgba(255,255,255,0.05); user-select: none; }
        .tile:hover { border-color: #a855f7; }

        .task-app.active-task { background: rgba(168, 85, 247, 0.4) !important; border-bottom: 2px solid #c084fc; }
        .admin-btn { background: linear-gradient(135deg, #ef4444, #b91c1c) !important; color: white !important; font-weight: bold; border-radius: 4px; padding: 6px 12px; cursor: pointer; margin-bottom: 5px; }
    `;
    document.head.appendChild(style);
})();

// ==========================================
// 1. SISTEMA DE GERENCIAMENTO DE JANELAS (WINDOWS-LIKE)
// ==========================================
let highestZIndex = 100;
let openApps = new Set();

function openWindow(id) {
    if (id === 'win-vscode') createVSCodeDOM();
    if (id === 'win-admin') createAdminWindowDOM();

    const win = document.getElementById(id);
    if (!win) return;

    win.classList.remove('minimized');
    win.classList.add('active');
    win.style.display = 'flex';
    
    bringToFront(win);
    openApps.add(id);
    updateTaskbar();
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.remove('active', 'maximized', 'minimized');
        win.style.display = 'none';
    }
    openApps.delete(id);
    updateTaskbar();
}

function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.add('minimized');
        win.style.display = 'none';
    }
    updateTaskbar();
}

function toggleMaximizeWindow(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.toggle('maximized');
    }
}

function toggleWindowFromTaskbar(id) {
    const win = document.getElementById(id);
    if (!win) return;

    if (win.style.display === 'none' || win.classList.contains('minimized')) {
        win.classList.remove('minimized');
        win.style.display = 'flex';
        bringToFront(win);
    } else if (parseInt(win.style.zIndex) === highestZIndex) {
        minimizeWindow(id);
    } else {
        bringToFront(win);
    }
    updateTaskbar();
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
    updateTaskbar();
}

function updateTaskbar() {
    const taskbar = document.getElementById('taskbar-apps');
    if (!taskbar) return;
    taskbar.innerHTML = '';
    
    const names = {
        'win-engine': '⚡ Engine', 'win-store': '🛒 Loja', 'win-files': '📁 Arquivos',
        'win-settings': '⚙️ Config', 'win-terminal': '💻 Terminal', 'win-calc': '🧮 Calc',
        'win-runner': '🎮 Runner', 'win-admin': '👑 Admin', 'win-vscode': '📝 VS Code'
    };

    openApps.forEach(id => {
        const win = document.getElementById(id);
        const isFocused = win && win.style.display !== 'none' && parseInt(win.style.zIndex) === highestZIndex;
        
        const btn = document.createElement('button');
        btn.className = `task-app ${isFocused ? 'active-task' : ''}`;
        btn.innerText = names[id] || id;
        btn.onclick = () => toggleWindowFromTaskbar(id);
        taskbar.appendChild(btn);
    });
}

function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);
    let pos1 = 0, pos2 = 0, pos3 = e.clientX, pos4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (e) => {
        if (win.classList.contains('maximized')) return;
        e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        win.style.top = (win.offsetTop - pos2) + "px";
        win.style.left = (win.offsetLeft - pos1) + "px";
    };
}

setInterval(() => {
    const clock = document.getElementById('os-clock');
    if (clock) clock.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

// ==========================================
// 2. AUTENTICAÇÃO E PAINEL ADMIN
// ==========================================
let currentUser = null;
let authMode = 'login';
let lastGlobalRestart = 0;

database.ref('system').on('value', (snapshot) => {
    const sysData = snapshot.val() || {};
    
    let maintOverlay = document.getElementById('maintenance-screen');
    if (sysData.maintenance) {
        if (!maintOverlay) {
            maintOverlay = document.createElement('div');
            maintOverlay.id = 'maintenance-screen';
            maintOverlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#111; color:#ff4757; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:999999; text-align:center;";
            maintOverlay.innerHTML = `<h1>🚧 VORTEX OS EM MANUTENÇÃO 🚧</h1><p style="color:#ccc; margin-top:10px;">O sistema está sob manutenção técnica temporária.</p>`;
            document.body.appendChild(maintOverlay);
        }
        maintOverlay.style.display = 'flex';
    } else if (maintOverlay) {
        maintOverlay.style.display = 'none';
    }

    if (sysData.restart_trigger && sysData.restart_trigger > lastGlobalRestart) {
        if (lastGlobalRestart !== 0) {
            alert("💥 Reinicialização global enviada pelo Administrador!");
            location.reload();
        }
        lastGlobalRestart = sysData.restart_trigger;
    }
});

function renderAuthUI() {
    const card = document.querySelector('.auth-card');
    if (!card) return;

    if (authMode === 'login') {
        card.innerHTML = `
            <div class="auth-header">
                <h2>🌀 Vortex OS v${OS_VERSION}</h2>
                <p>Acesse sua conta</p>
            </div>
            <div class="auth-form" style="display:flex; flex-direction:column; gap:10px;">
                <input type="text" id="auth-username" placeholder="Nome de Usuário" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <input type="password" id="auth-pin" placeholder="PIN (4 dígitos)" maxlength="4" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <button class="btn btn-primary" onclick="handleAuthSubmit()" style="padding:10px; background:#a855f7; border:none; color:#fff; font-weight:bold; border-radius:6px; cursor:pointer;">Entrar no Vortex OS</button>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-top:5px;">
                    <a href="#" onclick="setAuthMode('register')" style="color:#c084fc; text-decoration:none;">✨ Criar Conta</a>
                    <a href="#" onclick="setAuthMode('recover')" style="color:#a78bfa; text-decoration:none;">🔑 Esqueci o PIN</a>
                </div>
            </div>
        `;
    } else if (authMode === 'register') {
        card.innerHTML = `
            <div class="auth-header">
                <h2>✨ Criar Conta</h2>
                <p>Cadastre-se no Vortex OS</p>
            </div>
            <div class="auth-form" style="display:flex; flex-direction:column; gap:10px;">
                <input type="text" id="auth-username" placeholder="Novo Usuário" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <input type="password" id="auth-pin" placeholder="Crie um PIN (4 dígitos)" maxlength="4" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <input type="email" id="auth-email" placeholder="E-mail (Opcional p/ recuperar)" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <button class="btn btn-primary" onclick="handleAuthSubmit()" style="padding:10px; background:#a855f7; border:none; color:#fff; font-weight:bold; border-radius:6px; cursor:pointer;">Cadastrar e Entrar</button>
                <div style="text-align:center; font-size:0.8rem; margin-top:5px;">
                    <a href="#" onclick="setAuthMode('login')" style="color:#c084fc; text-decoration:none;">Já tem uma conta? Entrar</a>
                </div>
            </div>
        `;
    }
}

function setAuthMode(mode) { authMode = mode; renderAuthUI(); }

function handleAuthSubmit() {
    const usernameInput = document.getElementById('auth-username');
    const pinInput = document.getElementById('auth-pin');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (authMode === 'register') {
        if (!username || !pin) return alert("Preencha Usuário e PIN!");
        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) return alert("❌ Usuário já existe!");
            const newUser = { username, pin, balance: 50.00 };
            database.ref('users/' + username).set(newUser).then(() => loginSuccess(newUser));
        });
    } else if (authMode === 'login') {
        if (!username || !pin) return alert("Digite Usuário e PIN!");
        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists() && snapshot.val().pin === pin) {
                loginSuccess(snapshot.val());
            } else {
                alert("❌ Credenciais incorretas!");
            }
        });
    }
}

function loginSuccess(userData) {
    currentUser = userData;
    userBalance = userData.balance !== undefined ? parseFloat(userData.balance) : 50.00;

    document.getElementById('start-username').innerText = currentUser.username;
    updateBalanceUI();
    document.getElementById('login-screen').style.display = 'none';

    if (currentUser.username.toLowerCase() === 'rip_fallenhero') {
        enableAdminPowers();
    }
    loadGlobalStore();
}

function enableAdminPowers() {
    createAdminWindowDOM();
    const startBody = document.querySelector('.start-body');
    if (startBody && !document.getElementById('admin-start-btn')) {
        const btn = document.createElement('button');
        btn.id = 'admin-start-btn';
        btn.className = 'admin-btn';
        btn.innerHTML = '👑 PAINEL ADMIN';
        btn.onclick = () => { toggleStartMenu(); openWindow('win-admin'); };
        startBody.insertBefore(btn, startBody.firstChild);
    }
}

function createAdminWindowDOM() {
    if (document.getElementById('win-admin')) return;

    const win = document.createElement('div');
    win.id = 'win-admin';
    win.className = 'window';
    win.style.cssText = "top: 60px; left: 150px; width: 450px; height: 380px; display:none; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-admin')">
            <span>👑 Painel de Admin Geral</span>
            <div class="window-controls">
                <button onclick="minimizeWindow('win-admin')">➖</button>
                <button onclick="toggleMaximizeWindow('win-admin')">🔲</button>
                <button class="btn-close" onclick="closeWindow('win-admin')">❌</button>
            </div>
        </div>
        <div class="window-body" style="display:flex; flex-direction:column; gap:12px; padding:15px; background:#12002b;">
            <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; padding:10px; border-radius:6px;">
                <h4 style="color:#ef4444;">Modo Super Admin Ativo</h4>
                <p style="font-size:0.75rem; color:#ccc;">Usuário: Rip_FallenHero</p>
            </div>
            <button class="btn" style="background:#22c55e; color:#000; font-weight:bold;" onclick="adminGiveInfiniteMoney()">💰 Dinheiro Infinito (+R$ 999M)</button>
            <button class="btn" style="background:#eab308; color:#000; font-weight:bold;" onclick="adminToggleMaintenance()">🚧 Alternar Manutenção Global</button>
            <button class="btn" style="background:#3b82f6; color:#fff; font-weight:bold;" onclick="adminGlobalRestart()">💥 Reiniciar PC de Geral Globalmente</button>
            <hr style="border-color:rgba(255,255,255,0.1);">
            <button class="btn" style="background:#dc2626; color:#fff; font-weight:bold;" onclick="adminClearEntireDatabase()">🧹 ZERAR BANCO DE DADOS COMPLETO</button>
        </div>
    `;
    document.body.appendChild(win);
}

function adminGiveInfiniteMoney() {
    userBalance += 999999999.00;
    updateBalanceUI();
    alert("💰 R$ 999.999.999,00 adicionados!");
}

function adminToggleMaintenance() {
    database.ref('system/maintenance').once('value', (snap) => {
        const current = snap.val() || false;
        database.ref('system/maintenance').set(!current);
        alert(`🚧 Manutenção alterada para: ${!current ? 'ATIVADA' : 'DESATIVADA'}`);
    });
}

function adminGlobalRestart() {
    if (confirm("Reiniciar PC de todo mundo online?")) {
        database.ref('system/restart_trigger').set(Date.now());
    }
}

function adminClearEntireDatabase() {
    if (confirm("🚨 Apagar todos os dados da nuvem?")) {
        database.ref().remove().then(() => { location.reload(); });
    }
}

// ==========================================
// 3. ENGINE 2D (FIX DE VISUALIZAÇÃO DOS BLOCOS)
// ==========================================
let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill('');

function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    if (!canvas) return;
    canvas.innerHTML = '';

    for (let i = 0; i < 240; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i;

        applyTileStyle(tile, currentSceneGrid[i]);

        tile.onclick = () => {
            currentSceneGrid[i] = currentTileMode === 'erase' ? '' : currentTileMode;
            applyTileStyle(tile, currentSceneGrid[i]);
        };
        canvas.appendChild(tile);
    }
}

function applyTileStyle(tile, mode) {
    tile.className = 'tile';
    tile.style.backgroundColor = '';
    tile.style.borderRadius = '0';
    
    if (mode === 'block') {
        tile.style.backgroundColor = '#8b5cf6';
        tile.style.border = '1px solid #a78bfa';
        tile.innerText = '🧱';
    } else if (mode === 'coin') {
        tile.style.backgroundColor = '#eab308';
        tile.style.borderRadius = '50%';
        tile.innerText = '🪙';
    } else if (mode === 'player') {
        tile.style.backgroundColor = '#22c55e';
        tile.style.borderRadius = '4px';
        tile.innerText = '👾';
    } else {
        tile.innerText = '';
        tile.style.border = '1px solid rgba(255,255,255,0.05)';
    }
}

function setTileMode(mode) { currentTileMode = mode; }

// ==========================================
// 4. VORTEX CODE STUDIO (VS CODE) & API DOCS
// ==========================================
function createVSCodeDOM() {
    if (document.getElementById('win-vscode')) return;

    const win = document.createElement('div');
    win.id = 'win-vscode';
    win.className = 'window';
    win.style.cssText = "top: 60px; left: 160px; width: 680px; height: 460px; display:none; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-vscode')">
            <span>📝 Vortex Code Studio (Editor & API .vortex)</span>
            <div class="window-controls">
                <button onclick="minimizeWindow('win-vscode')">➖</button>
                <button onclick="toggleMaximizeWindow('win-vscode')">🔲</button>
                <button class="btn-close" onclick="closeWindow('win-vscode')">❌</button>
            </div>
        </div>
        <div class="window-body" style="display:flex; flex:1; background:#1e1e1e; color:#d4d4d4;">
            <!-- SIDEBAR API DOCS -->
            <div style="width:200px; background:#252526; border-right:1px solid #333; padding:10px; font-size:0.75rem; overflow-y:auto;">
                <h4 style="color:#a78bfa; margin-bottom:8px;">📖 API Vortex Script</h4>
                <p><strong>Comandos da Engine:</strong></p>
                <code style="color:#4ec9b0;">vortex.print(msg)</code><br>
                <code style="color:#4ec9b0;">vortex.createTile(x,y,type)</code><br>
                <code style="color:#4ec9b0;">vortex.onUpdate(fn)</code><br><br>
                <p><strong>Jogador & Economia:</strong></p>
                <code style="color:#ce9178;">vortex.player.move(dx,dy)</code><br>
                <code style="color:#ce9178;">vortex.giveMoney(amount)</code><br>
                <code style="color:#ce9178;">vortex.getScore()</code>
            </div>

            <!-- EDITOR AREA -->
            <div style="flex:1; display:flex; flex-direction:column; padding:10px; gap:8px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="text" id="vortex-filename" placeholder="nome_do_script" value="meu_script" style="padding:4px 8px; background:#2d2d2d; border:1px solid #444; color:#fff; border-radius:4px; font-family:monospace;">
                    <span style="color:#a78bfa; font-weight:bold;">.vortex</span>
                    <button class="btn btn-primary" onclick="saveVortexScriptFile()" style="margin-left:auto;">💾 Salvar Arquivo</button>
                </div>
                <textarea id="vortex-code-editor" style="flex:1; background:#181818; color:#9cdcfe; font-family:monospace; padding:10px; border:1px solid #333; outline:none; resize:none; font-size:0.85rem;" placeholder="// Linguagem Vortex Script v1.0&#10;vortex.onUpdate(() => {&#10;   vortex.print('Vortex Engine Ativa!');&#10;});"></textarea>
            </div>
        </div>
    `;
    document.body.appendChild(win);

    const desktop = document.getElementById('desktop');
    if (desktop && !document.getElementById('icon-vscode')) {
        const icon = document.createElement('div');
        icon.id = 'icon-vscode';
        icon.className = 'desktop-icon';
        icon.onclick = () => openWindow('win-vscode');
        icon.innerHTML = `<div class="icon-img">📝</div><span>VS Code</span>`;
        desktop.appendChild(icon);
    }
}

function saveVortexScriptFile() {
    const nameInput = document.getElementById('vortex-filename').value.trim();
    const code = document.getElementById('vortex-code-editor').value;

    if (!nameInput) return alert("Digite um nome para o arquivo!");

    const fileName = `${nameInput.toLowerCase().replace(/\s+/g, '_')}.vortex`;
    installedFiles.push({ title: nameInput, filename: fileName, type: 'vortex', code: code });
    localStorage.setItem('vortex_installed_files', JSON.stringify(installedFiles));
    renderFileManager();
    alert(`📄 Arquivo "${fileName}" salvo!`);
}

// ==========================================
// 5. LOJA GLOBAL E GERENCIADOR DE ARQUIVOS
// ==========================================
let installedFiles = JSON.parse(localStorage.getItem('vortex_installed_files')) || [];

function loadGlobalStore() {
    const container = document.getElementById('global-apps-list');
    if (!container) return;

    database.ref('global_apps').on('value', (snapshot) => {
        container.innerHTML = '';
        const data = snapshot.val();
        if (!data) return container.innerHTML = '<p>Nenhum jogo na nuvem ainda.</p>';

        Object.keys(data).forEach(key => {
            const app = data[key];
            const isOwner = currentUser && (app.author === currentUser.username || currentUser.username.toLowerCase() === 'rip_fallenhero');
            
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h4>🎮 ${app.title}</h4>
                <p><small>Build: ${app.filename || 'app.vexe'}</small></p>
                <p><small>Por: ${app.author}</small></p>
                <p style="color:#22c55e;"><strong>R$ ${app.price.toFixed(2)}</strong></p>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-primary" style="flex:1;" onclick="buyAndInstallApp('${app.title}', '${app.filename}', ${app.price}, '${key}')">🛒 Baixar</button>
                    ${isOwner ? `<button class="btn" style="background:#dc2626;" onclick="removeAppFromStore('${key}', '${app.title}')">🗑️</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    });
}

function removeAppFromStore(key, title) {
    if (confirm(`Remover "${title}" da Loja Global?`)) {
        database.ref('global_apps/' + key).remove().then(() => alert(`🗑️ Jogo removido!`));
    }
}

function buyAndInstallApp(title, filename, price, appKey) {
    if (userBalance < price) return alert("❌ Saldo insuficiente!");

    userBalance -= price;
    updateBalanceUI();

    database.ref('global_apps/' + appKey).once('value', (snapshot) => {
        const appData = snapshot.val();
        installedFiles.push(appData);
        localStorage.setItem('vortex_installed_files', JSON.stringify(installedFiles));
        renderFileManager();
        alert(`🎉 App "${appData.filename}" instalado!`);
    });
}

function renderFileManager() {
    const container = document.getElementById('files-list');
    if (!container) return;
    container.innerHTML = '';

    if (installedFiles.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem; color:#888;">Nenhum arquivo instalado.</p>';
        return;
    }

    installedFiles.forEach((file, index) => {
        const isVortex = file.filename && file.filename.endsWith('.vortex');
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div><strong>${isVortex ? '📝' : '📄'} ${file.filename || file.title + '.vexe'}</strong></div>
            <div style="font-size: 0.75rem; color: #a78bfa;">Tipo: ${isVortex ? 'Vortex Script' : 'Executável Engine'}</div>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button class="btn btn-primary" style="flex:1;" onclick="${isVortex ? `openVortexScriptInEditor(${index})` : `runVexeGame(${index})`}">${isVortex ? '✏️ Editar' : '▶️ Executar'}</button>
                <button class="btn" style="background:#dc2626;" onclick="uninstallFile(${index})">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openVortexScriptInEditor(index) {
    const file = installedFiles[index];
    if (!file) return;
    openWindow('win-vscode');
    document.getElementById('vortex-filename').value = file.title || 'script';
    document.getElementById('vortex-code-editor').value = file.code || '';
}

function uninstallFile(index) {
    installedFiles.splice(index, 1);
    localStorage.setItem('vortex_installed_files', JSON.stringify(installedFiles));
    renderFileManager();
}

function runVexeGame(index) {
    const file = installedFiles[index];
    if (!file || !file.sceneData) return alert("Erro ao carregar os dados!");

    document.getElementById('runner-title').innerText = `🎮 Executando: ${file.title}`;
    const canvas = document.getElementById('runner-canvas');
    canvas.innerHTML = '';

    file.sceneData.forEach(tileClass => {
        const tile = document.createElement('div');
        applyTileStyle(tile, tileClass);
        canvas.appendChild(tile);
    });

    openWindow('win-runner');
}

// ==========================================
// 6. ECONOMIA, TERMINAL & CALCULADORA
// ==========================================
let userBalance = 0.00;

function updateBalanceUI() {
    const el = document.getElementById('user-balance');
    if (el) el.innerText = userBalance.toFixed(2);
    if (currentUser) {
        database.ref('users/' + currentUser.username).update({ balance: userBalance });
    }
}

function toggleStartMenu() {
    document.getElementById('start-menu').classList.toggle('active');
}

function calcInput(v) { 
    const display = document.getElementById('calc-display');
    if (display) display.value += v; 
}

function calcEval() {
    const display = document.getElementById('calc-display');
    if (!display || !display.value.trim()) return;
    try {
        display.value = Function('"use strict"; return (' + display.value + ')')();
    } catch (e) {
        display.value = "Erro";
        setTimeout(() => { display.value = ''; }, 1200);
    }
}

function handleTerminal(e) {
    if (e.key === 'Enter') {
        const input = e.target;
        const out = document.getElementById('terminal-output');
        out.innerHTML += `> ${input.value}<br>`;
        if (input.value === 'clear') out.innerHTML = '';
        else if (input.value === 'help') out.innerHTML += `Comandos: clear, help, version<br>`;
        else if (input.value === 'version') out.innerHTML += `Vortex OS Kernel v${OS_VERSION}<br>`;
        else out.innerHTML += `Comando não reconhecido.<br>`;
        input.value = '';
    }
}

// INICIALIZAÇÃO
window.onload = () => {
    renderAuthUI();
    initMapCanvas();
    createVSCodeDOM();
    loadGlobalStore();
    renderFileManager();
};
