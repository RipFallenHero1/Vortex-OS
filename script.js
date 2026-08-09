/* ==========================================================================
   VORTEX OS v10.0 — KERNEL & SYSTEM SCRIPT
   ========================================================================== */

// --- ESTADO GLOBAL DO SISTEMA ---
let currentUser = null;
let userBalance = 0;
let vortexScripts = [];
let activeScriptId = null;
let currentSceneObjects = [];
let selectedObj = null;
let currentTool = 'select';
let isTestingEngine = false;

// --- SISTEMA DE HISTÓRICO (DESFAZER / REFAZER) ---
let sceneHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

// --- INICIALIZAÇÃO DO SISTEMA ---
window.addEventListener("DOMContentLoaded", () => {
  initOSClock();
  loadSession();
  setupGlobalShortcuts();
});

function initOSClock() {
  const clockEl = document.getElementById("os-clock");
  setInterval(() => {
    if (!clockEl) return;
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, 1000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================================
   AUTENTICAÇÃO E SESSÃO
   ========================================================================== */
function loginUser() {
  const usernameInput = document.getElementById("auth-username")?.value.trim();
  const pinInput = document.getElementById("auth-pin")?.value.trim();
  const emailInput = document.getElementById("auth-email")?.value.trim();

  if (!usernameInput || !pinInput) {
    return alert("Preencha o Nome de Usuário e o PIN de 4 dígitos.");
  }

  currentUser = {
    username: usernameInput,
    pin: pinInput,
    email: emailInput || `${usernameInput}@vortex.os`
  };

  localStorage.setItem("vortex_user", JSON.stringify(currentUser));
  
  const savedBalance = localStorage.getItem(`vortex_bal_${currentUser.username}`);
  userBalance = savedBalance ? parseFloat(savedBalance) : 100.00;

  updateUIUser();
  document.getElementById("login-screen").style.display = "none";
  loadEngineLocal();
}

function loadSession() {
  const saved = localStorage.getItem("vortex_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      const savedBalance = localStorage.getItem(`vortex_bal_${currentUser.username}`);
      userBalance = savedBalance ? parseFloat(savedBalance) : 100.00;
      updateUIUser();
      document.getElementById("login-screen").style.display = "none";
      loadEngineLocal();
    } catch (e) {
      console.error("Erro ao carregar sessão", e);
    }
  }
}

function logoutUser() {
  localStorage.removeItem("vortex_user");
  location.reload();
}

function updateUIUser() {
  if (!currentUser) return;
  
  const elements = {
    "start-username": currentUser.username,
    "start-email": currentUser.email,
    "messenger-me": `@${currentUser.username}`,
    "settings-user": currentUser.username,
    "settings-email": currentUser.email,
    "pay-balance": userBalance.toFixed(2),
    "user-balance": userBalance.toFixed(2)
  };

  for (const [id, val] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  }
}

function powerOn() {
  document.getElementById("shutdown-screen").style.display = "none";
}

function shutdownPC() {
  document.getElementById("shutdown-screen").style.display = "flex";
}

/* ==========================================================================
   GERENCIADOR DE JANELAS
   ========================================================================== */
function openWindow(id) {
  const win = document.getElementById(id);
  if (win) {
    win.style.display = "flex";
    win.style.zIndex = getNextZIndex();
    if (id === 'win-engine') {
      renderEngineScene();
      renderHierarchy();
      updateInspector();
    }
    if (id === 'win-store') {
      loadStoreApps();
    }
  }
}

function closeWindow(id) {
  const win = document.getElementById(id);
  if (win) win.style.display = "none";
  if (id === 'win-engine' && isTestingEngine) {
    toggleEngineTestMode();
  }
}

function getNextZIndex() {
  let max = 100;
  document.querySelectorAll(".window").forEach(w => {
    const z = parseInt(window.getComputedStyle(w).zIndex) || 0;
    if (z > max) max = z;
  });
  return max + 1;
}

function toggleStartMenu() {
  const menu = document.getElementById("start-menu");
  if (menu) {
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  }
}

let activeDragWin = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function dragWindow(e, winId) {
  activeDragWin = document.getElementById(winId);
  if (!activeDragWin) return;
  
  activeDragWin.style.zIndex = getNextZIndex();
  const rect = activeDragWin.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  document.addEventListener("mousemove", onWindowMove);
  document.addEventListener("mouseup", onWindowUp);
}

function onWindowMove(e) {
  if (!activeDragWin) return;
  activeDragWin.style.left = `${e.clientX - dragOffsetX}px`;
  activeDragWin.style.top = `${e.clientY - dragOffsetY}px`;
}

function onWindowUp() {
  activeDragWin = null;
  document.removeEventListener("mousemove", onWindowMove);
  document.removeEventListener("mouseup", onWindowUp);
}

/* ==========================================================================
   VORTEX ENGINE 2D — HISTÓRICO, FERRAMENTAS E CENA
   ========================================================================== */
function recordEngineState() {
  if (historyIndex < sceneHistory.length - 1) {
    sceneHistory = sceneHistory.slice(0, historyIndex + 1);
  }

  const stateCopy = JSON.parse(JSON.stringify(currentSceneObjects));
  sceneHistory.push(stateCopy);

  if (sceneHistory.length > MAX_HISTORY) {
    sceneHistory.shift();
  } else {
    historyIndex++;
  }
}

function undoEngineAction() {
  if (historyIndex > 0) {
    historyIndex--;
    currentSceneObjects = JSON.parse(JSON.stringify(sceneHistory[historyIndex]));
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

function redoEngineAction() {
  if (historyIndex < sceneHistory.length - 1) {
    historyIndex++;
    currentSceneObjects = JSON.parse(JSON.stringify(sceneHistory[historyIndex]));
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

function setupGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
    const winEngine = document.getElementById("win-engine");
    const isEditingText = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);

    if (winEngine && winEngine.style.display !== "none" && !isEditingText) {
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          redoEngineAction();
        } else {
          undoEngineAction();
        }
        e.preventDefault();
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        redoEngineAction();
        e.preventDefault();
      }
    }
  });
}

function setEngineTool(tool) {
  currentTool = tool;
  const label = document.getElementById("engine-tool-label");
  if (label) {
    const names = {
      select: 'Selecionar / Mover',
      scale: 'Ajustar Tamanho',
      square: 'Adicionar Quadrado',
      circle: 'Adicionar Círculo',
      triangle: 'Adicionar Triângulo',
      erase: 'Apagar Objeto'
    };
    label.innerText = names[tool] || tool;
  }
}

function addEngineObject(type) {
  const newObj = {
    id: "obj_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: type.charAt(0).toUpperCase() + type.slice(1) + "_" + (currentSceneObjects.length + 1),
    type: type,
    x: 80 + (currentSceneObjects.length * 20) % 300,
    y: 80 + (currentSceneObjects.length * 20) % 200,
    w: type === 'player' ? 32 : (type === 'coin' ? 24 : 40),
    h: type === 'player' ? 48 : (type === 'coin' ? 24 : 40),
    color: type === 'player' ? '#e74c3c' : (type === 'coin' ? '#f1c40f' : '#3b82f6')
  };

  currentSceneObjects.push(newObj);
  selectedObj = newObj;
  
  recordEngineState();
  renderEngineScene();
  renderHierarchy();
  updateInspector();
}

function clearScene() {
  if (confirm("Deseja realmente limpar toda a cena?")) {
    currentSceneObjects = [];
    selectedObj = null;
    recordEngineState();
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

function renderEngineScene() {
  const canvasContainer = document.getElementById("canvas-2d");
  if (!canvasContainer) return;

  canvasContainer.innerHTML = "";

  currentSceneObjects.forEach(obj => {
    const el = document.createElement("div");
    el.className = `engine-obj ${selectedObj && selectedObj.id === obj.id ? 'selected' : ''}`;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.w}px`;
    el.style.height = `${obj.h}px`;
    el.style.backgroundColor = obj.color || '#3b82f6';
    el.style.position = 'absolute';
    el.style.boxSizing = 'border-box';
    if (selectedObj && selectedObj.id === obj.id) {
      el.style.outline = '2px dashed #fff';
    }
    if (obj.type === 'circle' || obj.type === 'coin') el.style.borderRadius = '50%';

    el.onclick = (e) => {
      e.stopPropagation();
      if (currentTool === 'erase') {
        currentSceneObjects = currentSceneObjects.filter(o => o.id !== obj.id);
        if (selectedObj && selectedObj.id === obj.id) selectedObj = null;
        recordEngineState();
        renderEngineScene();
        renderHierarchy();
        updateInspector();
        return;
      }
      selectedObj = obj;
      renderEngineScene();
      renderHierarchy();
      updateInspector();
    };

    canvasContainer.appendChild(el);
  });
}

function renderHierarchy() {
  const tree = document.getElementById("hierarchy-tree");
  if (!tree) return;

  tree.innerHTML = "";

  currentSceneObjects.forEach(obj => {
    const li = document.createElement("li");
    li.className = `tree-item ${selectedObj && selectedObj.id === obj.id ? 'active' : ''}`;
    li.style.cssText = "padding:4px 8px; cursor:pointer; font-size:13px;";
    li.innerText = `📦 ${obj.name}`;
    li.onclick = () => {
      selectedObj = obj;
      renderEngineScene();
      renderHierarchy();
      updateInspector();
    };
    tree.appendChild(li);
  });
}

/**
 * INSPETOR COM COLOR PICKER / PALETA DA UNITY
 */
function updateInspector() {
  const container = document.getElementById("inspector-content");
  if (!container) return;

  if (!selectedObj) {
    container.innerHTML = `<div class="inspector-empty" style="padding:15px;color:#888;">Selecione um objeto para editar.</div>`;
    return;
  }

  const hexColor = selectedObj.color || "#3b82f6";

  container.innerHTML = `
    <div style="padding:10px; display:flex; flex-direction:column; gap:12px;">
      <div>
        <label style="font-size:12px; opacity:0.8;">Nome</label>
        <input type="text" id="insp-name" value="${escapeHtml(selectedObj.name || '')}" style="width:100%; padding:6px; background:#111; border:1px solid #333; color:#fff; border-radius:4px; margin-top:2px;">
      </div>

      <div>
        <label style="font-size:12px; opacity:0.8;">Cor do Objeto (Paleta)</label>
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <input type="color" id="insp-color" value="${hexColor}" 
                 style="border:none; width:44px; height:32px; cursor:pointer; background:transparent; padding:0; border-radius:4px;">
          <span id="insp-color-hex" style="font-size:12px; opacity:0.8; font-family:monospace;">${hexColor}</span>
        </div>
      </div>

      <div>
        <label style="font-size:12px; opacity:0.8;">Posição X / Y</label>
        <div style="display:flex; gap:6px; margin-top:2px;">
          <input type="number" id="insp-x" value="${Math.round(selectedObj.x || 0)}" style="width:50%; padding:6px; background:#111; border:1px solid #333; color:#fff; border-radius:4px;">
          <input type="number" id="insp-y" value="${Math.round(selectedObj.y || 0)}" style="width:50%; padding:6px; background:#111; border:1px solid #333; color:#fff; border-radius:4px;">
        </div>
      </div>

      <div>
        <label style="font-size:12px; opacity:0.8;">Largura / Altura</label>
        <div style="display:flex; gap:6px; margin-top:2px;">
          <input type="number" id="insp-w" value="${Math.round(selectedObj.w || 30)}" style="width:50%; padding:6px; background:#111; border:1px solid #333; color:#fff; border-radius:4px;">
          <input type="number" id="insp-h" value="${Math.round(selectedObj.h || 30)}" style="width:50%; padding:6px; background:#111; border:1px solid #333; color:#fff; border-radius:4px;">
        </div>
      </div>
    </div>
  `;

  const colorInput = document.getElementById("insp-color");
  const hexDisplay = document.getElementById("insp-color-hex");

  if (colorInput) {
    colorInput.onchange = () => recordEngineState();
    colorInput.oninput = (e) => {
      selectedObj.color = e.target.value;
      if (hexDisplay) hexDisplay.innerText = e.target.value;
      renderEngineScene();
    };
  }

  document.getElementById("insp-name")?.addEventListener("change", (e) => {
    selectedObj.name = e.target.value;
    renderHierarchy();
    recordEngineState();
  });

  document.getElementById("insp-x")?.addEventListener("change", (e) => {
    selectedObj.x = parseFloat(e.target.value) || 0;
    renderEngineScene();
    recordEngineState();
  });
  document.getElementById("insp-y")?.addEventListener("change", (e) => {
    selectedObj.y = parseFloat(e.target.value) || 0;
    renderEngineScene();
    recordEngineState();
  });

  document.getElementById("insp-w")?.addEventListener("change", (e) => {
    selectedObj.w = parseFloat(e.target.value) || 10;
    renderEngineScene();
    recordEngineState();
  });
  document.getElementById("insp-h")?.addEventListener("change", (e) => {
    selectedObj.h = parseFloat(e.target.value) || 10;
    renderEngineScene();
    recordEngineState();
  });
}

/* ==========================================================================
   VORTEX CODE — CRIAR, EDITAR E EXCLUIR SCRIPTS .VORTEX
   ========================================================================== */
function createVortexScript() {
  const name = prompt("Nome do novo script .vortex:", "main");
  if (!name) return;

  const newScript = {
    id: "script_" + Date.now(),
    name: name.replace(/\.vortex$/i, ""),
    code: `# Script: ${name}\ndef _ready():\n    pass\n\ndef _update():\n    pass\n`
  };

  vortexScripts.push(newScript);
  activeScriptId = newScript.id;
  
  saveEngineLocal();
  renderHierarchy();
  renderScriptsSidebarList();
  openVortexScriptEditor(newScript.id);
}

function deleteActiveVortexScript() {
  if (!activeScriptId) {
    return alert("Nenhum script selecionado para excluir!");
  }

  const scriptToDelete = vortexScripts.find(x => x.id === activeScriptId);
  if (!scriptToDelete) {
    return alert("Script não encontrado!");
  }

  if (!confirm(`Tem certeza que deseja apagar o script "${scriptToDelete.name}.vortex"?`)) {
    return;
  }

  vortexScripts = vortexScripts.filter(x => x.id !== activeScriptId);
  activeScriptId = vortexScripts[0]?.id || null;

  saveEngineLocal();
  renderHierarchy();
  renderScriptsSidebarList();

  if (activeScriptId) {
    openVortexScriptEditor(activeScriptId);
  } else {
    const fileNameEl = document.getElementById("vortex-filename");
    const codeEditorEl = document.getElementById("vortex-code-editor");
    if (fileNameEl) fileNameEl.value = "";
    if (codeEditorEl) codeEditorEl.value = "# Nenhum script aberto.";
  }
}

function openVortexScriptEditor(scriptId) {
  const sc = vortexScripts.find(x => x.id === scriptId);
  if (!sc) return;

  activeScriptId = sc.id;
  
  const fileNameEl = document.getElementById("vortex-filename");
  const codeEditorEl = document.getElementById("vortex-code-editor");

  if (fileNameEl) fileNameEl.value = sc.name;
  if (codeEditorEl) codeEditorEl.value = sc.code;

  renderScriptsSidebarList();
  openWindow('win-vscode');
}

function saveVortexScript() {
  if (!activeScriptId) return alert("Crie ou selecione um script para salvar.");
  
  const sc = vortexScripts.find(x => x.id === activeScriptId);
  if (!sc) return;

  const fileNameEl = document.getElementById("vortex-filename");
  const codeEditorEl = document.getElementById("vortex-code-editor");

  if (fileNameEl) sc.name = fileNameEl.value.trim() || "script";
  if (codeEditorEl) sc.code = codeEditorEl.value;

  saveEngineLocal();
  renderHierarchy();
  renderScriptsSidebarList();
  alert("Script salvo!");
}

function renderScriptsSidebarList() {
  const list = document.getElementById("vscode-scripts-list");
  if (!list) return;
  list.innerHTML = "";

  vortexScripts.forEach(s => {
    const li = document.createElement("li");
    if (s.id === activeScriptId) li.style.fontWeight = "bold";
    li.style.cssText = "padding:6px 10px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
    li.innerText = `${s.id === activeScriptId ? "➤ " : ""}▣ ${s.name}.vortex`;
    li.onclick = () => openVortexScriptEditor(s.id);
    list.appendChild(li);
  });
}

function saveEngineLocal() {
  if (!currentUser) return;
  const data = {
    objects: currentSceneObjects,
    scripts: vortexScripts
  };
  localStorage.setItem(`vortex_engine_${currentUser.username}`, JSON.stringify(data));
}

function loadEngineLocal() {
  if (!currentUser) return;
  const saved = localStorage.getItem(`vortex_engine_${currentUser.username}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      currentSceneObjects = parsed.objects || [];
      vortexScripts = parsed.scripts || [];
      if (vortexScripts.length > 0) activeScriptId = vortexScripts[0].id;
    } catch (e) {
      console.error("Erro ao carregar Engine local", e);
    }
  }
  recordEngineState();
  renderEngineScene();
  renderHierarchy();
  renderScriptsSidebarList();
}

/* ==========================================================================
   SIMULAÇÃO / TESTE DA ENGINE
   ========================================================================== */
function toggleEngineTestMode() {
  const testScreen = document.getElementById("engine-test-screen");
  const testBtn = document.getElementById("btn-engine-test");

  if (!isTestingEngine) {
    isTestingEngine = true;
    if (testBtn) testBtn.innerText = "⏹ PARAR";
    if (testScreen) testScreen.style.display = "block";
    runEngineSimulation();
  } else {
    isTestingEngine = false;
    if (testBtn) testBtn.innerText = "▶ TESTAR";
    if (testScreen) testScreen.style.display = "none";
  }
}

function runEngineSimulation() {
  const testScreen = document.getElementById("engine-test-screen");
  if (!testScreen) return;

  testScreen.innerHTML = "";
  const simObjects = JSON.parse(JSON.stringify(currentSceneObjects));

  simObjects.forEach(obj => {
    const el = document.createElement("div");
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.w}px`;
    el.style.height = `${obj.h}px`;
    el.style.backgroundColor = obj.color || '#3b82f6';
    el.style.position = 'absolute';
    if (obj.type === 'circle' || obj.type === 'coin') el.style.borderRadius = '50%';
    testScreen.appendChild(el);
  });
}

function runScriptFromStudio() {
  saveVortexScript();
  openWindow('win-engine');
  if (!isTestingEngine) toggleEngineTestMode();
}

/* ==========================================================================
   PUBLICAÇÃO E LOJA DE JOGOS (.VEXE)
   ========================================================================== */
function openPublishModalFromEngine() {
  document.getElementById("publish-modal").style.display = "flex";
}

function closePublishModal() {
  document.getElementById("publish-modal").style.display = "none";
}

function compileAndPublishEngineGame() {
  const title = document.getElementById("app-title-input")?.value.trim() || "Jogo Vortex";
  const price = parseFloat(document.getElementById("app-price-input")?.value) || 0;

  const newApp = {
    id: "app_" + Date.now(),
    title: title,
    price: price,
    author: currentUser ? currentUser.username : "Anônimo",
    objects: JSON.parse(JSON.stringify(currentSceneObjects)),
    scripts: JSON.parse(JSON.stringify(vortexScripts))
  };

  let globalApps = JSON.parse(localStorage.getItem("vortex_global_apps") || "[]");
  globalApps.push(newApp);
  localStorage.setItem("vortex_global_apps", JSON.stringify(globalApps));

  closePublishModal();
  alert(`Jogo "${title}" publicado na Loja Vortex!`);
  loadStoreApps();
}

function loadStoreApps() {
  const grid = document.getElementById("global-apps-list");
  if (!grid) return;

  const globalApps = JSON.parse(localStorage.getItem("vortex_global_apps") || "[]");
  if (globalApps.length === 0) {
    grid.innerHTML = "<p class='muted'>Nenhum jogo publicado na loja ainda.</p>";
    return;
  }

  grid.innerHTML = "";
  globalApps.forEach(app => {
    const card = document.createElement("div");
    card.style.cssText = "background:#1e1e2e; padding:15px; border-radius:8px; border:1px solid #333;";
    card.innerHTML = `
      <b style="display:block;font-size:16px;">${escapeHtml(app.title)}</b>
      <small style="opacity:0.7;">por @${escapeHtml(app.author)}</small>
      <button class="btn primary" style="width:100%;margin-top:10px;" onclick="playStoreApp('${app.id}')">
        ${app.price > 0 ? `Comprar (R$ ${app.price.toFixed(2)})` : 'Jogar Grátis'}
      </button>
    `;
    grid.appendChild(card);
  });
}

function playStoreApp(appId) {
  const globalApps = JSON.parse(localStorage.getItem("vortex_global_apps") || "[]");
  const app = globalApps.find(a => a.id === appId);
  if (!app) return alert("Jogo não encontrado.");

  const runnerTitle = document.getElementById("runner-title");
  const runnerCanvas = document.getElementById("runner-canvas");

  if (runnerTitle) runnerTitle.innerText = app.title;
  if (runnerCanvas) {
    runnerCanvas.innerHTML = "";
    app.objects.forEach(obj => {
      const el = document.createElement("div");
      el.style.left = `${obj.x}px`;
      el.style.top = `${obj.y}px`;
      el.style.width = `${obj.w}px`;
      el.style.height = `${obj.h}px`;
      el.style.backgroundColor = obj.color || '#3b82f6';
      el.style.position = 'absolute';
      if (obj.type === 'circle' || obj.type === 'coin') el.style.borderRadius = '50%';
      runnerCanvas.appendChild(el);
    });
  }

  openWindow('win-runner');
}

/* ==========================================================================
   VORTEX PAY (PIX)
   ========================================================================== */
function openPix() {
  openWindow('win-pix');
}

function sendPix() {
  const recipient = document.getElementById("pix-recipient")?.value.trim();
  const amount = parseFloat(document.getElementById("pix-amount")?.value);

  if (!recipient || isNaN(amount) || amount <= 0) {
    return alert("Preencha o destinatário e um valor válido!");
  }

  if (amount > userBalance) {
    return alert("Saldo insuficiente!");
  }

  userBalance -= amount;
  localStorage.setItem(`vortex_bal_${currentUser.username}`, userBalance);
  updateUIUser();
  alert(`Pix de R$ ${amount.toFixed(2)} enviado para ${recipient}!`);
}

function claimDailyReward() {
  userBalance += 10.00;
  localStorage.setItem(`vortex_bal_${currentUser.username}`, userBalance);
  updateUIUser();
  alert("Você resgatou sua diária de R$ 10,00!");
}

/* ==========================================================================
   NAVEGADOR E CHAT MESSENGER
   ========================================================================== */
function navigateBrowser() {
  const urlInput = document.getElementById("browser-url")?.value.trim();
  const iframe = document.getElementById("browser-iframe");
  if (!urlInput || !iframe) return;

  let targetUrl = urlInput;
  if (!/^https?:\/\//i.test(targetUrl)) {
    if (targetUrl.includes('.')) {
      targetUrl = 'https://' + targetUrl;
    } else {
      targetUrl = 'https://www.bing.com/search?q=' + encodeURIComponent(targetUrl);
    }
  }

  iframe.src = targetUrl;
}

function browserNav(action) {
  const iframe = document.getElementById("browser-iframe");
  if (!iframe) return;
  
  if (action === 'reload') iframe.src = iframe.src;
  if (action === 'home') iframe.src = 'https://www.bing.com';
}

function sendEmoji(emoji) {
  const input = document.getElementById("message-input");
  if (input) input.value += emoji;
}

function sendMessage() {
  const input = document.getElementById("message-input");
  const messagesContainer = document.getElementById("messages");
  if (!input || !messagesContainer) return;

  const text = input.value.trim();
  if (!text) return;

  const msgEl = document.createElement("div");
  msgEl.style.cssText = "margin-bottom:8px; text-align:right;";
  msgEl.innerHTML = `<span style="background:#3b82f6; color:#fff; padding:6px 12px; border-radius:12px; display:inline-block; max-width:70%; text-align:left;">${escapeHtml(text)}</span>`;

  messagesContainer.appendChild(msgEl);
  input.value = "";
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function triggerImageUpload() {
  document.getElementById("image-input")?.click();
}

function handleImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const messagesContainer = document.getElementById("messages");
    if (!messagesContainer) return;

    const msgEl = document.createElement("div");
    msgEl.style.cssText = "margin-bottom:8px; text-align:right;";
    msgEl.innerHTML = `<img src="${event.target.result}" style="max-width:200px; border-radius:8px; border:1px solid #444;">`;

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };
  reader.readAsDataURL(file);
}

function addFriend() {
  const nick = document.getElementById("friend-nick")?.value.trim();
  if (!nick) return;

  const list = document.getElementById("friends-list");
  if (list) {
    const item = document.createElement("div");
    item.style.cssText = "padding:6px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);";
    item.innerText = nick.startsWith('@') ? nick : `@${nick}`;
    list.appendChild(item);
  }
  document.getElementById("friend-nick").value = "";
}

function openGroupCreator() {
  openWindow('win-group-create');
}

function createGroup() {
  const name = document.getElementById("group-name")?.value.trim();
  if (!name) return;

  const list = document.getElementById("groups-list");
  if (list) {
    const item = document.createElement("div");
    item.style.cssText = "padding:6px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);";
    item.innerText = `👥 ${name}`;
    list.appendChild(item);
  }

  closeWindow('win-group-create');
}

/* ==========================================================================
   TERMINAL E CALCULADORA
   ========================================================================== */
function handleTerminal(e) {
  if (e.key === 'Enter') {
    const input = e.target;
    const cmd = input.value.trim();
    const output = document.getElementById("terminal-output");
    if (!output) return;

    output.innerHTML += `<div>&gt; ${escapeHtml(cmd)}</div>`;

    if (cmd === 'help') {
      output.innerHTML += `<div>Comandos: help, clear, balance, user, date</div>`;
    } else if (cmd === 'clear') {
      output.innerHTML = "";
    } else if (cmd === 'balance') {
      output.innerHTML += `<div>Saldo: R$ ${userBalance.toFixed(2)}</div>`;
    } else if (cmd === 'user') {
      output.innerHTML += `<div>Usuário: ${currentUser ? currentUser.username : 'Offline'}</div>`;
    } else if (cmd === 'date') {
      output.innerHTML += `<div>${new Date().toLocaleString()}</div>`;
    } else {
      output.innerHTML += `<div>Comando não reconhecido. Digite 'help'.</div>`;
    }

    input.value = "";
    output.scrollTop = output.scrollHeight;
  }
}

function calcInput(val) {
  const display = document.getElementById("calc-display");
  if (display) display.value += val;
}

function calcClear() {
  const display = document.getElementById("calc-display");
  if (display) display.value = "";
}

function calcEval() {
  const display = document.getElementById("calc-display");
  if (!display) return;
  try {
    display.value = eval(display.value.replace(/×/g, '*').replace(/÷/g, '/'));
  } catch (e) {
    display.value = "Erro";
  }
}

function setTheme(theme) {
  document.body.className = `theme-${theme}`;
}
