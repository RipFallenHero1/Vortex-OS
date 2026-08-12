import React, { useState, useEffect } from 'react';

// ==========================================
// ÍCONES SVG PERSONALIZADOS (100% CSS/TAILWIND)
// ==========================================
const VortexIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M12 6C8.68 6 6 8.68 6 12C6 15.32 8.68 18 12 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const ChromeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <line x1="21.17" y1="8" x2="12" y2="8" />
    <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
    <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
  </svg>
);

const CodeIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const HistoryIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function VortexOS() {
  // Estado de Janelas e Sistema
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [activeApp, setActiveApp] = useState(null); // 'browser' | 'creator' | null

  // Registro de Sites .vort (Persistência Local)
  const [publishedSites, setPublishedSites] = useState(() => {
    const saved = localStorage.getItem('vort_sites');
    return saved ? JSON.parse(saved) : {
      "meusite.vort": {
        title: "Meu Primeiro Site Vortex",
        html: "<div class='content'><h1>Bem-vindo ao Vortex OS!</h1><p>Este é um site hospedado no ecossistema .vort</p></div>",
        css: ".content { font-family: sans-serif; text-align: center; margin-top: 50px; color: #3b82f6; }",
        js: "console.log('Site .vort carregado!');"
      }
    };
  });

  // Salva no localStorage sempre que um novo site for publicado
  useEffect(() => {
    localStorage.setItem('vort_sites', JSON.stringify(publishedSites));
  }, [publishedSites]);

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-slate-950">
      
      {/* AREA DE TRABALHO / DESKTOP */}
      <div className="p-6 grid grid-cols-1 gap-6 w-32">
        <DesktopShortcut 
          title="Navegador Vortex" 
          icon={<ChromeIcon className="w-8 h-8 text-cyan-400" />}
          onClick={() => setActiveApp('browser')}
        />
        <DesktopShortcut 
          title="Vortex Web Studio" 
          icon={<CodeIcon className="w-8 h-8 text-indigo-400" />}
          onClick={() => setActiveApp('creator')}
        />
      </div>

      {/* JANELAS ATIVAS */}
      {activeApp === 'browser' && (
        <VortexBrowserApp 
          onClose={() => setActiveApp(null)} 
          publishedSites={publishedSites}
        />
      )}

      {activeApp === 'creator' && (
        <VortexWebStudio 
          onClose={() => setActiveApp(null)}
          onPublish={(domain, data) => {
            setPublishedSites(prev => ({ ...prev, [domain]: data }));
            alert(`Site ${domain} publicado com sucesso no Navegador Vortex!`);
          }}
        />
      )}

      {/* MENU INICIAR (VORTEX MENU) */}
      {isStartOpen && (
        <div className="absolute bottom-14 left-3 w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-lg">
              <VortexIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm">Vortex OS</p>
              <p className="text-xs text-slate-400">Versão 1.3 Pro</p>
            </div>
          </div>

          <div className="py-3 space-y-1">
            <button 
              onClick={() => { setActiveApp('browser'); setIsStartOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg transition"
            >
              <ChromeIcon className="w-5 h-5 text-cyan-400" />
              Navegador Vortex
            </button>
            <button 
              onClick={() => { setActiveApp('creator'); setIsStartOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-600/20 hover:text-indigo-300 rounded-lg transition"
            >
              <CodeIcon className="w-5 h-5 text-indigo-400" />
              Vortex Web Studio (Criador)
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE TAREFAS (TASKBAR - ESTILO WINDOWS) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-between px-3 z-40">
        <div className="flex items-center gap-2">
          {/* BOTÃO START VORTEX */}
          <button 
            onClick={() => setIsStartOpen(!isStartOpen)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center ${
              isStartOpen 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Iniciar Vortex"
          >
            <VortexIcon className="w-5 h-5" />
          </button>

          <div className="h-5 w-[1px] bg-slate-800 mx-1" />

          {/* APPS FIXADOS NA BARRA */}
          <button 
            onClick={() => setActiveApp('browser')}
            className={`p-2 rounded-lg transition ${
              activeApp === 'browser' ? 'bg-slate-800 border-b-2 border-cyan-400' : 'hover:bg-slate-800/50'
            }`}
          >
            <ChromeIcon className="w-5 h-5 text-cyan-400" />
          </button>
          <button 
            onClick={() => setActiveApp('creator')}
            className={`p-2 rounded-lg transition ${
              activeApp === 'creator' ? 'bg-slate-800 border-b-2 border-indigo-400' : 'hover:bg-slate-800/50'
            }`}
          >
            <CodeIcon className="w-5 h-5 text-indigo-400" />
          </button>
        </div>

        {/* RELÓGIO DA TASKBAR */}
        <div className="text-xs text-slate-400 font-medium px-2">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

    </div>
  );
}

// Atalho da Área de Trabalho
function DesktopShortcut({ title, icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-slate-800/40 hover:backdrop-blur-sm transition group border border-transparent hover:border-slate-700/50"
    >
      <div className="p-3 bg-slate-900/60 rounded-2xl group-hover:scale-105 transition-transform border border-slate-800 shadow-md">
        {icon}
      </div>
      <span className="text-xs mt-2 text-slate-300 text-center font-medium group-hover:text-white">
        {title}
      </span>
    </button>
  );
}

// ==========================================
// COMPONENTE: NAVEGADOR VORTEX (ESTILO CHROME)
// ==========================================
function VortexBrowserApp({ onClose, publishedSites }) {
  const [url, setUrl] = useState('meusite.vort');
  const [currentUrl, setCurrentUrl] = useState('meusite.vort');
  const [history, setHistory] = useState(['meusite.vort']);
  const [showHistory, setShowHistory] = useState(false);

  const handleNavigate = (e) => {
    e?.preventDefault();
    let target = url.trim().toLowerCase();
    if (!target.endsWith('.vort') && !target.startsWith('http')) {
      target += '.vort';
    }
    setCurrentUrl(target);
    setUrl(target);
    setHistory(prev => [target, ...prev]);
  };

  const renderContent = () => {
    const site = publishedSites[currentUrl];
    if (site) {
      const srcDoc = `
        <!DOCTYPE html>
        <html>
          <head><style>${site.css}</style></head>
          <body>
            ${site.html}
            <script>${site.js}</script>
          </body>
        </html>
      `;
      return <iframe title="Vortex Web" srcDoc={srcDoc} className="w-full h-full bg-white border-0" />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-950 p-6 text-center">
        <div className="p-4 bg-slate-900 rounded-full mb-4 border border-slate-800">
          <ChromeIcon className="w-12 h-12 text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Não foi possível acessar este site</h3>
        <p className="text-sm mt-1 max-w-sm text-slate-500">
          O domínio <span className="text-cyan-400 font-mono">{currentUrl}</span> não foi encontrado na rede .vort. Crie-o usando o Vortex Web Studio!
        </p>
      </div>
    );
  };

  return (
    <div className="absolute top-10 left-10 right-10 bottom-16 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl flex flex-col overflow-hidden z-30">
      {/* BARRA DE ABAS E BOTOES DE JANELA */}
      <div className="bg-slate-950 px-3 pt-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-1.5 rounded-t-lg border-t border-x border-slate-700 text-xs text-slate-200 font-medium w-48 truncate">
            <ChromeIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{publishedSites[currentUrl]?.title || currentUrl}</span>
          </div>
        </div>
        
        {/* BOTÃO FECHAR */}
        <button onClick={onClose} className="px-3 py-1 text-slate-400 hover:bg-red-500 hover:text-white rounded text-xs transition">✕</button>
      </div>

      {/* BARRA DE NAVEGAÇÃO / URL */}
      <div className="bg-slate-900 p-2 flex items-center gap-2 border-b border-slate-800">
        <button onClick={() => handleNavigate()} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
          <RefreshIcon />
        </button>

        <form onSubmit={handleNavigate} className="flex-1">
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Digite um domínio .vort (ex: meusite.vort)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition font-mono"
          />
        </form>

        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`p-1.5 rounded-lg transition ${showHistory ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800'}`}
          title="Histórico de Navegação"
        >
          <HistoryIcon />
        </button>
      </div>

      {/* ÁREA DE CONTEÚDO E PAINEL DE HISTÓRICO */}
      <div className="flex-1 relative">
        {renderContent()}

        {/* DRAWER DE HISTÓRICO */}
        {showHistory && (
          <div className="absolute top-0 right-0 w-64 bottom-0 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 p-4 shadow-xl overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Histórico de Visitas</h4>
            <div className="space-y-1">
              {history.map((hUrl, index) => (
                <button
                  key={index}
                  onClick={() => { setUrl(hUrl); setCurrentUrl(hUrl); setShowHistory(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-xs font-mono text-cyan-400 truncate block"
                >
                  {hUrl}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: VORTEX WEB STUDIO (CRIADOR DE SITES)
// ==========================================
function VortexWebStudio({ onClose, onPublish }) {
  const [domain, setDomain] = useState('novosite');
  const [activeTab, setActiveTab] = useState('html'); // 'html' | 'css' | 'js'

  const [code, setCode] = useState({
    html: `<div class="card">\n  <h1>Meu Novo Site no Vortex!</h1>\n  <p>Criado com a versão 1.3</p>\n  <button onclick="saudar()">Clique Aqui</button>\n</div>`,
    css: `body {\n  background: #0f172a;\n  color: white;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n}\n\n.card {\n  background: #1e293b;\n  padding: 2rem;\n  border-radius: 12px;\n  text-align: center;\n  border: 1px solid #334155;\n}\n\nbutton {\n  background: #6366f1;\n  color: white;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n}`,
    js: `function saudar() {\n  alert('Olá do seu site .vort!');\n}`
  });

  const handlePublish = () => {
    const fullDomain = domain.toLowerCase().endsWith('.vort') ? domain.toLowerCase() : `${domain.toLowerCase()}.vort`;
    onPublish(fullDomain, {
      title: domain,
      html: code.html,
      css: code.css,
      js: code.js
    });
  };

  const previewSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head><style>${code.css}</style></head>
      <body>
        ${code.html}
        <script>${code.js}</script>
      </body>
    </html>
  `;

  return (
    <div className="absolute top-8 left-8 right-8 bottom-16 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl flex flex-col overflow-hidden z-30">
      {/* HEADER DA JANELA */}
      <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
          <CodeIcon className="w-4 h-4" />
          <span>Vortex Web Studio - Criador de Sites</span>
        </div>
        <button onClick={onClose} className="px-3 py-1 text-slate-400 hover:bg-red-500 hover:text-white rounded text-xs transition">✕</button>
      </div>

      {/* BARRA DE CONFIGURAÇÕES / DOMÍNIO E LANÇAMENTO */}
      <div className="bg-slate-900/90 p-3 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Domínio:</span>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <input 
              type="text" 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none font-mono text-right w-28"
            />
            <span className="text-xs text-indigo-400 font-mono font-bold">.vort</span>
          </div>
        </div>

        <button 
          onClick={handlePublish}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
        >
          🚀 Publicar Site no Vortex
        </button>
      </div>

      {/* PAINEL PRINCIPAL (EDITOR + PREVIEW) */}
      <div className="flex-1 grid grid-cols-2 divide-x divide-slate-800 overflow-hidden">
        
        {/* LADO ESQUERDO: EDITOR DE CÓDIGO */}
        <div className="flex flex-col bg-slate-950">
          <div className="flex bg-slate-900/50 border-b border-slate-800">
            {['html', 'css', 'js'].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`px-4 py-2 text-xs font-mono font-semibold uppercase transition ${
                  activeTab === lang 
                    ? 'border-b-2 border-indigo-500 text-indigo-400 bg-slate-900' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <textarea 
            value={code[activeTab]}
            onChange={(e) => setCode({ ...code, [activeTab]: e.target.value })}
            className="flex-1 bg-slate-950 text-slate-200 p-4 font-mono text-xs focus:outline-none resize-none leading-relaxed"
            spellCheck="false"
          />
        </div>

        {/* LADO DIREITO: PRÉVIA EM TEMPO REAL */}
        <div className="flex flex-col bg-slate-900">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Prévia em Tempo Real
          </div>
          <div className="flex-1 bg-white">
            <iframe title="Live Preview" srcDoc={previewSrcDoc} className="w-full h-full border-0" />
          </div>
        </div>

      </div>
    </div>
  );
}
