/* ==========================================================================
   1. HISTÓRICO DA ENGINE (UNDO / REDO + ATALHOS CTRL+Z / CTRL+Y)
   ========================================================================== */
let sceneHistory = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

/**
 * Grava o estado atual da cena no histórico
 */
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

/**
 * Desfaz a última alteração (Ctrl + Z)
 */
function undoEngineAction() {
  if (historyIndex > 0) {
    historyIndex--;
    currentSceneObjects = JSON.parse(JSON.stringify(sceneHistory[historyIndex]));
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

/**
 * Refaz a alteração desfeita (Ctrl + Y)
 */
function redoEngineAction() {
  if (historyIndex < sceneHistory.length - 1) {
    historyIndex++;
    currentSceneObjects = JSON.parse(JSON.stringify(sceneHistory[historyIndex]));
    renderEngineScene();
    renderHierarchy();
    updateInspector();
  }
}

// Escutador de teclas para desfazer e refazer estilo Unity
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


/* ==========================================================================
   2. EXCLUIR SCRIPT ATIVO
   ========================================================================== */
function deleteActiveVortexScript() {
  if (!activeScriptId) {
    return alert("Nenhum script selecionado para excluir!");
  }

  const scriptToDelete = vortexScripts.find(x => x.id === activeScriptId);
  if (!scriptToDelete) {
    return alert("Nenhum script encontrado!");
  }

  if (!confirm(`Deseja realmente apagar o script "${scriptToDelete.name}.vortex"?`)) {
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


/* ==========================================================================
   3. RENDERIZAÇÃO DA LISTA DE SCRIPTS NA SIDEBAR
   ========================================================================== */
function renderScriptsSidebarList() {
  const list = document.getElementById("vscode-scripts-list");
  if (!list) return;
  list.innerHTML = "";

  vortexScripts.forEach(s => {
    const li = document.createElement("li");
    if (s.id === activeScriptId) li.classList.add("active");
    li.style.cssText = "padding:6px 10px; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
    li.title = `${escapeHtml(s.name)}.vortex`;
    li.innerText = `${s.id === activeScriptId ? "➤ " : ""}▣ ${s.name}.vortex`;

    li.onclick = () => openVortexScriptEditor(s.id);
    list.appendChild(li);
  });
}


/* ==========================================================================
   4. INSPETOR COM PALETA DE CORES (COLOR PICKER NATVO DA UNITY)
   ========================================================================== */
function updateInspector() {
  const container = document.getElementById("inspector-content");
  if (!container) return;

  if (!selectedObj) {
    container.innerHTML = `<div class="inspector-empty">Selecione um objeto.</div>`;
    return;
  }

  const hexColor = selectedObj.color || "#3b82f6";

  container.innerHTML = `
    <div class="inspector-prop">
      <label>Nome</label>
      <input type="text" id="insp-name" value="${escapeHtml(selectedObj.name || '')}">
    </div>

    <div class="inspector-prop">
      <label>Cor do Objeto</label>
      <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
        <input type="color" id="insp-color" value="${hexColor}" 
               style="border:none; width:42px; height:32px; cursor:pointer; background:transparent; padding:0; border-radius:4px;">
        <span id="insp-color-hex" style="font-size:12px; opacity:0.8; font-family:monospace;">${hexColor}</span>
      </div>
    </div>

    <div class="inspector-prop">
      <label>Posição X / Y</label>
      <div style="display:flex; gap:6px;">
        <input type="number" id="insp-x" value="${Math.round(selectedObj.x || 0)}">
        <input type="number" id="insp-y" value="${Math.round(selectedObj.y || 0)}">
      </div>
    </div>

    <div class="inspector-prop">
      <label>Tamanho W / H</label>
      <div style="display:flex; gap:6px;">
        <input type="number" id="insp-w" value="${Math.round(selectedObj.w || 30)}">
        <input type="number" id="insp-h" value="${Math.round(selectedObj.h || 30)}">
      </div>
    </div>
  `;

  // Seletor de cores em tempo real + gravação de histórico
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

  // Nome do Objeto
  document.getElementById("insp-name")?.addEventListener("change", (e) => {
    selectedObj.name = e.target.value;
    renderHierarchy();
    recordEngineState();
  });

  // Posições X / Y
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

  // Dimensões W / H
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
