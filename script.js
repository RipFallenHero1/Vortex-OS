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
// 2. TELA DE LOGIN & SISTEMA DE CONTA
// ==========================================
let currentUser = null;

function loginUser() {
    const username = document.getElementById('auth-username').value.trim();
    const pin = document.getElementById('auth-pin').value.trim();
    const email = document.getElementById('auth-email').value.trim();

    if (!username || !pin) return alert("Por favor, preencha o Usuário e o PIN!");

    currentUser = { username, pin, email: email || "Não informado" };
    
    // Salva perfil no Firebase
    database.ref('users/' + username).set(currentUser);

    // Atualiza interface
    document.getElementById('start-username').innerText = username;
    document.getElementById('start-email').innerText = currentUser.email;
    document.getElementById('settings-user').innerText = username;
    document.getElementById('settings-email').innerText = currentUser.email;

    document.getElementById('login-screen').style.display = 'none';
}

function shutdownPC() {
    document.getElementById('shutdown-screen').style.display = 'flex';
}

function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// ==========================================
// 3. GERENCIAMENTO DO SO (JANELAS E WALLPAPER)
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
// 4. ECONOMIA (PIX E SALDO)
// ==========================================
let userBalance = parseFloat(localStorage.getItem('vortex_balance')) || 50.00;

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    localStorage.setItem('vortex_balance', userBalance);
}

function claimDailyReward() {
    userBalance += 25.00;
    updateBalanceUI();
    alert("🎁 Recompensa de R$ 25,00 resgatada!");
}

function simulateIncomingPix() {
    const senders = ["Mano King", "Developer Pro", "Staff Server"];
    const amount = (Math.random() * 40 + 10).toFixed(2);
    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido!\nDe: ${senders[Math.floor(Math.random() * senders.length)]}\nValor: R$ ${amount}`);
}

// ==========================================
// 5. VORTEX ENGINE 2D (CENA FIXA E .VEXE)
// ==========================================
let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill('');

function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    canvas.innerHTML = '';
    for (let i = 0; i < 240; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i;
        tile.onclick = () => {
            tile.className = 'tile';
            if (currentTileMode !== 'erase') {
                tile.classList.add(currentTileMode);
                currentSceneGrid[i] = currentTileMode;
            } else {
                currentSceneGrid[i] = '';
            }
        };
        canvas.appendChild(tile);
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

    // Salva na Nuvem Firebase
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
        tile.className = 'tile ' + (tileClass || '');
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
        else if (input.value === 'help') out.innerHTML += `Comandos: clear, help, status, apps<br>`;
        else if (input.value === 'status') out.innerHTML += `Vortex OS Kernel v8.0 OK.<br>`;
        else out.innerHTML += `Comando não reconhecido.<br>`;
        input.value = '';
    }
}

// INICIALIZAÇÃO
window.onload = () => {
    updateBalanceUI();
    initMapCanvas();
    loadGlobalStore();
    renderFileManager();
};
