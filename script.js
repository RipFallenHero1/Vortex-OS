// ==========================================
// 🌀 VORTEX OS - VERSÃO 9.0 (PYTHON-LIKE & PHYSICS ENGINE)
// ==========================================
const OS_VERSION = "9.0";

// FIREBASE CONFIG (Mantenha as suas credenciais se necessário)
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// INJEÇÃO AUTOMÁTICA DE ESTILOS DA V9.0
(function initV90Styles() {
    document.title = `Vortex ${OS_VERSION}`;
    const style = document.createElement('style');
    style.innerHTML = `
        /* ESTILOS DE JANELAS E BARRA DE TAREFAS */
        .window { position: absolute; background: #12002b; border: 1px solid #a78bfa; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; flex-direction: column; overflow: hidden; }
        .window.minimized { display: none !important; }
        .window.maximized { top: 0 !important; left: 0 !important; width: 100vw !important; height: calc(100vh - 45px) !important; border-radius: 0 !important; z-index: 9999 !important; }
        .window-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(30, 27, 75, 0.9); cursor: move; border-bottom: 1px solid rgba(255,255,255,0.1); user-select: none; }
        .window-controls { display: flex; gap: 4px; }
        .window-controls button { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
        .window-controls button:hover { background: rgba(255,255,255,0.25); }
        .window-controls button.btn-close:hover { background: #ef4444; }

        /* TOOLBAR E GRID DA ENGINE */
        .engine-toolbar { display: flex; gap: 8px; padding: 10px; background: #1e1b4b; border-bottom: 1px solid #a78bfa; }
        .engine-btn { background: #2d2d2d; color: white; border: 1px solid #555; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .engine-btn.active { background: #8b5cf6; border-color: #c084fc; }
        .engine-btn:hover { background: #444; }
        
        #canvas-2d { display: grid; grid-template-columns: repeat(20, 1fr); grid-template-rows: repeat(12, 1fr); gap: 1px; background: #000; padding: 2px; flex: 1; }
        .tile { display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: crosshair; background: #111; user-select: none; }
        .tile:hover { background: #333; }

        /* RUNNER GAME CANVAS */
        #game-screen { width: 100%; height: 100%; background: #87CEEB; position: relative; overflow: hidden; display: none; }
        .game-entity { position: absolute; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    `;
    document.head.appendChild(style);
})();

// ==========================================
// 1. SISTEMA DE JANELAS (FIX DEFINITIVO)
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

// ==========================================
// 2. ENGINE 2D (FÍSICA E COLISÃO JOGÁVEL)
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
    win.style.cssText = "top: 40px; left: 100px; width: 640px; height: 500px; display:none; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-engine')">
            <span>⚡ Vortex Game Engine</span>
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
        // Só pode existir um player
        const oldPlayerIdx = currentSceneGrid.indexOf('player');
        if (oldPlayerIdx !== -1) {
            currentSceneGrid[oldPlayerIdx] = '';
            document.querySelector(`.tile[data-index='${oldPlayerIdx}']`).innerText = '';
        }
    }
    currentSceneGrid[index] = currentTileMode === 'erase' ? '' : currentTileMode;
    renderTile(tileElement, currentSceneGrid[index]);
}

function renderTile(tile, mode) {
    tile.innerText = '';
    tile.style.backgroundColor = '#111';
    if (mode === 'block') { tile.innerText = '🧱'; }
    if (mode === 'coin') { tile.innerText = '🪙'; }
    if (mode === 'player') { tile.innerText = '👾'; }
}

function clearEngine() {
    if(confirm("Apagar o mapa inteiro?")) {
        currentSceneGrid.fill('');
        document.querySelectorAll('.tile').forEach(t => renderTile(t, ''));
    }
}

// === MOTOR DE FÍSICA E LÓGICA DO JOGO ===
let physicsData = { player: null, blocks: [], coins: [] };

function togglePlayMode() {
    const btn = document.getElementById('btn-play');
    const editor = document.getElementById('canvas-2d');
    const screen = document.getElementById('game-screen');

    if (btn.innerText.includes("TESTAR")) {
        // Iniciar Jogo
        if (!currentSceneGrid.includes('player')) return alert("⚠️ Coloque um Player (👾) no mapa primeiro!");
        
        btn.innerText = "🛑 PARAR JOGO";
        btn.style.background = "#ef4444";
        editor.style.display = "none";
        screen.style.display = "block";
        
        buildGameScene(screen);
        startGameLoop();
    } else {
        // Parar Jogo
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

    // O Canvas tem 640px de largura e aprox 430px de altura.
    // Grid 20x12 -> Cada bloco tem 32x35 px (aprox)
    const TILE_W = 32; 
    const TILE_H = 35;

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
    gameLoopInterval = setInterval(updatePhysics, 1000 / 60); // 60 FPS
}

function stopGame() {
    clearInterval(gameLoopInterval);
}

function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y);
}

function updatePhysics() {
    let p = physicsData.player;
    if (!p) return;

    // Movimentação Horizontal (A/D ou Setas)
    if (keys['a'] || keys['arrowleft']) p.vx = -p.speed;
    else if (keys['d'] || keys['arrowright']) p.vx = p.speed;
    else p.vx = 0;

    // Gravidade
    p.vy += 0.6; // Força da gravidade

    // Pulo (W, Espaço ou Seta Cima)
    if ((keys['w'] || keys[' '] || keys['arrowup']) && p.grounded) {
        p.vy = p.jumpPower;
        p.grounded = false;
    }

    // Aplicar Movimento X
    p.x += p.vx;
    
    // Limites da tela X
    if (p.x < 0) p.x = 0;
    if (p.x > 640 - p.w) p.x = 640 - p.w;

    // Colisão Horizontal com Blocos
    for (let b of physicsData.blocks) {
        if (checkCollision(p, b)) {
            if (p.vx > 0) p.x = b.x - p.w; // Batendo na direita
            else if (p.vx < 0) p.x = b.x + b.w; // Batendo na esquerda
            p.vx = 0;
        }
    }

    // Aplicar Movimento Y
    p.y += p.vy;
    p.grounded = false;

    // Colisão Vertical com Blocos
    for (let b of physicsData.blocks) {
        if (checkCollision(p, b)) {
            if (p.vy > 0) { // Caindo em cima do bloco
                p.y = b.y - p.h;
                p.vy = 0;
                p.grounded = true;
            } else if (p.vy < 0) { // Batendo a cabeça
                p.y = b.y + b.h;
                p.vy = 0;
            }
        }
    }

    // Limite da tela Y (Morrer ao cair)
    if (p.y > 450) {
        alert("💀 Você caiu no vazio! Reiniciando...");
        togglePlayMode(); // Para
        setTimeout(togglePlayMode, 500); // Recomeça
        return;
    }

    // Coleta de Moedas
    physicsData.coins.forEach(c => {
        if (!c.collected && checkCollision(p, c)) {
            c.collected = true;
            c.el.style.display = 'none';
            // vortex.giveMoney(1); // Integração futura com o banco de dados
        }
    });

    // Atualiza a posição na tela
    p.el.style.left = p.x + 'px';
    p.el.style.top = p.y + 'px';
    
    // Vira o rostinho (👾) para o lado certo usando scaleX
    if (p.vx < 0) p.el.style.transform = 'scaleX(-1)';
    if (p.vx > 0) p.el.style.transform = 'scaleX(1)';
}

// ==========================================
// 3. VORTEX CODE STUDIO (LINGUAGEM ESTILO PYTHON)
// ==========================================
function createVSCodeDOM() {
    if (document.getElementById('win-vscode')) return;

    const win = document.createElement('div');
    win.id = 'win-vscode';
    win.className = 'window';
    win.style.cssText = "top: 60px; left: 160px; width: 680px; height: 460px; display:none; flex-direction:column;";
    win.innerHTML = `
        <div class="window-header" onmousedown="dragWindow(event, 'win-vscode')">
            <span>📝 Vortex Code Studio (Python-Like API)</span>
            <div class="window-controls">
                <button onclick="minimizeWindow('win-vscode')">➖</button>
                <button onclick="toggleMaximizeWindow('win-vscode')">🔲</button>
                <button class="btn-close" onclick="closeWindow('win-vscode')">❌</button>
            </div>
        </div>
        <div class="window-body" style="display:flex; flex:1; background:#1e1e1e; color:#d4d4d4;">
            <!-- SIDEBAR API DOCS -->
            <div style="width:230px; background:#252526; border-right:1px solid #333; padding:10px; font-size:0.75rem; overflow-y:auto;">
                <h4 style="color:#a78bfa; margin-bottom:8px;">🐍 API Vortex v2</h4>
                <p style="color:#999; margin-bottom:10px;">Sintaxe inspirada em Python. Sem problemas de IndentationError!</p>
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

            <!-- EDITOR AREA -->
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

// INICIALIZAÇÃO ATUALIZADA
window.onload = () => {
    // Cria um ícone na área de trabalho para a Engine!
    const desktop = document.getElementById('desktop');
    if (desktop && !document.getElementById('icon-engine')) {
        const icon = document.createElement('div');
        icon.id = 'icon-engine';
        icon.className = 'desktop-icon';
        icon.onclick = () => openWindow('win-engine');
        icon.innerHTML = `<div class="icon-img">⚡</div><span>Engine</span>`;
        desktop.appendChild(icon);
    }
};
