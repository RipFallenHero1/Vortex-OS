// ==========================================
// BANCO DE DADOS E REGISTRO DE SITES (.vort)
// ==========================================
let historyStack = [];

// Inicializa ou carrega sites do localStorage
function getSitesRegistry() {
  const saved = localStorage.getItem('vort_sites');
  if (saved) {
    return JSON.parse(saved);
  }
  
  // Site padrão inicial
  const defaultRegistry = {
    "meusite.vort": {
      title: "Meu Primeiro Site Vortex",
      html: `<div class="container">\n  <h1>⚡ Bem-vindo ao Vortex OS 1.3!</h1>\n  <p>Este site está hospedado na rede .vort do seu sistema.</p>\n  <button onclick="mostrarMensagem()">Testar JavaScript</button>\n</div>`,
      css: `body { background: #0f172a; color: white; font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }\n.container { text-align: center; background: #1e293b; padding: 2.5rem; border-radius: 16px; border: 1px solid #334155; shadow: 0 10px 25px rgba(0,0,0,0.5); }\nh1 { color: #38bdf8; }\nbutton { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; }\nbutton:hover { background: #4f46e5; }`,
      js: `function mostrarMensagem() {\n  alert('O JavaScript do seu site .vort funcionou perfeitamente!');\n}`
    }
  };
  localStorage.setItem('vort_sites', JSON.stringify(defaultRegistry));
  return defaultRegistry;
}

// ==========================================
// SISTEMA DE JANELAS E MENU INICIAR
// ==========================================
function openApp(appId) {
  document.getElementById(appId).classList.remove('hidden');
}

function closeApp(appId) {
  document.getElementById(appId).classList.add('hidden');
}

function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn = document.getElementById('start-button');
  menu.classList.toggle('hidden');
  
  if (!menu.classList.contains('hidden')) {
    btn.classList.add('bg-indigo-600', 'text-white');
  } else {
    btn.classList.remove('bg-indigo-600', 'text-white');
  }
}

// Relógio da Taskbar
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('system-clock').textContent = timeString;
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// NAVEGADOR VORTEX (.vort)
// ==========================================
function navigateToDomain(domain) {
  let target = domain.trim().toLowerCase();
  if (!target.endsWith('.vort')) {
    target += '.vort';
  }

  document.getElementById('browser-url-input').value = target;
  document.getElementById('browser-tab-title').textContent = target;

  const registry = getSitesRegistry();
  const site = registry[target];
  const viewport = document.getElementById('browser-viewport');

  if (site) {
    viewport.srcdoc = `
      <!DOCTYPE html>
      <html>
        <head><style>${site.css}</style></head>
        <body>
          ${site.html}
          <script>${site.js}</script>
        </body>
      </html>
    `;
  } else {
    viewport.srcdoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background: #020617; color: #94a3b8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            h2 { color: #f87171; margin-bottom: 5px; }
            p { font-size: 14px; color: #64748b; }
            code { color: #38bdf8; font-family: monospace; }
          </style>
        </head>
        <body>
          <h2>404 - Site Não Encontrado</h2>
          <p>O domínio <code>${target}</code> ainda não foi publicado na rede .vort.</p>
          <p>Crie este site usando o <strong>Vortex Web Studio</strong>!</p>
        </body>
      </html>
    `;
  }

  // Atualiza Histórico
  if (!historyStack.includes(target)) {
    historyStack.unshift(target);
    renderHistory();
  }
}

function handleBrowserSearch(event) {
  event.preventDefault();
  const inputVal = document.getElementById('browser-url-input').value;
  navigateToDomain(inputVal);
}

function reloadBrowser() {
  const current = document.getElementById('browser-url-input').value;
  navigateToDomain(current);
}

function toggleHistoryDrawer() {
  document.getElementById('history-drawer').classList.toggle('hidden');
}

function renderHistory() {
  const listContainer = document.getElementById('history-list');
  listContainer.innerHTML = '';

  historyStack.forEach(url => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-xs font-mono text-cyan-400 truncate block";
    btn.textContent = url;
    btn.onclick = () => {
      navigateToDomain(url);
      toggleHistoryDrawer();
    };
    listContainer.appendChild(btn);
  });
}

// ==========================================
// VORTEX WEB STUDIO (CRIADOR DE SITES)
// ==========================================
const defaultCode = {
  html: `<div class="card">\n  <h1>Meu Site no Vortex!</h1>\n  <p>Programado e publicado com o Vortex Web Studio.</p>\n  <button onclick="acao()">Clique Aqui</button>\n</div>`,
  css: `body {\n  background: #0f172a;\n  color: white;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  background: #1e293b;\n  padding: 2rem;\n  border-radius: 12px;\n  text-align: center;\n  border: 1px solid #334155;\n}\n\nbutton {\n  background: #6366f1;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n}`,
  js: `function acao() {\n  alert('Seu site .vort está funcionando 100%!');\n}`
};

// Inicializa valores nos textareas
document.getElementById('code-html').value = defaultCode.html;
document.getElementById('code-css').value = defaultCode.css;
document.getElementById('code-js').value = defaultCode.js;

function updateStudioPreview() {
  const html = document.getElementById('code-html').value;
  const css = document.getElementById('code-css').value;
  const js = document.getElementById('code-js').value;

  const preview = document.getElementById('studio-preview');
  preview.srcdoc = `
    <!DOCTYPE html>
    <html>
      <head><style>${css}</style></head>
      <body>
        ${html}
        <script>${js}</script>
      </body>
    </html>
  `;
}

// Atualização em tempo real enquanto digita
['code-html', 'code-css', 'code-js'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateStudioPreview);
});

function switchTab(tabName) {
  // Ocultar todos os textareas
  document.querySelectorAll('.code-area').forEach(el => el.classList.add('hidden'));
  
  // Tirar estilo ativo de todos os botões de aba
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active-tab');
    btn.classList.add('text-slate-500');
  });

  // Mostrar aba selecionada
  document.getElementById(`code-${tabName}`).classList.remove('hidden');
  const activeBtn = document.getElementById(`tab-${tabName}`);
  activeBtn.classList.add('active-tab');
  activeBtn.classList.remove('text-slate-500');
}

function publishSite() {
  let domain = document.getElementById('studio-domain-input').value.trim().toLowerCase();
  if (!domain) domain = "meusite";
  if (!domain.endsWith('.vort')) domain += '.vort';

  const html = document.getElementById('code-html').value;
  const css = document.getElementById('code-css').value;
  const js = document.getElementById('code-js').value;

  const registry = getSitesRegistry();
  registry[domain] = {
    title: domain,
    html: html,
    css: css,
    js: js
  };

  localStorage.setItem('vort_sites', JSON.stringify(registry));

  alert(`🚀 O site "${domain}" foi publicado com sucesso!\nVocê já pode acessá-lo no Navegador Vortex.`);
  
  // Abre o navegador automaticamente exibindo o site publicado
  openApp('browser-app');
  navigateToDomain(domain);
}

// Inicializa primeira navegação do browser e preview do studio ao carregar
window.onload = () => {
  navigateToDomain('meusite.vort');
  updateStudioPreview();
};
