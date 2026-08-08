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
const OS_VERSION = "9.6";

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
let currentSceneMeta = {}; // índice -> {text, action} para tiles do tipo 'text'/'button'

// Scripts .vortex criados no projeto atual
let vortexScripts = [];          // [{id, name, code}]
let activeScriptId = null;       // script atualmente ligado ao teste da engine

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

    if (!username) { alert('⚠️ Digite um nome de usuário.'); return; }
    if (!/^\d{4}$/.test(pin)) { alert('⚠️ O PIN deve ter exatamente 4 dígitos numéricos.'); return; }

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
                    alert('❌ PIN incorreto para o usuário "' + username + '".');
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
    const valor = Math.floor(Math.random() * 41) + 10;
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
// 10. VORTEX ENGINE 2D - EDITOR DE MAPA
// ==========================================
// Este editor só define a PLANTA do nível (onde tem bloco, moeda e player).
// Nenhum desses elementos tem comportamento aqui — o comportamento é 100%
// definido pelo script .vortex ligado ao teste/publicação (ver Seção 11/12).
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
        tile.onmouseenter = (e) => {
            // Texto/Botão pedem um prompt por clique — não faz sentido "arrastar" eles.
            if (e.buttons === 1 && currentTileMode !== 'text' && currentTileMode !== 'button') {
                applyTool(i, tile);
            }
        };
        canvas.appendChild(tile);
    }
    mapCanvasInitialized = true;
}

function setTileMode(mode) {
    currentTileMode = mode;
    ['block', 'coin', 'player', 'erase', 'text', 'button'].forEach(m => {
        const btn = document.getElementById(`btn-t-${m}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });
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

    if (currentTileMode === 'erase') {
        currentSceneGrid[index] = '';
        delete currentSceneMeta[index];
        renderTile(tileElement, '');
        return;
    }

    if (currentTileMode === 'text') {
        const existing = (currentSceneMeta[index] && currentSceneMeta[index].text) || '';
        const text = prompt('Texto a exibir no jogo:', existing);
        if (text === null) return; // cancelou o prompt, não altera nada
        currentSceneGrid[index] = 'text';
        currentSceneMeta[index] = { text };
        renderTile(tileElement, 'text');
        return;
    }

    if (currentTileMode === 'button') {
        const existingMeta = currentSceneMeta[index] || {};
        const label = prompt('Texto do botão:', existingMeta.text || 'Botão');
        if (label === null) return;
        const action = prompt(
            'Nome da função do script .vortex a chamar quando clicarem no botão\n(ex: abrir_porta) — deixe em branco pra não chamar nada:',
            existingMeta.action || ''
        );
        currentSceneGrid[index] = 'button';
        currentSceneMeta[index] = { text: label, action: (action || '').trim() };
        renderTile(tileElement, 'button');
        return;
    }

    // block / coin / player
    currentSceneGrid[index] = currentTileMode;
    delete currentSceneMeta[index];
    renderTile(tileElement, currentTileMode);
}

function renderTile(tile, mode) {
    tile.innerText = '';
    if (mode === 'block') tile.innerText = '🧱';
    if (mode === 'coin') tile.innerText = '🪙';
    if (mode === 'player') tile.innerText = '👾';
    if (mode === 'text') tile.innerText = '🔤';
    if (mode === 'button') tile.innerText = '🔘';
}

function addHierarchyItem(type) {
    const tree = document.getElementById('hierarchy-tree');
    if (!tree) return;
    const icons = { square: '🧱', coin: '🪙' };
    const labels = { square: 'Bloco Solido', coin: 'Item Moeda' };

    const li = document.createElement('li');
    li.innerText = `${icons[type] || '❔'} ${labels[type] || type} #${tree.children.length + 1}`;
    tree.appendChild(li);
}

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
        li.style.cursor = 'pointer';
        li.style.padding = '3px 0';
        li.innerText = (s.id === activeScriptId ? '➤ ' : '📜 ') + s.name + '.vortex';
        li.onclick = () => openVortexScriptEditor(s.id);
        list.appendChild(li);
    });
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
    alert(`💾 "${name}.vortex" foi salvo!`);
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

function makeVortexEntity(inst, type, x, y, w, h) {
    w = w || TILE_W; h = h || TILE_H;
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '1.5rem';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    const entity = { x, y, w, h, vx: 0, vy: 0, el, type };

    if (type === 'block') {
        el.innerText = '🧱';
        inst.physicsData.blocks.push(entity);
    } else if (type === 'coin') {
        el.innerText = '🪙';
        entity.collected = false;
        inst.physicsData.coins.push(entity);
    } else if (type === 'player') {
        el.innerText = '👾';
        el.style.zIndex = '10';
        entity.w = 28; entity.h = 32;
        inst.physicsData.player = entity;
    } else {
        el.innerText = '❔';
    }

    inst.worldEl.appendChild(el);
    return entity;
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
    return {
        print: (...args) => inst.log(args.map(String).join(' ')),

        get_player: () => inst.physicsData.player,
        get_blocks: () => inst.physicsData.blocks,
        get_coins: () => inst.physicsData.coins,

        is_key_down: (key) => !!globalKeys[String(key).toLowerCase()],
        check_collision: (a, b) => checkCollision(a, b),

        spawn: (type, gridX, gridY) => makeVortexEntity(inst, type, Number(gridX) * TILE_W, Number(gridY) * TILE_H),
        spawn_at: (type, x, y) => makeVortexEntity(inst, type, Number(x), Number(y)),
        destroy: (entity) => {
            if (!entity) return;
            if (entity.el) entity.el.remove();
            inst.physicsData.blocks = inst.physicsData.blocks.filter(b => b !== entity);
            inst.physicsData.coins = inst.physicsData.coins.filter(c => c !== entity);
            if (inst.physicsData.player === entity) inst.physicsData.player = null;
        },
        collect_coin: (coin) => {
            if (!coin || coin.collected) return;
            coin.collected = true;
            coin.el.style.display = 'none';
        },

        add_coins: (n) => { inst.coinCount += (Number(n) || 0); return inst.coinCount; },
        set_coins: (n) => { inst.coinCount = Number(n) || 0; },
        get_coins_count: () => inst.coinCount,

        set_camera: (x, y) => { inst.camera.x = Number(x) || 0; inst.camera.y = Number(y) || 0; },

        create_text: (id, text, x, y, color) => {
            const el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.left = (Number(x) || 0) + 'px';
            el.style.top = (Number(y) || 0) + 'px';
            el.style.color = color || '#fff';
            el.style.fontFamily = 'monospace';
            el.style.fontSize = '1rem';
            el.style.fontWeight = 'bold';
            el.style.textShadow = '0 0 4px rgba(0,0,0,0.85)';
            el.innerText = text;
            inst.uiLayerEl.appendChild(el);
            inst.uiElements[id] = { el, type: 'text' };
            return el;
        },
        create_button: (id, text, x, y, onClick) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.className = 'btn btn-sm btn-primary';
            btn.style.position = 'absolute';
            btn.style.left = (Number(x) || 0) + 'px';
            btn.style.top = (Number(y) || 0) + 'px';
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.onclick = () => {
                if (typeof onClick !== 'function') return;
                try { onClick(); }
                catch (err) { inst.log('Erro no botão "' + id + '": ' + err.message, true); }
            };
            inst.uiLayerEl.appendChild(btn);
            inst.uiElements[id] = { el: btn, type: 'button' };
            return btn;
        },
        set_text: (id, text) => {
            const item = inst.uiElements[id];
            if (item) item.el.innerText = text;
        },
        remove_ui: (id) => {
            const item = inst.uiElements[id];
            if (item) { item.el.remove(); delete inst.uiElements[id]; }
        }
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
            makeVortexEntity(inst, type, x, y);
        }
    });

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
            alert('⚠️ Coloque um Player (👾) no mapa antes de testar!');
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
            { consoleEl: consoleBox, uiData: currentSceneMeta }
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
    if (!currentUser) return alert('Faça login primeiro.');

    const title = document.getElementById('app-title-input').value.trim();
    const price = Number(document.getElementById('app-price-input').value) || 0;

    if (!title) return alert('⚠️ Dê um nome ao seu jogo antes de publicar.');
    if (!currentSceneGrid.includes('player')) return alert('⚠️ Coloque um Player (👾) na cena antes de publicar.');

    const activeScript = vortexScripts.find(s => s.id === activeScriptId);
    const scriptCode = activeScript ? activeScript.code : '';

    // Compila o script antes de publicar, pra não deixar subir um .vexe quebrado.
    try {
        compileVortexScript(scriptCode);
    } catch (err) {
        return alert('❌ Erro ao compilar o script: ' + err.message + '\nCorrija o código antes de publicar.');
    }

    const appId = 'app_' + Date.now();
    const appData = {
        title,
        price,
        author: currentUser.displayName || currentUser.key,
        authorKey: currentUser.key,
        mapData: currentSceneGrid,
        uiData: currentSceneMeta,
        scriptCode,
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

// ---- Executor de .vexe: agora roda o jogo de verdade (física do script,
// colisão, moedas, câmera e UI), não é mais um preview estático do mapa. ----
let currentRunnerInstance = null;

function runVexeApp(app) {
    openWindow('win-runner');
    document.getElementById('runner-title').innerText = `🎮 Executando: ${app.title}.vexe`;

    stopRunnerInstance();

    const canvas = document.getElementById('runner-canvas');
    currentRunnerInstance = createVortexGameInstance(canvas, app.mapData, app.scriptCode || '', { uiData: app.uiData || {} });
    currentRunnerInstance.start();
}

function stopRunnerInstance() {
    if (currentRunnerInstance) {
        currentRunnerInstance.stop();
        currentRunnerInstance = null;
    }
}

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
