// ==========================================
// 🌀 VORTEX OS - VERSÃO 8.5
// ==========================================
const OS_VERSION = "8.5";

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

// INJEÇÃO AUTOMÁTICA DE ESTILOS E COMPONENTES VISUAIS DA V8.5
(function initV85EngineAndStyles() {
    document.title = `Vortex ${OS_VERSION}`;

    const style = document.createElement('style');
    style.innerHTML = `
        /* SCROLL NA LOJA */
        .apps-grid { max-height: 330px !important; overflow-y: auto !important; padding-right: 5px; }
        .apps-grid::-webkit-scrollbar { width: 6px; }
        .apps-grid::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 4px; }

        /* VISUALIZAÇÃO DOS BLOCOS 2D */
        .grid-canvas { display: grid !important; grid-template-columns: repeat(20, 1fr) !important; grid-template-rows: repeat(12, 1fr) !important; gap: 1px !important; background: #000 !important; }
        .tile { display: flex !important; align-items: center !important; justify-content: center !important; font-size: 0.9rem !important; cursor: pointer; min-height: 25px; border: 1px solid rgba(255,255,255,0.05); }
        .tile-block { background-color: #8b5cf6 !important; border: 1px solid #a78bfa !important; }
        .tile-coin { background-color: #eab308 !important; border-radius: 50% !important; }
        .tile-player { background-color: #22c55e !important; border-radius: 4px !important; }
        
        .tree-item.selected { background: #a855f7 !important; color: #fff !important; font-weight: bold; }
        .admin-btn { background: linear-gradient(135deg, #ef4444, #b91c1c) !important; color: white !important; font-weight: bold; border-radius: 4px; padding: 6px 12px; cursor: pointer; margin-bottom: 5px; }
    `;
    document.head.appendChild(style);
})();

// ==========================================
// 1. AUTENTICAÇÃO E PAINEL ADMIN FIX
// ==========================================
let currentUser = null;
let authMode = 'login';
let lastGlobalRestart = 0;

// OUVINTE EM TEMPO REAL (MANUTENÇÃO E RESTART)
database.ref('system').on('value', (snapshot) => {
    const sysData = snapshot.val() || {};
    
    let maintOverlay = document.getElementById('maintenance-screen');
    if (sysData.maintenance) {
        if (!maintOverlay) {
            maintOverlay = document.createElement('div');
            maintOverlay.id = 'maintenance-screen';
            maintOverlay.className = 'full-overlay';
            maintOverlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#111; color:#ff4757; display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:999999; text-align:center;";
            maintOverlay.innerHTML = `<h1>🚧 VORTEX OS EM MANUTENÇÃO 🚧</h1><p style="color:#ccc; margin-top:10px;">O administrador colocou o sistema em manutenção.</p>`;
            document.body.appendChild(maintOverlay);
        }
        maintOverlay.style.display = 'flex';
    } else if (maintOverlay) {
        maintOverlay.style.display = 'none';
    }

    if (sysData.restart_trigger && sysData.restart_trigger > lastGlobalRestart) {
        if (lastGlobalRestart !== 0) {
            alert("💥 O Administrador reiniciou o sistema globalmente!");
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
    } else if (authMode === 'recover') {
        card.innerHTML = `
            <div class="auth-header">
                <h2>🔑 Recuperar PIN</h2>
                <p>Informe seu Usuário e E-mail</p>
            </div>
            <div class="auth-form" style="display:flex; flex-direction:column; gap:10px;">
                <input type="text" id="auth-username" placeholder="Seu Usuário" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <input type="email" id="auth-email" placeholder="Seu E-mail Cadastrado" style="padding:10px; background:#000; border:1px solid #a78bfa; color:#fff; border-radius:6px; outline:none;">
                <button class="btn btn-primary" onclick="handleAuthSubmit()" style="padding:10px; background:#a855f7; border:none; color:#fff; font-weight:bold; border-radius:6px; cursor:pointer;">Recuperar PIN</button>
                <div style="text-align:center; font-size:0.8rem; margin-top:5px;">
                    <a href="#" onclick="setAuthMode('login')" style="color:#c084fc; text-decoration:none;">Voltar ao Login</a>
                </div>
            </div>
        `;
    }
}

function setAuthMode(mode) { authMode = mode; renderAuthUI(); }

function handleAuthSubmit() {
    const usernameInput = document.getElementById('auth-username');
    const pinInput = document.getElementById('auth-pin');
    const emailInput = document.getElementById('auth-email');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (authMode === 'register') {
        if (!username || !pin) return alert("Preencha Usuário e PIN!");
        if (pin.length !== 4) return alert("O PIN precisa ter 4 dígitos!");

        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) {
                alert("❌ Este nome de usuário já existe!");
            } else {
                const newUser = { username, pin, email: email || "Não informado", balance: 50.00, lastDaily: "" };
                database.ref('users/' + username).set(newUser).then(() => {
                    alert("🎉 Conta criada com sucesso!");
                    loginSuccess(newUser);
                });
            }
        });
    } else if (authMode === 'login') {
        if (!username || !pin) return alert("Digite o Usuário e o PIN!");

        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.pin === pin) {
                    loginSuccess(userData);
                } else {
                    alert("❌ PIN incorreto!");
                }
            } else {
                alert("❌ Usuário não encontrado! Crie uma conta.");
            }
        });
    } else if (authMode === 'recover') {
        if (!username || !email) return alert("Preencha Usuário e E-mail!");

        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
                    alert(`🔑 Seu PIN cadastrado é: ${userData.pin}`);
                    setAuthMode('login');
                } else {
                    alert("❌ O e-mail informado não confere!");
                }
            } else {
                alert("❌ Usuário não encontrado!");
            }
        });
    }
}

function loginSuccess(userData) {
    currentUser = userData;
    userBalance = userData.balance !== undefined ? parseFloat(userData.balance) : 50.00;

    document.getElementById('start-username').innerText = currentUser.username;
    document.getElementById('start-email').innerText = currentUser.email;
    document.getElementById('settings-user').innerText = currentUser.username;
    document.getElementById('settings-email').innerText = currentUser.email;

    updateBalanceUI();
    document.getElementById('login-screen').style.display = 'none';

    // CHECAGEM DE ADMIN PARA RIP_FALLENHERO
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
    alert("👑 PAINEL DE ADMINISTRADOR ATIVADO PARA RIP_FALLENHERO!");
}

function createAdminWindowDOM() {
    if (document.getElementById('win-admin')) return;

    const win = document.createElement('div');
    win.id = 'win-admin';
    win.className = 'window';
    win.style.cssText = "top: 60px; left: 150px; width: 450px; height: 380px; display:none;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-admin')">
            <span>👑 Painel de Admin Geral</span>
            <div class="window-controls"><button onclick="closeWindow('win-admin')">❌</button></div>
        </div>
        <div class="window-body" style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(239, 68, 68, 0.1); border:1px solid #ef4444; padding:10px; border-radius:6px;">
                <h4 style="color:#ef4444;">Modo Administrador Supremod</h4>
                <p style="font-size:0.75rem; color:#ccc;">Logado como: Rip_FallenHero</p>
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
    if (confirm("🚨 Apagar todos os usuários e dados da nuvem?")) {
        database.ref().remove().then(() => { location.reload(); });
    }
}

function shutdownPC() { document.getElementById('shutdown-screen').style.display = 'flex'; }
function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    setAuthMode('login');
}

// ==========================================
// 2. GERENCIAMENTO DO SISTEMA OPERACIONAL
// ==========================================
let highestZIndex = 100;
let openApps = new Set();

function setTheme(theme) {
    const body = document.body;
    if (theme === 'purple') body.style.background = "linear-gradient(135deg, #2e0854, #12002b, #4a154b)";
    if (theme === 'dark-purple') body.style.background = "linear-gradient(135deg, #0f172a, #1e1b4b, #311042)";
    if (theme === 'cyber-blue') body.style.background = "linear-gradient(135deg, #0284c7, #0f172a, #1e1b4b)";
    if (theme === 'sunset') body.style.background = "linear-gradient(135deg, #831843, #312e81, #0f172a)";
}

function toggleStartMenu() {
    document.getElementById('start-menu').classList.toggle('active');
}

function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.classList.add('active');
    bringToFront(win);
    if (!openApps.has(id)) { openApps.add(id); updateTaskbar(); }
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.classList.remove('active');
    openApps.delete(id);
    updateTaskbar();
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
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
        const btn = document.createElement('button');
        btn.className = 'task-app';
        btn.innerText = names[id] || id;
        btn.onclick = () => bringToFront(document.getElementById(id));
        taskbar.appendChild(btn);
    });
}

function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);
    let pos1 = 0, pos2 = 0, pos3 = e.clientX, pos4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (e) => {
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
// 3. ECONOMIA
// ==========================================
let userBalance = 0.00;

function updateBalanceUI() {
    const el = document.getElementById('user-balance');
    if (el) el.innerText = userBalance.toFixed(2);
    if (currentUser) {
        database.ref('users/' + currentUser.username).update({ balance: userBalance });
    }
}

function claimDailyReward() {
    if (!currentUser) return alert("Faça login primeiro!");
    const today = new Date().toDateString();

    if (currentUser.lastDaily === today) {
        return alert("⏳ Você já resgatou sua recompensa diária hoje!");
    }

    userBalance += 25.00;
    currentUser.lastDaily = today;
    updateBalanceUI();
    database.ref('users/' + currentUser.username).update({ balance: userBalance, lastDaily: today });
    alert("🎁 Recompensa Diária de R$ 25,00 resgatada!");
}

function simulateIncomingPix() {
    if (!currentUser) return;
    const senders = ["Mano King", "Developer Pro", "Staff Server", "Lucas Dev"];
    const validSenders = senders.filter(s => s.toLowerCase() !== currentUser.username.toLowerCase());
    const sender = validSenders[Math.floor(Math.random() * validSenders.length)] || "Amigo Dev";

    const amount = (Math.random() * 40 + 10).toFixed(2);
    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido!\nDe: ${sender}\nValor: R$ ${amount}`);
}

// ==========================================
// 4. ENGINE 2D (FIX DOS BLOCOS VISÍVEIS)
// ==========================================
let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill('');
let hierarchyList = [];
let selectedHierarchyIndex = -1;

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
    if (mode === 'block') {
        tile.classList.add('tile-block');
        tile.innerText = '🧱';
    } else if (mode === 'coin') {
        tile.classList.add('tile-coin');
        tile.innerText = '🪙';
    } else if (mode === 'player') {
        tile.classList.add('tile-player');
        tile.innerText = '👾';
    } else {
        tile.innerText = '';
    }
}

function setTileMode(mode) { currentTileMode = mode; }

function addHierarchyItem(type) {
    const id = hierarchyList.length + 1;
    const objName = `Objeto_${type}_${id}`;
    hierarchyList.push({ id, name: objName, type });
    renderHierarchyTree();
    selectHierarchyItem(hierarchyList.length - 1);
}

function renderHierarchyTree() {
    const tree = document.getElementById('hierarchy-tree');
    if (!tree) return;
    tree.innerHTML = '';

    hierarchyList.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = `tree-item ${selectedHierarchyIndex === index ? 'selected' : ''}`;
        li.style.cssText = "padding:6px; background:rgba(255,255,255,0.05); margin-bottom:4px; font-size:0.8rem; border-radius:4px; cursor:pointer;";
        li.innerText = `${item.type === 'square' ? '🧱' : item.type === 'coin' ? '🪙' : '📜'} ${item.name}`;
        li.onclick = () => selectHierarchyItem(index);
        tree.appendChild(li);
    });
}

function selectHierarchyItem(index) {
    selectedHierarchyIndex = index;
    renderHierarchyTree();

    const inspector = document.getElementById('inspector-content');
    const item = hierarchyList[index];

    if (inspector && item) {
        inspector.innerHTML = `
            <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:8px;">
                <p><strong>Nome:</strong> ${item.name}</p>
                <p><strong>Tipo:</strong> ${item.type}</p>
                <p><strong>Linguagem:</strong> Vortex Script (.vortex)</p>
                <p style="color:#22c55e;">Status: Ativo na Cena</p>
            </div>
        `;
    }
}

function openPublishModalFromEngine() {
    document.getElementById('publish-modal').style.display = 'flex';
}

function closePublishModal() {
    document.getElementById('publish-modal').style.display = 'none';
}

function compileAndPublishEngineGame() {
    const title = document.getElementById('app-title-input').value.trim();
    const price = parseFloat(document.getElementById('app-price-input').value) || 0;

    if (!title) return alert("Digite um nome para o seu jogo!");

    const buildVexe = {
        title: title,
        filename: `${title.toLowerCase().replace(/\s+/g, '_')}.vexe`,
        price: price,
        author: currentUser ? currentUser.username : "Dev_Vortex",
        sceneData: [...currentSceneGrid]
    };

    database.ref('global_apps').push(buildVexe).then(() => {
        alert(`🚀 Compilação concluída! Jogo "${title}.vexe" publicado na Loja Global!`);
        closePublishModal();
        loadGlobalStore();
    });
}

// ==========================================
// 5. VORTEX CODE STUDIO (VS CODE) & .VORTEX
// ==========================================
function createVSCodeDOM() {
    if (document.getElementById('win-vscode')) return;

    const win = document.createElement('div');
    win.id = 'win-vscode';
    win.className = 'window';
    win.style.cssText = "top: 70px; left: 160px; width: 620px; height: 420px; display:none;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-vscode')">
            <span>📝 Vortex Code Studio (Editor .vortex)</span>
            <div class="window-controls"><button onclick="closeWindow('win-vscode')">❌</button></div>
        </div>
        <div class="window-body" style="display:flex; flex-direction:column; gap:8px; background:#1e1e1e; color:#d4d4d4;">
            <div style="display:flex; gap:10px; align-items:center;">
                <input type="text" id="vortex-filename" placeholder="nome_do_script" value="meu_script" style="padding:4px 8px; background:#2d2d2d; border:1px solid #444; color:#fff; border-radius:4px; font-family:monospace;">
                <span style="color:#a78bfa; font-weight:bold;">.vortex</span>
                <button class="btn btn-primary" onclick="saveVortexScriptFile()" style="margin-left:auto;">💾 Salvar Arquivo</button>
            </div>
            <textarea id="vortex-code-editor" style="flex:1; background:#181818; color:#9cdcfe; font-family:monospace; padding:10px; border:1px solid #333; outline:none; resize:none; font-size:0.9rem;" placeholder="// Digite seu código na Linguagem Vortex...&#10;vortex.onCreate(() => {&#10;   vortex.print('Vortex OS Engine Online!');&#10;});"></textarea>
        </div>
    `;
    document.body.appendChild(win);

    // Adiciona Ícone no Desktop se não existir
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

    if (!nameInput) return alert("Digite um nome para o arquivo .vortex!");

    const fileName = `${nameInput.toLowerCase().replace(/\s+/g, '_')}.vortex`;
    installedFiles.push({ title: nameInput, filename: fileName, type: 'vortex', code: code });
    localStorage.setItem('vortex_installed_files', JSON.stringify(installedFiles));
    renderFileManager();
    alert(`📄 Arquivo "${fileName}" criado e salvo em Meus Arquivos!`);
}

// ==========================================
// 6. LOJA GLOBAL (REMOÇÃO + SCROLL) E ARQUIVOS
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
    if (confirm(`Tem certeza que deseja remover "${title}" da Loja Global?`)) {
        database.ref('global_apps/' + key).remove().then(() => {
            alert(`🗑️ Jogo "${title}" removido da loja com sucesso!`);
        });
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
        alert(`🎉 Arquivo "${appData.filename}" baixado e instalado!`);
    });
}

function renderFileManager() {
    const container = document.getElementById('files-list');
    if (!container) return;
    container.innerHTML = '';

    if (installedFiles.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem; color:#888;">Nenhum arquivo .vexe ou .vortex encontrado.</p>';
        return;
    }

    installedFiles.forEach((file, index) => {
        const isVortex = file.filename && file.filename.endsWith('.vortex');
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div><strong>${isVortex ? '📝' : '📄'} ${file.filename || file.title + '.vexe'}</strong></div>
            <div style="font-size: 0.75rem; color: #a78bfa;">Tipo: ${isVortex ? 'Código Vortex' : 'Executável Exec'}</div>
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
    if (!file || !file.sceneData) return alert("Erro ao carregar o arquivo .vexe!");

    document.getElementById('runner-title').innerText = `🎮 Executando: ${file.title} (${file.filename})`;
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
// 7. CALCULADORA & TERMINAL
// ==========================================
function calcInput(v) { 
    const display = document.getElementById('calc-display');
    if (display) display.value += v; 
}

function calcEval() {
    const display = document.getElementById('calc-display');
    if (!display || !display.value.trim()) return;
    try {
        const result = Function('"use strict"; return (' + display.value + ')')();
        display.value = result;
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
        else if (input.value === 'help') out.innerHTML += `Comandos: clear, help, status, version<br>`;
        else if (input.value === 'version') out.innerHTML += `Vortex OS Kernel v${OS_VERSION} Online.<br>`;
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
