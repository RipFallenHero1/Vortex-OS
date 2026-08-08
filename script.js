// ==========================================
// 1. FIREBASE CONFIG
// ==========================================
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

// ==========================================
// 2. SISTEMA DE AUTENTICAÇÃO (ENTRAR / CRIAR / RECUPERAR)
// ==========================================
let currentUser = null;
let authMode = 'login'; // 'login', 'register', 'recover'

function renderAuthUI() {
    const card = document.querySelector('.auth-card');
    if (!card) return;

    if (authMode === 'login') {
        card.innerHTML = `
            <div class="auth-header">
                <h2>🌀 Vortex OS</h2>
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

function setAuthMode(mode) {
    authMode = mode;
    renderAuthUI();
}

function handleAuthSubmit() {
    const usernameInput = document.getElementById('auth-username');
    const pinInput = document.getElementById('auth-pin');
    const emailInput = document.getElementById('auth-email');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (authMode === 'register') {
        if (!username || !pin) return alert("Preencha o Nome de Usuário e o PIN!");
        if (pin.length !== 4) return alert("O PIN precisa ter exatamente 4 dígitos!");

        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) {
                alert("❌ Este nome de usuário já existe! Escolha outro.");
            } else {
                const newUser = {
                    username: username,
                    pin: pin,
                    email: email || "Não informado",
                    balance: 50.00,
                    lastDaily: ""
                };
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
                alert("❌ Usuário não encontrado! Crie uma conta primeiro.");
            }
        });
    } else if (authMode === 'recover') {
        if (!username || !email) return alert("Preencha o Usuário e o E-mail!");

        database.ref('users/' + username).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData.email && userData.email.toLowerCase() === email.toLowerCase()) {
                    alert(`🔑 Seu PIN cadastrado é: ${userData.pin}`);
                    setAuthMode('login');
                } else {
                    alert("❌ O e-mail informado não bate com o da conta!");
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
}

function shutdownPC() {
    document.getElementById('shutdown-screen').style.display = 'flex';
}

function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    setAuthMode('login');
}

// ==========================================
// 3. GERENCIAMENTO DO SO
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
    document.getElementById(id).classList.remove('active');
    openApps.delete(id);
    updateTaskbar();
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function updateTaskbar() {
    const taskbar = document.getElementById('taskbar-apps');
    taskbar.innerHTML = '';
    const names = {
        'win-engine': '⚡ Engine', 'win-store': '🛒 Loja', 'win-files': '📁 Arquivos',
        'win-settings': '⚙️ Config', 'win-terminal': '💻 Terminal', 'win-calc': '🧮 Calc', 'win-runner': '🎮 Runner'
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
    document.getElementById('os-clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

// ==========================================
// 4. ECONOMIA (DIÁRIA RIGOROSA E PIX PROTEGIDO)
// ==========================================
let userBalance = 0.00;

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    if (currentUser) {
        database.ref('users/' + currentUser.username).update({ balance: userBalance });
    }
}

function claimDailyReward() {
    if (!currentUser) return alert("Faça login primeiro!");

    const today = new Date().toDateString(); // Ex: "Sat Aug 08 2026"

    if (currentUser.lastDaily === today) {
        alert("⏳ Você já resgatou sua recompensa diária hoje! Volte amanhã.");
        return;
    }

    userBalance += 25.00;
    currentUser.lastDaily = today;
    updateBalanceUI();

    database.ref('users/' + currentUser.username).update({
        balance: userBalance,
        lastDaily: today
    });

    alert("🎁 Recompensa Diária de R$ 25,00 resgatada com sucesso!");
}

function simulateIncomingPix() {
    if (!currentUser) return;

    // Garante que o remetente nunca seja o próprio usuário logado
    const senders = ["Mano King", "Developer Pro", "Staff Server", "Lucas Dev"];
    const validSenders = senders.filter(s => s.toLowerCase() !== currentUser.username.toLowerCase());
    const sender = validSenders[Math.floor(Math.random() * validSenders.length)] || "Amigo Dev";

    const amount = (Math.random() * 40 + 10).toFixed(2);
    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido!\nDe: ${sender}\nValor: R$ ${amount}`);
}

// ==========================================
// 5. VORTEX ENGINE 2D (SISTEMA DE PINTURA VISUAL CORRIGIDO)
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
            if (currentTileMode === 'erase') {
                currentSceneGrid[i] = '';
            } else {
                currentSceneGrid[i] = currentTileMode;
            }
            applyTileStyle(tile, currentSceneGrid[i]);
        };
        canvas.appendChild(tile);
    }
}

// Garante visualização imediata dos blocos na cena
function applyTileStyle(tile, mode) {
    tile.className = 'tile';
    if (mode === 'block') {
        tile.classList.add('block');
        tile.style.backgroundColor = '#8b5cf6';
        tile.style.border = '1px solid #a78bfa';
        tile.innerText = '🧱';
    } else if (mode === 'coin') {
        tile.classList.add('coin');
        tile.style.backgroundColor = '#eab308';
        tile.style.border = 'none';
        tile.innerText = '🪙';
    } else if (mode === 'player') {
        tile.classList.add('player');
        tile.style.backgroundColor = '#22c55e';
        tile.style.border = 'none';
        tile.innerText = '👾';
    } else {
        tile.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        tile.style.border = '1px solid rgba(168, 85, 247, 0.1)';
        tile.innerText = '';
    }
}

function setTileMode(mode) { currentTileMode = mode; }

function addHierarchyItem(type) {
    const tree = document.getElementById('hierarchy-tree');
    const li = document.createElement('li');
    li.className = 'tree-item';
    li.style.cssText = "padding:4px; background:rgba(255,255,255,0.05); margin-bottom:2px; font-size:0.8rem; border-radius:4px;";
    li.innerText = `Objeto_${type}_${tree.children.length + 1}`;
    tree.appendChild(li);
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
// 6. LOJA GLOBAL E GERENCIADOR DE ARQUIVOS
// ==========================================
let installedFiles = JSON.parse(localStorage.getItem('vortex_installed_files')) || [];

function loadGlobalStore() {
    const container = document.getElementById('global-apps-list');
    database.ref('global_apps').on('value', (snapshot) => {
        container.innerHTML = '';
        const data = snapshot.val();
        if (!data) return container.innerHTML = '<p>Nenhum jogo na nuvem ainda.</p>';

        Object.keys(data).forEach(key => {
            const app = data[key];
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h4>🎮 ${app.title}</h4>
                <p><small>Build: ${app.filename || 'app.vexe'}</small></p>
                <p><small>Por: ${app.author}</small></p>
                <p style="color:#22c55e;"><strong>R$ ${app.price.toFixed(2)}</strong></p>
                <button class="btn btn-primary" onclick="buyAndInstallApp('${app.title}', '${app.filename}', ${app.price}, '${key}')">🛒 Baixar .vexe</button>
            `;
            container.appendChild(card);
        });
    });
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
        alert(`🎉 Arquivo "${appData.filename}" baixado e instalado em Meus Arquivos!`);
    });
}

function renderFileManager() {
    const container = document.getElementById('files-list');
    if (!container) return;
    container.innerHTML = '';

    if (installedFiles.length === 0) {
        container.innerHTML = '<p style="font-size:0.85rem; color:#888;">Nenhum executável .vexe instalado.</p>';
        return;
    }

    installedFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.innerHTML = `
            <div><strong>📄 ${file.filename || file.title + '.vexe'}</strong></div>
            <div style="font-size: 0.75rem; color: #a78bfa;">Tamanho: 24 KB</div>
            <div style="display: flex; gap: 5px; margin-top: 5px;">
                <button class="btn btn-primary" style="flex:1;" onclick="runVexeGame(${index})">▶️ Executar</button>
                <button class="btn" style="background:#dc2626;" onclick="uninstallFile(${index})">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function uninstallFile(index) {
    installedFiles.splice(index, 1);
    localStorage.setItem('vortex_installed_files', JSON.stringify(installedFiles));
    renderFileManager();
}

function runVexeGame(index) {
    const file = installedFiles[index];
    if (!file || !file.sceneData) return alert("Erro ao carregar os dados do arquivo .vexe!");

    document.getElementById('runner-title').innerText = `🎮 Executando: ${file.title} (${file.filename})`;
    const canvas = document.getElementById('runner-canvas');
    canvas.innerHTML = '';

    file.sceneData.forEach(tileClass => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        applyTileStyle(tile, tileClass);
        canvas.appendChild(tile);
    });

    openWindow('win-runner');
}

// ==========================================
// 7. APPS EXTRAS
// ==========================================
function calcInput(v) { document.getElementById('calc-display').value += v; }
function calcEval() {
    try { document.getElementById('calc-display').value = eval(document.getElementById('calc-display').value); }
    catch(e) { document.getElementById('calc-display').value = "Erro"; }
}

function handleTerminal(e) {
    if (e.key === 'Enter') {
        const input = e.target;
        const out = document.getElementById('terminal-output');
        out.innerHTML += `> ${input.value}<br>`;
        if (input.value === 'clear') out.innerHTML = '';
        else if (input.value === 'help') out.innerHTML += `Comandos: clear, help, status<br>`;
        else if (input.value === 'status') out.innerHTML += `Vortex OS Kernel v8.0 OK.<br>`;
        else out.innerHTML += `Comando não reconhecido.<br>`;
        input.value = '';
    }
}

// INICIALIZAÇÃO
window.onload = () => {
    renderAuthUI();
    initMapCanvas();
    loadGlobalStore();
    renderFileManager();
};
