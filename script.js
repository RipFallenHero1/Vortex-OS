// ==========================================
// 🌀 VORTEX OS - VERSÃO 9.5 (BUILD UNIFICADA & CORRIGIDA)
// ==========================================
const OS_VERSION = "9.5";

// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

// 2. INJEÇÃO DE ESTILOS DA VERSÃO 9.5
(function initV95Styles() {
    document.title = `Vortex OS ${OS_VERSION}`;
    console.log(`[Vortex OS v${OS_VERSION}] Sistema carregado com sucesso.`);

    const style = document.createElement('style');
    style.id = 'vortex-v95-styles';
    style.innerHTML = `
        /* CORE & LAYOUT */
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body, html { width: 100vw; height: 100vh; overflow: hidden; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b001a; color: #fff; }

        /* TELA DE LOGIN */
        #login-screen { position: absolute; top:0; left:0; width:100vw; height:100vh; background: linear-gradient(135deg, #0d001a 0%, #1f0038 100%); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .login-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); padding: 30px; border-radius: 12px; width: 320px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .login-card h2 { margin-bottom: 20px; color: #a78bfa; font-weight: 600; }
        .login-card input { width: 100%; padding: 10px; margin-bottom: 12px; background: rgba(0,0,0,0.4); border: 1px solid #4c1d95; border-radius: 6px; color: #fff; outline: none; }
        .login-card input:focus { border-color: #8b5cf6; }
        .login-card button { width: 100%; padding: 10px; background: #7c3aed; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .login-card button:hover { background: #6d28d9; }

        /* DESKTOP E TASKBAR */
        #desktop { width: 100vw; height: calc(100vh - 45px); position: relative; padding: 20px; display: flex; flex-direction: column; flex-wrap: wrap; gap: 20px; align-content: flex-start; }
        .desktop-icon { width: 75px; display: flex; flex-direction: column; align-items: center; cursor: pointer; text-align: center; font-size: 0.8rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
        .desktop-icon .icon-img { width: 50px; height: 50px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin-bottom: 5px; transition: 0.2s; }
        .desktop-icon:hover .icon-img { background: rgba(167, 139, 250, 0.3); transform: translateY(-2px); }

        #taskbar { position: absolute; bottom: 0; left: 0; width: 100vw; height: 45px; background: rgba(15, 10, 30, 0.85); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 10px; z-index: 99990; }
        .start-btn { background: #7c3aed; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 15px; }
        .start-btn:hover { background: #6d28d9; }

        /* JANELAS GENERALIZADAS */
        .window { position: absolute; background: #12002b; border: 1px solid #a78bfa; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: none; flex-direction: column; overflow: hidden; min-width: 300px; min-height: 200px; }
        .window.minimized { display: none !important; }
        .window.maximized { top: 0 !important; left: 0 !important; width: 100vw !important; height: calc(100vh - 45px) !important; border-radius: 0 !important; z-index: 9999 !important; }
        .window-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(30, 27, 75, 0.9); cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .window-controls { display: flex; gap: 6px; }
        .window-controls button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
        .window-controls button:hover { background: rgba(255,255,255,0.25); }
        .window-controls button.btn-close:hover { background: #ef4444; }

        /* VORTEX ENGINE 2D V9.5 */
        .engine-toolbar { display: flex; gap: 8px; padding: 8px 12px; background: #1e1b4b; border-bottom: 1px solid #a78bfa; flex-wrap: wrap; }
        .engine-btn { background: #2d2d2d; color: white; border: 1px solid #555; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85rem; }
        .engine-btn.active { background: #8b5cf6; border-color: #c084fc; }
        .engine-btn:hover { background: #444; }

        #canvas-2d { display: grid; grid-template-columns: repeat(20, 1fr); grid-template-rows: repeat(12, 1fr); gap: 1px; background: #000; padding: 2px; flex: 1; }
        .tile { display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: crosshair; background: #111; }
        .tile:hover { background: #222; }

        #game-screen { width: 100%; height: 100%; background: #87CEEB; position: relative; overflow: hidden; display: none; }
        .game-entity { position: absolute; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    `;
    document.head.appendChild(style);
})();

// ==========================================
// 3. ESTRUTURA BASE DA INTERFACE (DOM)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Monta a tela de Login e o Desktop caso não existam no HTML
    if (!document.getElementById("login-screen")) {
        const loginDiv = document.createElement("div");
        loginDiv.id = "login-screen";
        loginDiv.innerHTML = `
            <div class="login-card">
                <h2>🌀 Vortex OS ${OS_VERSION}</h2>
                <input type="email" id="login-email" placeholder="Seu E-mail">
                <input type="password" id="login-password" placeholder="Sua Senha">
                <button onclick="handleLogin()">ENTRAR / CADASTRAR</button>
                <p id="login-msg" style="color: #f87171; margin-top: 10px; font-size: 0.8rem; min-height: 1.2em;"></p>
            </div>
        `;
        document.body.appendChild(loginDiv);
    }

    if (!document.getElementById("desktop")) {
        const desktopDiv = document.createElement("div");
        desktopDiv.id = "desktop";
        document.body.appendChild(desktopDiv);
    }

    if (!document.getElementById("taskbar")) {
        const taskbarDiv = document.createElement("div");
        taskbarDiv.id = "taskbar";
        taskbarDiv.innerHTML = `<button class="start-btn">🌀 Vortex v${OS_VERSION}</button>`;
        document.body.appendChild(taskbarDiv);
    }

    renderDesktopIcons();
});

// ==========================================
// 4. LÓGICA DE AUTENTICAÇÃO E LOGIN
// ==========================================
function handleLogin() {
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value.trim();
    const msg = document.getElementById("login-msg");

    if (!email || !pass) {
        msg.innerText = "Preencha e-mail e senha!";
        return;
    }

    msg.style.color = "#a78bfa";
    msg.innerText = "Autenticando...";

    // Tenta Logar
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => unlockSystem())
        .catch(error => {
            // Se o usuário não existir, cria a conta automaticamente
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then(() => unlockSystem())
                    .catch(err => { msg.style.color = "#f87171"; msg.innerText = err.message; });
            } else {
                msg.style.color = "#f87171";
                msg.innerText = error.message;
            }
        });
}

function unlockSystem() {
    const loginScreen = document.getElementById("login-screen");
    if (loginScreen) loginScreen.style.display = "none";
    console.log(`[Vortex OS v${OS_VERSION}] Login realizado com sucesso!`);
}

// ==========================================
// 5. SISTEMA DE JANELAS E DRAG & DROP
// ==========================================
let highestZIndex = 100;
let openApps = new Set();

function openWindow(id) {
    if (id === 'win-vscode') createVSCodeDOM();
    if (id === 'win-engine') createEngineDOM();

    const win = document.getElementById(id);
    if (!win) return;

    win.classList.remove('minimized');
    win.style.display = 'flex';
    bringToFront(win);
    openApps.add(id);
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.style.display = 'none';
    openApps.delete(id);
    if (id === 'win-engine') stopGame();
}

function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.classList.add('minimized');
}

function toggleMaximizeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.classList.toggle('maximized');
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);
    if (win.classList.contains('maximized')) return;
    
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

function renderDesktopIcons() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    desktop.innerHTML = `
        <div class="desktop-icon" onclick="openWindow('win-engine')">
            <div class="icon-img">⚡</div>
            <span>Engine v${OS_VERSION}</span>
        </div>
        <div class="desktop-icon" onclick="openWindow('win-vscode')">
            <div class="icon-img">📝</div>
            <span>Vortex Code</span>
        </div>
    `;
}

// ==========================================
// 6. MOTOR DE JOGOS 2D & FÍSICA JOGÁVEL
// ==========================================
let currentTileMode = 'block';
let currentSceneGrid = new Array(240).fill(''); 
let gameLoopInterval;
let keys = {};

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function createEngineDOM() {
    if (document.getElementById('win-engine')) return;

    const win = document.createElement('div');
    win.id = 'win-engine';
    win.className = 'window';
    win.style.cssText = "top: 40px; left: 80px; width: 660px; height: 520px; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-engine')">
            <span>⚡ Vortex Game Engine v${OS_VERSION}</span>
            <div class="window-controls">
                <button onclick="minimizeWindow('win-engine')">➖</button>
                <button onclick="toggleMaximizeWindow('win-engine')">🔲</button>
                <button class="btn-close" onclick="closeWindow('win-engine')">❌</button>
            </div>
        </div>
        <div class="engine-toolbar">
            <button class="engine-btn active" id="btn-t-block" onclick="setMode('block')">🧱 Bloco</button>
            <button class="engine-btn" id="btn-t-coin" onclick="setMode('coin')">🪙 Moeda</button>
            <button class="engine-btn" id="btn-t-player" onclick="setMode('player')">👾 Player</button>
            <button class="engine-btn" id="btn-t-erase" onclick="setMode('erase')">🧹 Borracha</button>
            <div style="flex:1;"></div>
            <button class="engine-btn" style="background:#dc2626;" onclick="clearEngine()">🗑️ Limpar</button>
            <button class="engine-btn" style="background:#22c55e;" id="btn-play" onclick="togglePlayMode()">▶️ TESTAR JOGO</button>
        </div>
        <div id="canvas-2d"></div>
        <div id="game-screen"></div>
    `;
    document.body.appendChild(win);
    initMapCanvas();
}

function setMode(mode) {
    currentTileMode = mode;
    ['block', 'coin', 'player', 'erase'].forEach(m => {
        const btn = document.getElementById(`btn-t-${m}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });
}

function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    if (!canvas) return;
    canvas.innerHTML = '';
    for (let i = 0; i < 240; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = i;
        tile.onmousedown = () => applyTool(i, tile);
        tile.onmouseenter = (e) => { if (e.buttons === 1) applyTool(i, tile); };
        canvas.appendChild(tile);
    }
}

function applyTool(index, tileElement) {
    if (currentTileMode === 'player') {
        const oldPlayerIdx = currentSceneGrid.indexOf('player');
        if (oldPlayerIdx !== -1) {
            currentSceneGrid[oldPlayerIdx] = '';
            const oldTile = document.querySelector(`.tile[data-index='${oldPlayerIdx}']`);
            if (oldTile) oldTile.innerText = '';
        }
    }
    currentSceneGrid[index] = currentTileMode === 'erase' ? '' : currentTileMode;
    renderTile(tileElement, currentSceneGrid[index]);
}

function renderTile(tile, mode) {
    tile.innerText = '';
    tile.style.backgroundColor = '#111';
    if (mode === 'block') tile.innerText = '🧱';
    if (mode === 'coin') tile.innerText = '🪙';
    if (mode === 'player') tile.innerText = '👾';
}

function clearEngine() {
    if (confirm("Apagar o mapa inteiro?")) {
        currentSceneGrid.fill('');
        document.querySelectorAll('.tile').forEach(t => renderTile(t, ''));
    }
}

let physicsData = { player: null, blocks: [], coins: [] };

function togglePlayMode() {
    const btn = document.getElementById('btn-play');
    const editor = document.getElementById('canvas-2d');
    const screen = document.getElementById('game-screen');

    if (btn.innerText.includes("TESTAR")) {
        if (!currentSceneGrid.includes('player')) return alert("⚠️ Coloque um Player (👾) no mapa primeiro!");
        
        btn.innerText = "🛑 PARAR JOGO";
        btn.style.background = "#ef4444";
        editor.style.display = "none";
        screen.style.display = "block";
        
        buildGameScene(screen);
        startGameLoop();
    } else {
        stopGame();
        btn.innerText = "▶️ TESTAR JOGO";
        btn.style.background = "#22c55e";
        editor.style.display = "grid";
        screen.style.display = "none";
    }
}

function buildGameScene(screen) {
    screen.innerHTML = '';
    physicsData = { player: null, blocks: [], coins: [] };

    const TILE_W = 33; 
    const TILE_H = 36;

    currentSceneGrid.forEach((type, i) => {
        if (!type) return;
        const x = (i % 20) * TILE_W;
        const y = Math.floor(i / 20) * TILE_H;

        const el = document.createElement('div');
        el.className = 'game-entity';
        el.style.width = TILE_W + 'px';
        el.style.height = TILE_H + 'px';
        el.style.left = x + 'px';
        el.style.top = y + 'px';

        if (type === 'block') {
            el.innerText = '🧱';
            physicsData.blocks.push({ x, y, w: TILE_W, h: TILE_H, el });
        } else if (type === 'coin') {
            el.innerText = '🪙';
            physicsData.coins.push({ x, y, w: TILE_W, h: TILE_H, el, collected: false });
        } else if (type === 'player') {
            el.innerText = '👾';
            el.style.zIndex = "10";
            physicsData.player = { x, y, vx: 0, vy: 0, w: 28, h: 32, el, speed: 4, jumpPower: -12, grounded: false };
        }
        screen.appendChild(el);
    });
}

function startGameLoop() {
    gameLoopInterval = setInterval(updatePhysics, 1000 / 60);
}

function stopGame() {
    clearInterval(gameLoopInterval);
}

function checkCollision(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function updatePhysics() {
    let p = physicsData.player;
    if (!p) return;

    if (keys['a'] || keys['arrowleft']) p.vx = -p.speed;
    else if (keys['d'] || keys['arrowright']) p.vx = p.speed;
    else p.vx = 0;

    p.vy += 0.6; // Gravidade

    if ((keys['w'] || keys[' '] || keys['arrowup']) && p.grounded) {
        p.vy = p.jumpPower;
        p.grounded = false;
    }

    p.x += p.vx;
    if (p.x < 0) p.x = 0;
    if (p.x > 660 - p.w) p.x = 660 - p.w;

    for (let b of physicsData.blocks) {
        if (checkCollision(p, b)) {
            if (p.vx > 0) p.x = b.x - p.w;
            else if (p.vx < 0) p.x = b.x + b.w;
            p.vx = 0;
        }
    }

    p.y += p.vy;
    p.grounded = false;

    for (let b of physicsData.blocks) {
        if (checkCollision(p, b)) {
            if (p.vy > 0) {
                p.y = b.y - p.h;
                p.vy = 0;
                p.grounded = true;
            } else if (p.vy < 0) {
                p.y = b.y + b.h;
                p.vy = 0;
            }
        }
    }

    if (p.y > 480) {
        alert("💀 Você caiu no vazio! Reiniciando...");
        togglePlayMode();
        setTimeout(togglePlayMode, 400);
        return;
    }

    physicsData.coins.forEach(c => {
        if (!c.collected && checkCollision(p, c)) {
            c.collected = true;
            c.el.style.display = 'none';
        }
    });

    p.el.style.left = p.x + 'px';
    p.el.style.top = p.y + 'px';
    
    if (p.vx < 0) p.el.style.transform = 'scaleX(-1)';
    if (p.vx > 0) p.el.style.transform = 'scaleX(1)';
}

// ==========================================
// 7. VORTEX CODE STUDIO (PYTHON-LIKE)
// ==========================================
function createVSCodeDOM() {
    if (document.getElementById('win-vscode')) return;

    const win = document.createElement('div');
    win.id = 'win-vscode';
    win.className = 'window';
    win.style.cssText = "top: 60px; left: 140px; width: 680px; height: 460px; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-vscode')">
            <span>📝 Vortex Code Studio v${OS_VERSION} (Python-Like API)</span>
            <div class="window-controls">
                <button onclick="minimizeWindow('win-vscode')">➖</button>
                <button onclick="toggleMaximizeWindow('win-vscode')">🔲</button>
                <button class="btn-close" onclick="closeWindow('win-vscode')">❌</button>
            </div>
        </div>
        <div class="window-body" style="display:flex; flex:1; background:#1e1e1e; color:#d4d4d4;">
            <div style="width:230px; background:#252526; border-right:1px solid #333; padding:10px; font-size:0.75rem; overflow-y:auto;">
                <h4 style="color:#a78bfa; margin-bottom:8px;">🐍 API Vortex v${OS_VERSION}</h4>
                <p style="color:#999; margin-bottom:10px;">Sintaxe inspirada em Python. IndentationError imune!</p>
                <p><strong>Básicos:</strong></p>
                <code style="color:#4ec9b0;">def _ready():</code><br>
                <code style="color:#4ec9b0;">def _update():</code><br>
                <code style="color:#4ec9b0;">print("Olá!")</code><br><br>
                <p><strong>Entidades Engine:</strong></p>
                <code style="color:#ce9178;">vortex.spawn('block', x, y)</code><br>
                <code style="color:#ce9178;">vortex.destroy(id)</code><br>
                <code style="color:#ce9178;">player = vortex.get_player()</code><br>
                <code style="color:#ce9178;">player.jump(15)</code><br>
            </div>

            <div style="flex:1; display:flex; flex-direction:column; padding:10px; gap:8px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <input type="text" id="vortex-filename" placeholder="meu_jogo" style="padding:4px 8px; background:#2d2d2d; border:1px solid #444; color:#fff; border-radius:4px;">
                    <span style="color:#a78bfa; font-weight:bold;">.vortex</span>
                </div>
                <textarea id="vortex-code-editor" style="flex:1; background:#181818; color:#9cdcfe; font-family:monospace; padding:10px; border:1px solid #333; outline:none; resize:none; font-size:0.9rem;" placeholder="# Crie sua lógica em Python aqui!&#10;&#10;def _ready():&#10;    print('Jogo Carregado com Sucesso')&#10;    vortex.spawn('coin', 5, 5)&#10;&#10;def _update():&#10;    player = vortex.get_player()&#10;    if player.y > 100:&#10;        player.jump(10)"></textarea>
            </div>
        </div>
    `;
    document.body.appendChild(win);
}
