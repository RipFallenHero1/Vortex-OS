/* =========================================================
   VORTEX 4 — vortexOS 4.02
   script.js (Jogos completos + Loja + PS+ Simulada)
   ========================================================= */
(() => {
'use strict';

/* ---------- Atalhos ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Injeção de estilos extras (sem mexer no style.css) ---------- */
(function injectExtraCSS() {
  if ($('#vortex-extra-css')) return;
  const st = document.createElement('style');
  st.id = 'vortex-extra-css';
  st.textContent = `
    .wallet-pill,.psplus-badge{
      display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;
      font-size:12px;font-weight:700;background:var(--surface);border:1px solid var(--stroke);
      color:var(--text-dim);margin-left:6px;
    }
    .psplus-badge{
      background:linear-gradient(135deg,#f59e0b,#d97706);color:#111;border-color:#fbbf24;
      box-shadow:0 0 14px rgba(245,158,11,.4);
    }
    .psplus-badge.extra{background:linear-gradient(135deg,#eab308,#f97316);color:#111;}
    .psplus-badge.deluxe{background:linear-gradient(135deg,#fde047,#a855f7);color:#fff;border-color:#fde047;}
    .sub-header-right{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
    .store-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;}
    .store-tab{
      padding:9px 18px;border-radius:999px;border:1px solid var(--stroke);background:var(--surface);
      color:var(--text-dim);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:.2s;
    }
    .store-tab.active{background:linear-gradient(135deg,var(--primary),var(--primary-2));color:#fff;border-color:transparent;}
    .store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
    .store-card{
      display:flex;flex-direction:column;gap:10px;padding:18px;border-radius:18px;
      background:var(--surface);border:1px solid var(--stroke);transition:.25s;position:relative;overflow:hidden;
    }
    .store-card:hover{background:var(--surface-2);transform:translateY(-2px);border-color:var(--stroke-strong);}
    .store-banner{
      height:92px;border-radius:12px;display:flex;align-items:center;justify-content:center;
      font-size:48px;position:relative;box-shadow:inset 0 0 24px rgba(0,0,0,.35);
    }
    .store-tag{
      position:absolute;top:8px;left:8px;font-size:10px;font-weight:700;letter-spacing:.08em;
      text-transform:uppercase;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;
    }
    .store-tag.plus{background:linear-gradient(135deg,#f59e0b,#d97706);color:#111;}
    .store-card h4{font-size:16px;font-weight:700;}
    .store-card p{font-size:12px;color:var(--muted);line-height:1.45;flex:1;}
    .store-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px;}
    .store-price{font-size:14px;font-weight:800;color:var(--primary);}
    .store-price small{display:block;font-size:11px;color:var(--muted);text-decoration:line-through;font-weight:500;}
    .btn-sm{padding:8px 14px !important;font-size:12px !important;}
    .plus-hero{
      padding:22px;border-radius:18px;margin-bottom:18px;
      background:linear-gradient(135deg,rgba(245,158,11,.16),rgba(168,85,247,.18));
      border:1px solid rgba(251,191,36,.38);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
    }
    .plus-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;}
    .plus-plan{
      display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:18px;
      background:var(--surface);border:1px solid var(--stroke);transition:.25s;
    }
    .plus-plan.featured{border-color:#fbbf24;box-shadow:0 0 30px -12px rgba(251,191,36,.45);}
    .plus-plan.current{border-color:var(--success);box-shadow:0 0 26px -12px rgba(74,222,128,.45);}
    .plus-plan ul{list-style:none;display:grid;gap:6px;font-size:12px;color:var(--text-dim);flex:1;}
    .plus-plan li::before{content:'✓ ';color:var(--success);font-weight:800;}
    .pay-opts{display:grid;gap:8px;margin-top:14px;}
    .pay-opt{
      display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-radius:12px;
      background:var(--surface);border:1px solid var(--stroke);color:var(--text);font:inherit;font-size:13px;cursor:pointer;
    }
    .pay-opt.sel{border-color:var(--primary);background:var(--surface-2);box-shadow:0 0 0 2px var(--primary-glow);}
    .orbit-beam{
      position:absolute;height:3px;transform-origin:0 50%;pointer-events:none;z-index:4;
      background:linear-gradient(90deg,#e0bbff,#38bdf8);box-shadow:0 0 12px #38bdf8;
    }
    .pulse-pad{
      aspect-ratio:1;border-radius:16px;border:2px solid var(--stroke-strong);cursor:pointer;
      font-size:clamp(22px,4vmin,34px);display:grid;place-items:center;transition:transform .12s,filter .15s,box-shadow .15s;
      color:#fff;font-weight:700;opacity:.75;
    }
    .pulse-pad.lit{opacity:1;transform:scale(1.06);filter:brightness(1.45);box-shadow:0 0 32px currentColor;}
    .notif-list{display:grid;gap:8px;margin-top:14px;max-height:50vh;overflow-y:auto;}
    .notif-item{padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--stroke);font-size:13px;color:var(--text-dim);}
  `;
  document.head.appendChild(st);
})();

/* ---------- Catálogo ---------- */
const BASE_GAMES = [
  { id:'reflex',   name:'Vortex Reflex',   genre:'Arcade',        icon:'⚡',  c1:'#a855f7', c2:'#ec4899', playable:true,
    desc:'Clique nos alvos antes que desapareçam. 30 segundos para fazer o máximo de pontos.' },
  { id:'drift',    name:'Neon Drift',      genre:'Corrida',       icon:'🏎️', c1:'#7c3aed', c2:'#1e1b4b', playable:true,
    desc:'Derrape por pistas de neon desviando do tráfego e pegando moedas em alta velocidade.' },
  { id:'void',     name:'Void Hunter',     genre:'Tiro espacial', icon:'👾',  c1:'#6366f1', c2:'#0f172a', playable:true,
    desc:'Defenda seu escudo orbital contra ondas de alienígenas e OVNIs.' },
  { id:'kingdoms', name:'Pixel Kingdoms',  genre:'RPG',           icon:'⚔️', c1:'#f97316', c2:'#7f1d1d', playable:true,
    desc:'Batalhas por turnos contra 4 chefes em um reino feito de pixels.' },
  { id:'abyss',    name:'Abyss Dive',      genre:'Aventura',      icon:'🤿',  c1:'#0ea5e9', c2:'#082f49', playable:true,
    desc:'Mergulhe fundo, colete pérolas brilhantes e fuja das águas-vivas elétricas.' },
  { id:'ghost',    name:'Ghost Protocol',  genre:'Furtivo',       icon:'👻',  c1:'#10b981', c2:'#022c22', playable:true,
    desc:'Infiltre-se nos 3 andares do labirinto sem ser detectado pelos guardas.' },
  { id:'rune',     name:'Rune Legacy',     genre:'Puzzle',        icon:'🔮',  c1:'#d946ef', c2:'#3b0764', playable:true,
    desc:'Encontre os pares de runas antigas na memória antes do tempo acabar.' },
];

const STORE_GAMES = [
  { id:'storm', name:'Storm Rider',   genre:'Esporte Radical', icon:'🏂', c1:'#0284c7', c2:'#0f172a', playable:true,
    price:150, plusTier:'essential',
    desc:'Desça a montanha congelada desviando de rochas e pinheiros enquanto pega cristais de turbo.' },
  { id:'orbit', name:'Orbit Defense', genre:'Arcade Orbital',  icon:'🛰️', c1:'#4f46e5', c2:'#312e81', playable:true,
    price:250, plusTier:'extra',
    desc:'Dispare lasers da sua base orbital para destruir meteoros antes que atinjam o planeta.' },
  { id:'pulse', name:'Neon Pulse',    genre:'Ritmo & Memória', icon:'🎛️', c1:'#ec4899', c2:'#4c0519', playable:true,
    price:300, plusTier:'deluxe',
    desc:'Memorize e repita a sequência de pads musicais luminosos em velocidade crescente.' },
];

const STORE_AVATARS = [
  { id:'av_crown', icon:'👑', name:'Coroa Vortex',     price:120, plusFree:'deluxe' },
  { id:'av_ufo',   icon:'🛸', name:'Comandante UFO',   price:100, plusFree:'extra' },
  { id:'av_gem',   icon:'💎', name:'Diamante Puro',    price:180, plusFree:'deluxe' },
  { id:'av_ninja', icon:'🥷', name:'Agente Fantasma',  price:90,  plusFree:'essential' },
  { id:'av_wolf',  icon:'🐺', name:'Lobo Cibernético', price:140, plusFree:'deluxe' },
];

const PS_PLUS_PLANS = [
  {
    id:'essential', name:'PS+ Essential', priceCoins:100, fakePrice:'R$ 34,90/mês', badge:'➕ PS+ Essential',
    perks:['Selo dourado PS+ no perfil','Storm Rider grátis na PS Store','Avatar Agente Fantasma liberado','+25% V-Coins ao final das partidas']
  },
  {
    id:'extra', name:'PS+ Extra', priceCoins:200, fakePrice:'R$ 52,90/mês', badge:'➕ PS+ Extra', featured:true,
    perks:['Tudo do plano Essential','Orbit Defense grátis na PS Store','20% de desconto na PS Store','+50% V-Coins ao final das partidas']
  },
  {
    id:'deluxe', name:'PS+ Deluxe', priceCoins:300, fakePrice:'R$ 59,90/mês', badge:'👑 PS+ Deluxe',
    perks:['Tudo do plano Extra','Todos os jogos da PS Store grátis','Todos os avatares exclusivos grátis','2x V-Coins ao final das partidas']
  }
];
const TIER_RANK = { essential:1, extra:2, deluxe:3 };

const TROPHIES = {
  reflex: [
    { id:'r50',  tier:'bronze', icon:'🥉', name:'Aquecimento',      desc:'Faça 50 pontos',  min:50  },
    { id:'r150', tier:'silver', icon:'🥈', name:'Reflexo Rápido',   desc:'Faça 150 pontos', min:150 },
    { id:'r300', tier:'gold',   icon:'🥇', name:'Lenda do Vortex',  desc:'Faça 300 pontos', min:300 },
  ],
  drift: [
    { id:'d1', tier:'bronze', icon:'🥉', name:'Piloto Urbano',    desc:'Faça 150 pontos', min:150 },
    { id:'d2', tier:'silver', icon:'🥈', name:'Rei da Pista',     desc:'Faça 320 pontos', min:320 },
    { id:'d3', tier:'gold',   icon:'🥇', name:'Velocidade Neon',  desc:'Sobreviva e faça 500+ pts', min:500, win:true },
  ],
  void: [
    { id:'v1', tier:'bronze', icon:'🥉', name:'Recruta Espacial', desc:'Faça 120 pontos', min:120 },
    { id:'v2', tier:'silver', icon:'🥈', name:'Caçador do Vazio', desc:'Faça 300 pontos', min:300 },
    { id:'v3', tier:'gold',   icon:'🥇', name:'Guardião Estelar', desc:'Vença com 500+ pontos', min:500, win:true },
  ],
  kingdoms: [
    { id:'k1', tier:'bronze', icon:'🥉', name:'Aventureiro',      desc:'Derrote o 1º chefe (150+ pts)', min:150 },
    { id:'k2', tier:'silver', icon:'🥈', name:'Matador de Chefes',desc:'Faça 450 pontos', min:450 },
    { id:'k3', tier:'gold',   icon:'🥇', name:'Herói do Reino',   desc:'Vença os 4 chefes!', min:1000, win:true },
  ],
  abyss: [
    { id:'a1', tier:'bronze', icon:'🥉', name:'Mergulhador',      desc:'Faça 120 pontos', min:120 },
    { id:'a2', tier:'silver', icon:'🥈', name:'Caçador de Pérolas',desc:'Faça 280 pontos', min:280 },
    { id:'a3', tier:'gold',   icon:'🥇', name:'Senhor do Abismo', desc:'Sobreviva com 420+ pts', min:420, win:true },
  ],
  ghost: [
    { id:'g1', tier:'bronze', icon:'🥉', name:'Infiltrado',       desc:'Passe do 1º andar (200+ pts)', min:200 },
    { id:'g2', tier:'silver', icon:'🥈', name:'Sombra Silenciosa',desc:'Faça 450 pontos', min:450 },
    { id:'g3', tier:'gold',   icon:'🥇', name:'Fantasma Perfeito',desc:'Conclua os 3 andares!', min:600, win:true },
  ],
  rune: [
    { id:'w1', tier:'bronze', icon:'🥉', name:'Memória Viva',     desc:'Encontre todos os pares',  min:0,    win:true },
    { id:'w2', tier:'silver', icon:'🥈', name:'Mente Afiada',     desc:'Vença com 1000+ pontos',   min:1000, win:true },
    { id:'w3', tier:'gold',   icon:'🥇', name:'Mestre das Runas', desc:'Vença com 1150+ pontos',   min:1150, win:true },
  ],
  storm: [
    { id:'s1', tier:'bronze', icon:'🥉', name:'Na Neve',          desc:'Faça 150 pontos', min:150 },
    { id:'s2', tier:'silver', icon:'🥈', name:'Avalanche',        desc:'Faça 320 pontos', min:320 },
    { id:'s3', tier:'gold',   icon:'🥇', name:'Lenda da Tempestade',desc:'Sobreviva com 480+ pts', min:480, win:true },
  ],
  orbit: [
    { id:'o1', tier:'bronze', icon:'🥉', name:'Artilheiro',       desc:'Faça 120 pontos', min:120 },
    { id:'o2', tier:'silver', icon:'🥈', name:'Escudo Firme',     desc:'Faça 280 pontos', min:280 },
    { id:'o3', tier:'gold',   icon:'🥇', name:'Comandante Orbital',desc:'Sobreviva com 450+ pts', min:450, win:true },
  ],
  pulse: [
    { id:'p1', tier:'bronze', icon:'🥉', name:'Primeiro Ritmo',   desc:'Faça 100 pontos', min:100 },
    { id:'p2', tier:'silver', icon:'🥈', name:'Sintonia Fina',    desc:'Faça 300 pontos', min:300 },
    { id:'p3', tier:'gold',   icon:'🥇', name:'Maestro Neon',     desc:'Complete 7 rodadas', min:700, win:true },
  ],
};

const AVATARS = ['🎮','👾','🦊','🐉','🚀','🤖','👻','🔥'];
const COLORS  = ['#a855f7','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444'];
const MAX_PROFILES = 5;

/* ---------- Estado persistente ---------- */
const KEY = 'vortex4.v1';
let db = load();
function load() {
  try {
    const raw = Object.assign({ profiles:[], sound:true, music:true, theme:'dark' }, JSON.parse(localStorage.getItem(KEY)) || {});
    raw.profiles = (raw.profiles || []).map(normalizeProfile);
    return raw;
  } catch {
    return { profiles:[], sound:true, music:true, theme:'dark' };
  }
}
function normalizeProfile(p) {
  if (!p) return p;
  p.trophies = p.trophies || {};
  p.best = p.best || {};
  if (typeof p.wallet !== 'number') p.wallet = 300;
  if (!Array.isArray(p.owned)) p.owned = [];
  if (!Array.isArray(p.unlockedAvatars)) p.unlockedAvatars = [];
  if (!Array.isArray(p.redeemedCodes)) p.redeemedCodes = [];
  if (p.psplus === undefined) p.psplus = null;
  return p;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }

let current = null;
let gameIdx = 0;
let pIdx = 0;
let screen = 'boot';
let notifications = [];

function installedGames() {
  const ownedIds = current ? (current.owned || []) : [];
  return [...BASE_GAMES, ...STORE_GAMES.filter(g => ownedIds.includes(g.id))];
}
function allCatalogGames() { return [...BASE_GAMES, ...STORE_GAMES]; }
function hasPlusTier(tier) {
  if (!current || !current.psplus) return false;
  return (TIER_RANK[current.psplus.tier] || 0) >= (TIER_RANK[tier] || 99);
}
function addNotif(txt) {
  notifications.unshift({ txt, time: new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) });
  if (notifications.length > 20) notifications.pop();
}

/* ---------- Som ---------- */
let actx = null;
function beep(freq = 520, dur = .06, type = 'sine', vol = .05) {
  if (!db.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch {}
}
const sNav = () => beep(480, .05);
const sOk  = () => { beep(620, .07); setTimeout(() => beep(880, .09), 70); };
const sBad = () => beep(180, .15, 'square');

/* ---------- Música de fundo ---------- */
const MUSIC_FILE = 'InterfaceMusic.mp4';
const music = new Audio(MUSIC_FILE);
music.loop = true; music.preload = 'auto';
let musicWarned = false;
music.addEventListener('error', () => {
  if (musicWarned) return; musicWarned = true;
});
const musicVol = () => screen === 'game' ? .12 : .35;
function playMusic() {
  if (!db.music) return;
  music.volume = musicVol();
  const pr = music.play(); if (pr && pr.catch) pr.catch(() => {});
}
const unlockMusic = () => playMusic();
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, unlockMusic));
music.addEventListener('playing', () => ['pointerdown', 'keydown'].forEach(ev => document.removeEventListener(ev, unlockMusic)));
document.addEventListener('visibilitychange', () => document.hidden ? music.pause() : (current || screen !== 'boot') && playMusic());

/* ---------- Toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- Relógio ---------- */
function tickClock() {
  const d = new Date();
  const s = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  $$('[data-clock]').forEach(e => e.textContent = s);
}
tickClock(); setInterval(tickClock, 15000);

/* ---------- Navegação de telas ---------- */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + id));
  screen = id;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  music.volume = musicVol();
}
function anyModalOpen() { return $$('.modal-overlay.open').length > 0; }
const openModal  = id => $('#' + id)?.classList.add('open');
const closeModal = id => $('#' + id)?.classList.remove('open');

/* ---------- Tema ---------- */
function applyTheme(t) {
  db.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  $('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#08040f' : '#f7f3ff');
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  save();
}

/* =========================================================
   ESTRUTURA DINÂMICA (Loja, PS+, Biblioteca, Notificações)
   ========================================================= */
function ensureDynamicUI() {
  // 1) Botões extras na Topbar e Quickbar
  const nav = $('.topbar-nav');
  if (nav && !nav.querySelector('[data-action="store"]')) {
    const bStore = document.createElement('button');
    bStore.className = 'topbar-btn'; bStore.dataset.action = 'store'; bStore.title = 'PlayStation Store'; bStore.textContent = '🛒';
    const bPlus = document.createElement('button');
    bPlus.className = 'topbar-btn'; bPlus.dataset.action = 'psplus'; bPlus.title = 'PS+ Assinatura'; bPlus.textContent = '➕';
    nav.prepend(bPlus);
    nav.prepend(bStore);
  }
  const qb = $('.home-quickbar');
  if (qb && !qb.querySelector('[data-action="store"]')) {
    const qStore = document.createElement('button');
    qStore.className = 'quick-btn'; qStore.dataset.action = 'store'; qStore.textContent = '🛒 PS Store';
    const qPlus = document.createElement('button');
    qPlus.className = 'quick-btn'; qPlus.dataset.action = 'psplus'; qPlus.textContent = '➕ PS+';
    qb.prepend(qPlus);
    qb.prepend(qStore);
  }
  const badge = $('#user-badge');
  if (badge && !$('#user-wallet')) {
    const w = document.createElement('span'); w.id = 'user-wallet'; w.className = 'wallet-pill';
    const p = document.createElement('span'); p.id = 'user-plus';   p.className = 'psplus-badge'; p.style.display = 'none';
    badge.appendChild(w); badge.appendChild(p);
  }

  // 2) HUD extra para vidas/HP/fase nos jogos
  const hud = $('.game-hud');
  if (hud && !$('#game-hud-extra')) {
    const ex = document.createElement('div');
    ex.className = 'hud-extra'; ex.id = 'game-hud-extra';
    hud.appendChild(ex);
  }

  // 3) Telas: Loja, PS+, Biblioteca
  const anchor = $('#screen-trophies');
  if (!$('#screen-store')) {
    const s = document.createElement('section');
    s.className = 'screen'; s.id = 'screen-store';
    s.innerHTML = `
      <header class="sub-header">
        <button class="btn-ghost" id="btn-store-back">← Voltar</button>
        <h2>🛒 Vortex <span>PS Store</span></h2>
        <div class="sub-header-right">
          <span class="wallet-pill" id="store-wallet">🪙 0</span>
          <button class="btn-ghost btn-sm" id="btn-add-coins">+500 🪙 (Simulado)</button>
          <button class="btn-ghost btn-sm" id="btn-redeem-code">🎁 Código</button>
        </div>
      </header>
      <div class="settings-body" style="max-width:980px" id="store-body"></div>`;
    anchor.after(s);
    $('#btn-store-back').addEventListener('click', () => { sNav(); renderHome(); show('menu'); });
    $('#btn-add-coins').addEventListener('click', () => {
      if (!current) return;
      current.wallet += 500; save(); sOk();
      addNotif('🪙 +500 V-Coins simulados adicionados à carteira');
      toast('🪙 +500 V-Coins adicionados!');
      renderStore(); refreshWalletUI();
    });
    $('#btn-redeem-code').addEventListener('click', redeemCodePrompt);
  }

  if (!$('#screen-psplus')) {
    const s = document.createElement('section');
    s.className = 'screen'; s.id = 'screen-psplus';
    s.innerHTML = `
      <header class="sub-header">
        <button class="btn-ghost" id="btn-psplus-back">← Voltar</button>
        <h2>➕ PlayStation <span>Plus</span> (Simulação)</h2>
        <div class="sub-header-right">
          <span class="wallet-pill" id="psplus-wallet">🪙 0</span>
        </div>
      </header>
      <div class="settings-body" style="max-width:980px" id="psplus-body"></div>`;
    anchor.after(s);
    $('#btn-psplus-back').addEventListener('click', () => { sNav(); renderHome(); show('menu'); });
  }

  if (!$('#screen-library')) {
    const s = document.createElement('section');
    s.className = 'screen'; s.id = 'screen-library';
    s.innerHTML = `
      <header class="sub-header">
        <button class="btn-ghost" id="btn-library-back">← Voltar</button>
        <h2>📚 Biblioteca de <span>Jogos</span></h2>
      </header>
      <div class="settings-body" style="max-width:980px" id="library-body"></div>`;
    anchor.after(s);
    $('#btn-library-back').addEventListener('click', () => { sNav(); renderHome(); show('menu'); });
  }

  // 4) Modais: Checkout Simulado e Notificações
  if (!$('#modal-checkout')) {
    const m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-checkout';
    m.innerHTML = `
      <div class="modal">
        <h3 id="co-title">Finalizar Compra (Simulação)</h3>
        <p id="co-desc" style="color:var(--text-dim);font-size:14px;margin-top:8px;line-height:1.5"></p>
        <div class="pay-opts" id="co-pay-opts"></div>
        <div class="modal-actions">
          <button class="btn-ghost" id="co-cancel">Cancelar</button>
          <button class="btn-primary" id="co-confirm">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    $('#co-cancel').addEventListener('click', () => closeModal('modal-checkout'));
    m.addEventListener('mousedown', e => { if (e.target === m) closeModal('modal-checkout'); });
  }

  if (!$('#modal-notifs')) {
    const m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'modal-notifs';
    m.innerHTML = `
      <div class="modal">
        <h3>🔔 Notificações</h3>
        <div class="notif-list" id="notif-list"></div>
        <div class="modal-actions">
          <button class="btn-ghost" id="notif-clear">Limpar</button>
          <button class="btn-primary" id="notif-close">Fechar</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    $('#notif-close').addEventListener('click', () => closeModal('modal-notifs'));
    $('#notif-clear').addEventListener('click', () => { notifications = []; renderNotifs(); });
    m.addEventListener('mousedown', e => { if (e.target === m) closeModal('modal-notifs'); });
  }

  // Bind ações dinâmicas
  $$('[data-action]').forEach(b => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => doAction(b.dataset.action));
  });
}

/* =========================================================
   BOOT
   ========================================================= */
let bootT;
function startBoot() {
  show('boot');
  const fill = $('.boot-progress-fill');
  fill.style.transition = 'none'; fill.style.width = '0';
  void fill.offsetWidth;
  fill.style.transition = ''; fill.style.width = '100%';
  clearTimeout(bootT);
  bootT = setTimeout(afterBoot, 3800);
}
function afterBoot() {
  clearTimeout(bootT);
  if (screen !== 'boot') return;
  sOk();
  pIdx = 0;
  renderProfiles();
  show('profiles');
}
$('#screen-boot').addEventListener('click', afterBoot);

/* =========================================================
   PERFIS
   ========================================================= */
function totalTrophies(p) { return Object.values(p.trophies || {}).reduce((n, a) => n + a.length, 0); }

function renderProfiles() {
  const row = $('#profiles-row');
  row.innerHTML = '';
  db.profiles.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'profile-card' + (i === pIdx ? ' selected' : '');
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    const plusMark = p.psplus ? `<span style="color:#fbbf24">➕</span>` : '';
    el.innerHTML = `
      <div class="profile-avatar" style="background:linear-gradient(145deg,${esc(p.color)},#1a0f2e)">${esc(p.avatar)}</div>
      <div class="profile-name">${esc(p.name)} ${plusMark}</div>
      <div class="profile-trophies">🏆 ${totalTrophies(p)} · 🪙 ${p.wallet ?? 300}</div>
      <button class="profile-del" title="Remover">✕</button>`;
    el.addEventListener('mouseenter', () => { pIdx = i; markSelected(); });
    el.addEventListener('click', () => login(p));
    $('.profile-del', el).addEventListener('click', e => { e.stopPropagation(); removeProfile(i); });
    row.appendChild(el);
  });
  if (db.profiles.length < MAX_PROFILES) {
    const i = db.profiles.length;
    const el = document.createElement('div');
    el.className = 'profile-card' + (pIdx === i ? ' selected' : '');
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.innerHTML = `<div class="profile-avatar add-avatar">+</div><div class="profile-name">Novo perfil</div><div class="profile-trophies"></div>`;
    el.addEventListener('mouseenter', () => { pIdx = i; markSelected(); });
    el.addEventListener('click', openCreate);
    row.appendChild(el);
  }
}
function markSelected() {
  $$('.profile-card').forEach((c, i) => c.classList.toggle('selected', i === pIdx));
}
function removeProfile(i) {
  const p = db.profiles[i];
  if (!p || !confirm(`Remover o perfil "${p.name}"?`)) return;
  db.profiles.splice(i, 1); save();
  pIdx = Math.max(0, Math.min(pIdx, db.profiles.length));
  renderProfiles(); sBad();
}
function login(p) {
  current = normalizeProfile(p);
  save(); sOk();
  gameIdx = 0;
  notifications = [];
  addNotif(`🎮 Bem-vindo de volta, ${current.name}!`);
  if (current.psplus) addNotif(`➕ Assinatura ${current.psplus.tier.toUpperCase()} ativa!`);
  renderHome();
  show('menu');
}

/* ---------- Criar perfil ---------- */
let selAvatar = AVATARS[0], selColor = COLORS[0];
function buildPickers() {
  const pa = $('#picker-avatar'), pc = $('#picker-color');
  pa.innerHTML = AVATARS.map(a => `<button type="button" class="pick${a === selAvatar ? ' sel' : ''}" data-v="${a}">${a}</button>`).join('');
  pc.innerHTML = COLORS.map(c => `<button type="button" class="pick color${c === selColor ? ' sel' : ''}" data-v="${c}" style="background:${c}"></button>`).join('');
}
function openCreate() {
  selAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  selColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  $('#input-name').value = '';
  buildPickers(); openModal('modal-create'); sNav();
  setTimeout(() => $('#input-name').focus(), 250);
}
$('#picker-avatar').addEventListener('click', e => {
  const b = e.target.closest('.pick'); if (!b) return;
  selAvatar = b.dataset.v; buildPickers(); sNav();
});
$('#picker-color').addEventListener('click', e => {
  const b = e.target.closest('.pick'); if (!b) return;
  selColor = b.dataset.v; buildPickers(); sNav();
});
$('#btn-cancel').addEventListener('click', () => closeModal('modal-create'));
$('#btn-confirm').addEventListener('click', confirmCreate);
function confirmCreate() {
  const name = $('#input-name').value.trim() || 'Jogador';
  const p = normalizeProfile({ id: 'p' + Date.now(), name, avatar: selAvatar, color: selColor, trophies: {}, best: {}, wallet: 300, owned: [] });
  db.profiles.push(p); save();
  closeModal('modal-create');
  pIdx = db.profiles.length - 1;
  renderProfiles(); sOk(); toast(`Bem-vindo, ${name}! (+300 🪙 iniciais)`);
}

/* =========================================================
   HOME
   ========================================================= */
function refreshWalletUI() {
  if (!current) return;
  const w = $('#user-wallet'), sw = $('#store-wallet'), pw = $('#psplus-wallet');
  if (w) w.textContent = '🪙 ' + current.wallet;
  if (sw) sw.textContent = '🪙 ' + current.wallet;
  if (pw) pw.textContent = '🪙 ' + current.wallet;
  const pb = $('#user-plus');
  if (pb) {
    if (current.psplus) {
      pb.style.display = 'inline-flex';
      pb.className = 'psplus-badge ' + current.psplus.tier;
      pb.textContent = '➕ PS+ ' + current.psplus.tier.toUpperCase();
    } else {
      pb.style.display = 'none';
    }
  }
}

function renderHome() {
  $('#user-name').textContent = current.name;
  const av = $('#user-avatar');
  av.textContent = current.avatar;
  av.style.background = `linear-gradient(145deg,${current.color},var(--primary-2))`;
  refreshWalletUI();

  const games = installedGames();
  if (gameIdx >= games.length) gameIdx = 0;

  const track = $('#carousel-track');
  track.innerHTML = '';
  games.forEach((g, i) => {
    const earned = (current.trophies[g.id] || []).length;
    const total = (TROPHIES[g.id] || []).length;
    const c = document.createElement('button');
    c.className = 'game-card';
    c.style.setProperty('--c1', g.c1); c.style.setProperty('--c2', g.c2);
    c.innerHTML = `
      <div class="game-art">${g.icon}</div>
      <span class="game-genre">${esc(g.genre)}</span>
      ${total ? `<span class="game-trophy-mark">🏆 ${earned}/${total}</span>` : ''}
      <div class="game-name">${esc(g.name)}</div>`;
    c.addEventListener('click', () => {
      if (gameIdx === i) launch(g);
      else selectGame(i);
    });
    c.addEventListener('dblclick', () => { selectGame(i, true); launch(g); });
    track.appendChild(c);
  });
  selectGame(gameIdx, true);
}

function selectGame(i, silent) {
  const games = installedGames();
  gameIdx = (i + games.length) % games.length;
  const g = games[gameIdx];
  if (!silent) sNav();

  $$('.game-card').forEach((c, k) => c.classList.toggle('selected', k === gameIdx));
  $('#hero-genre').textContent = g.genre;
  $('#hero-title').textContent = g.name;
  $('#hero-desc').textContent = g.desc;
  $('#home-bg').style.background = `radial-gradient(60% 70% at 25% 35%, ${g.c1}, transparent 70%), radial-gradient(50% 60% at 80% 70%, ${g.c2}, transparent 70%)`;

  const earned = (current.trophies[g.id] || []).length, total = (TROPHIES[g.id] || []).length;
  const best = current.best[g.id];
  $('#hero-meta').innerHTML =
    (g.playable ? '<span>🟢 Disponível</span>' : '<span>🔒 Em breve</span>') +
    (total ? `<span>🏆 ${earned}/${total}</span>` : '') +
    (best != null ? `<span>⭐ Recorde: ${best}</span>` : '');
  $('#btn-play').textContent = g.playable ? '▶ Iniciar' : '🔒 Em breve';

  centerCarousel();
}
function centerCarousel() {
  const car = $('#home-carousel'), track = $('#carousel-track');
  const card = $$('.game-card')[gameIdx];
  if (!card) return;
  const x = car.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
  track.style.transform = `translateX(${x}px)`;
}
window.addEventListener('resize', () => { if (screen === 'menu') centerCarousel(); });

$('#btn-play').addEventListener('click', () => launch(installedGames()[gameIdx]));
let wheelT = 0;
$('#home-carousel').addEventListener('wheel', e => {
  e.preventDefault();
  if (Date.now() - wheelT < 180) return; wheelT = Date.now();
  selectGame(gameIdx + ((e.deltaY + e.deltaX) > 0 ? 1 : -1));
}, { passive: false });
$('#btn-trophies').addEventListener('click', openTrophies);

/* ---------- Ações da topbar / quickbar ---------- */
function doAction(a) {
  sNav();
  switch (a) {
    case 'notifications': renderNotifs(); openModal('modal-notifs'); break;
    case 'settings':      openSettings(); break;
    case 'power':         openModal('modal-power'); break;
    case 'library':       openLibrary(); break;
    case 'store':         openStore(); break;
    case 'psplus':        openPSPlus(); break;
    case 'trophies':      openTrophies(); break;
    case 'logout':        current = null; pIdx = 0; renderProfiles(); show('profiles'); break;
  }
}

function renderNotifs() {
  const list = $('#notif-list');
  if (!list) return;
  list.innerHTML = notifications.length
    ? notifications.map(n => `<div class="notif-item"><strong>${esc(n.time)}</strong> · ${esc(n.txt)}</div>`).join('')
    : '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhuma notificação nova.</p>';
}

/* ---------- Desligar ---------- */
$('#btn-power-cancel').addEventListener('click', () => closeModal('modal-power'));
$('#btn-power-confirm').addEventListener('click', () => {
  closeModal('modal-power');
  current = null; music.pause();
  const sb = document.createElement('div');
  sb.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000;color:#444;display:grid;place-items:center;font-size:13px;letter-spacing:.2em;cursor:pointer;text-transform:uppercase';
  sb.textContent = 'Modo de espera — toque para ligar';
  const wake = () => { sb.remove(); document.removeEventListener('keydown', wake); startBoot(); playMusic(); };
  sb.addEventListener('click', wake);
  setTimeout(() => document.addEventListener('keydown', wake, { once: true }), 300);
  document.body.appendChild(sb);
});

/* =========================================================
   PS STORE (LOJA DE JOGOS & AVATARES)
   ========================================================= */
let storeTab = 'games';
function openStore() {
  if (!current) return;
  refreshWalletUI();
  renderStore();
  show('store');
}

function effectiveGamePrice(g) {
  if (hasPlusTier(g.plusTier)) return 0;
  if (hasPlusTier('extra')) return Math.round(g.price * 0.8);
  return g.price;
}

function renderStore() {
  refreshWalletUI();
  const body = $('#store-body');
  const plusBanner = current.psplus
    ? `<div class="plus-hero">
         <div><strong>➕ ${esc(current.psplus.tier.toUpperCase())} ATIVO</strong><p style="font-size:13px;color:var(--text-dim);margin-top:4px">Aproveite jogos gratuitos do seu plano e descontos na PS Store!</p></div>
         <button class="btn-ghost btn-sm" id="store-go-plus">Gerenciar PS+</button>
       </div>`
    : `<div class="plus-hero">
         <div><strong>➕ Assine o PS+ (Simulação)</strong><p style="font-size:13px;color:var(--text-dim);margin-top:4px">Ganhe jogos mensais grátis na Loja e até 2x V-Coins nas partidas!</p></div>
         <button class="btn-primary btn-sm" id="store-go-plus">Ver Planos PS+</button>
       </div>`;

  const tabs = `
    <div class="store-tabs">
      <button class="store-tab${storeTab==='games'?' active':''}" data-tab="games">🎮 Jogos Exclusivos</button>
      <button class="store-tab${storeTab==='avatars'?' active':''}" data-tab="avatars">😎 Avatares</button>
      <button class="store-tab${storeTab==='catalog'?' active':''}" data-tab="catalog">📦 Todos os Jogos</button>
    </div>`;

  let content = '';
  if (storeTab === 'games') {
    content = `<div class="store-grid">${STORE_GAMES.map(g => {
      const owned = current.owned.includes(g.id);
      const finalPrice = effectiveGamePrice(g);
      const isPlusFree = finalPrice === 0 && !owned;
      return `
        <div class="store-card">
          <div class="store-banner" style="background:linear-gradient(145deg,${g.c1},${g.c2})">
            <span class="store-tag ${hasPlusTier(g.plusTier)?'plus':''}">${g.plusTier==='essential'?'PS+ Essential':g.plusTier==='extra'?'PS+ Extra':'PS+ Deluxe'}</span>
            ${g.icon}
          </div>
          <h4>${esc(g.name)}</h4>
          <p>${esc(g.desc)}</p>
          <div class="store-foot">
            <div class="store-price">
              ${owned ? '✓ Instalado' : (isPlusFree ? `<small>🪙 ${g.price}</small>GRÁTIS PS+` : (finalPrice < g.price ? `<small>🪙 ${g.price}</small>🪙 ${finalPrice}` : `🪙 ${finalPrice}`))}
            </div>
            ${owned
              ? `<button class="btn-ghost btn-sm" data-play-game="${g.id}">▶ Jogar</button>`
              : `<button class="btn-primary btn-sm" data-buy-game="${g.id}">${isPlusFree ? 'Resgatar' : 'Comprar'}</button>`}
          </div>
        </div>`;
    }).join('')}</div>`;
  } else if (storeTab === 'avatars') {
    content = `<div class="store-grid">${STORE_AVATARS.map(av => {
      const owned = current.unlockedAvatars.includes(av.id) || hasPlusTier(av.plusFree);
      const equipped = current.avatar === av.icon;
      return `
        <div class="store-card">
          <div class="store-banner" style="background:linear-gradient(145deg,var(--primary-2),var(--bg-2))">
            <span class="store-tag plus">PS+ ${av.plusFree}</span>
            ${av.icon}
          </div>
          <h4>${esc(av.name)}</h4>
          <p>Avatar exclusivo para exibir no seu perfil e tela inicial.</p>
          <div class="store-foot">
            <div class="store-price">${owned ? '✓ Liberado' : `🪙 ${av.price}`}</div>
            ${equipped
              ? `<span class="settings-badge">Equipado</span>`
              : owned
                ? `<button class="btn-ghost btn-sm" data-equip-av="${av.icon}">Equipar</button>`
                : `<button class="btn-primary btn-sm" data-buy-av="${av.id}">Comprar</button>`}
          </div>
        </div>`;
    }).join('')}</div>`;
  } else {
    content = `<div class="store-grid">${allCatalogGames().map(g => {
      const owned = BASE_GAMES.some(b => b.id === g.id) || current.owned.includes(g.id);
      return `
        <div class="store-card">
          <div class="store-banner" style="background:linear-gradient(145deg,${g.c1},${g.c2})">
            <span class="store-tag">${esc(g.genre)}</span>
            ${g.icon}
          </div>
          <h4>${esc(g.name)}</h4>
          <p>${esc(g.desc)}</p>
          <div class="store-foot">
            <div class="store-price">${owned ? '✓ Na Biblioteca' : `🪙 ${effectiveGamePrice(g)}`}</div>
            ${owned
              ? `<button class="btn-ghost btn-sm" data-play-game="${g.id}">▶ Jogar</button>`
              : `<button class="btn-primary btn-sm" data-buy-game="${g.id}">Comprar</button>`}
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  body.innerHTML = plusBanner + tabs + content;

  $('#store-go-plus')?.addEventListener('click', () => { sNav(); openPSPlus(); });
  $$('.store-tab', body).forEach(t => t.addEventListener('click', () => { storeTab = t.dataset.tab; sNav(); renderStore(); }));
  $$('[data-buy-game]', body).forEach(b => b.addEventListener('click', () => buyStoreGame(b.dataset.buyGame)));
  $$('[data-buy-av]', body).forEach(b => b.addEventListener('click', () => buyStoreAvatar(b.dataset.buyAv)));
  $$('[data-equip-av]', body).forEach(b => b.addEventListener('click', () => {
    current.avatar = b.dataset.equipAv; save(); sOk();
    toast('😎 Avatar equipado!'); renderStore();
  }));
  $$('[data-play-game]', body).forEach(b => b.addEventListener('click', () => {
    const g = installedGames().find(x => x.id === b.dataset.playGame);
    if (g) launch(g);
  }));
}

function redeemCodePrompt() {
  const code = (prompt('Digite um código promocional fictício (ex: VORTEX2026 ou PS4FREE):') || '').trim().toUpperCase();
  if (!code) return;
  const CODES = { VORTEX2026: 1000, PS4FREE: 500, PLUSVIP: 750 };
  if (!CODES[code]) { sBad(); toast('❌ Código inválido (tente VORTEX2026)'); return; }
  if (current.redeemedCodes.includes(code)) { sBad(); toast('⚠️ Código já resgatado neste perfil'); return; }
  current.redeemedCodes.push(code);
  current.wallet += CODES[code];
  save(); sOk();
  addNotif(`🎁 Código ${code} resgatado: +${CODES[code]} 🪙`);
  toast(`🎁 +${CODES[code]} V-Coins resgatados!`);
  renderStore();
}

/* ---------- Checkout Simulado ---------- */
let checkoutHandler = null;
function openCheckout({ title, desc, coinCost, allowFakeCard, onConfirm }) {
  $('#co-title').textContent = title;
  $('#co-desc').innerHTML = desc;
  const opts = $('#co-pay-opts');
  let method = 'coins';

  const methods = [
    { id:'coins', label:`🪙 Carteira V-Coins (Saldo: ${current.wallet})`, right: coinCost === 0 ? 'GRÁTIS' : `🪙 ${coinCost}` },
  ];
  if (allowFakeCard) {
    methods.push({ id:'card', label:'💳 Cartão Fictício •••• 4040 (Sem cobrança real)', right:'Simulação' });
    methods.push({ id:'pix',  label:'⚡ PIX Simulado VortexPay (Sem cobrança real)', right:'Simulação' });
  }

  function renderPay() {
    opts.innerHTML = methods.map(m => `
      <button type="button" class="pay-opt${method===m.id?' sel':''}" data-m="${m.id}">
        <span>${m.label}</span><strong>${m.right}</strong>
      </button>`).join('');
    $$('.pay-opt', opts).forEach(b => b.addEventListener('click', () => { method = b.dataset.m; sNav(); renderPay(); }));
  }
  renderPay();

  checkoutHandler = () => {
    if (method === 'coins' && current.wallet < coinCost) {
      sBad(); toast(`❌ Saldo insuficiente! Precisa de 🪙 ${coinCost}`);
      return;
    }
    if (method === 'coins') current.wallet -= coinCost;
    closeModal('modal-checkout');
    onConfirm(method);
  };
  $('#co-confirm').onclick = checkoutHandler;
  openModal('modal-checkout');
  sNav();
}

function buyStoreGame(id) {
  const g = STORE_GAMES.find(x => x.id === id);
  if (!g || current.owned.includes(id)) return;
  const price = effectiveGamePrice(g);
  openCheckout({
    title: price === 0 ? `Resgatar ${g.name}` : `Comprar ${g.name}`,
    desc: `Instalar <strong>${esc(g.name)}</strong> (${esc(g.genre)}) diretamente na sua tela inicial do Vortex 4.<br><small style="color:var(--muted)">Compra 100% simulada.</small>`,
    coinCost: price,
    allowFakeCard: price > 0,
    onConfirm() {
      current.owned.push(id);
      save(); sOk();
      addNotif(`🛒 ${g.name} instalado na tela inicial!`);
      toast(`✅ ${g.name} instalado!`);
      renderStore(); refreshWalletUI();
    }
  });
}

function buyStoreAvatar(id) {
  const av = STORE_AVATARS.find(x => x.id === id);
  if (!av) return;
  openCheckout({
    title: `Comprar Avatar ${av.icon}`,
    desc: `Desbloquear e equipar o avatar <strong>${esc(av.name)}</strong>.`,
    coinCost: av.price,
    allowFakeCard: false,
    onConfirm() {
      current.unlockedAvatars.push(id);
      current.avatar = av.icon;
      save(); sOk();
      addNotif(`😎 Avatar ${av.name} desbloqueado!`);
      toast(`😎 ${av.name} equipado!`);
      renderStore(); refreshWalletUI();
    }
  });
}

/* =========================================================
   PS+ (ASSINATURA SIMULADA DE MENTIRA)
   ========================================================= */
function openPSPlus() {
  if (!current) return;
  refreshWalletUI();
  renderPSPlus();
  show('psplus');
}

function renderPSPlus() {
  refreshWalletUI();
  const body = $('#psplus-body');
  const active = current.psplus;

  const statusBox = active
    ? `<div class="plus-hero">
         <div>
           <strong>✅ Assinatura Ativa: PS+ ${esc(active.tier.toUpperCase())}</strong>
           <p style="font-size:13px;color:var(--text-dim);margin-top:4px">Método: ${esc(active.method || 'Simulação')} · Renovação automática fictícia ativada.</p>
         </div>
         <button class="btn-ghost btn-danger btn-sm" id="btn-plus-cancel">Cancelar Assinatura</button>
       </div>`
    : `<div class="plus-hero">
         <div>
           <strong>➕ Assine o PS+ (100% de mentira)</strong>
           <p style="font-size:13px;color:var(--text-dim);margin-top:4px">Escolha um plano abaixo ou teste o Essential grátis por 7 dias fictícios — nenhum dinheiro real é usado!</p>
         </div>
         <button class="btn-primary btn-sm" id="btn-plus-trial">🎁 Testar 7 dias Grátis</button>
       </div>`;

  const plansHTML = `<div class="plus-plans">${PS_PLUS_PLANS.map(pl => {
    const isCur = active && active.tier === pl.id;
    return `
      <div class="plus-plan${pl.featured?' featured':''}${isCur?' current':''}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong style="font-size:17px">${esc(pl.badge)}</strong>
          ${isCur ? '<span class="settings-badge">Ativo</span>' : ''}
        </div>
        <div>
          <div style="font-size:22px;font-weight:800;color:var(--primary)">${esc(pl.fakePrice)}</div>
          <div style="font-size:12px;color:var(--muted)">ou 🪙 ${pl.priceCoins} V-Coins · (Simulado)</div>
        </div>
        <ul>${pl.perks.map(pk => `<li>${esc(pk)}</li>`).join('')}</ul>
        <button class="${isCur ? 'btn-ghost' : 'btn-primary'}" data-sub-plan="${pl.id}" ${isCur ? 'disabled' : ''}>
          ${isCur ? 'Plano Atual' : (active ? 'Mudar para este plano' : 'Assinar (de mentira)')}
        </button>
      </div>`;
  }).join('')}</div>`;

  body.innerHTML = statusBox + plansHTML;

  $('#btn-plus-trial')?.addEventListener('click', () => {
    current.psplus = { tier:'essential', since:Date.now(), method:'Teste Grátis (Simulado)' };
    save(); sOk();
    addNotif('🎁 Teste grátis de PS+ Essential ativado!');
    toast('🎉 PS+ Essential ativado (simulação)!');
    renderPSPlus(); refreshWalletUI();
  });

  $('#btn-plus-cancel')?.addEventListener('click', () => {
    if (!confirm('Cancelar sua assinatura simulada do PS+?')) return;
    current.psplus = null; save(); sBad();
    addNotif('⚠️ Assinatura PS+ cancelada.');
    toast('Assinatura PS+ cancelada');
    renderPSPlus(); refreshWalletUI();
  });

  $$('[data-sub-plan]', body).forEach(b => b.addEventListener('click', () => {
    const pl = PS_PLUS_PLANS.find(x => x.id === b.dataset.subPlan);
    if (!pl) return;
    openCheckout({
      title: `Assinar ${pl.name}`,
      desc: `Plano: <strong>${esc(pl.name)}</strong> (${esc(pl.fakePrice)} fictício).<br>Você pode pagar com V-Coins ou usar o Cartão/PIX simulado sem gastar nada!`,
      coinCost: pl.priceCoins,
      allowFakeCard: true,
      onConfirm(method) {
        const label = method === 'coins' ? 'V-Coins' : (method === 'card' ? 'Cartão Fictício **** 4040' : 'PIX Simulado');
        current.psplus = { tier: pl.id, since: Date.now(), method: label };
        save(); sOk();
        addNotif(`➕ Assinatura ${pl.name} ativada via ${label}!`);
        toast(`🎉 ${pl.name} ativado!`);
        renderPSPlus(); refreshWalletUI();
      }
    });
  }));
}

/* =========================================================
   BIBLIOTECA DE JOGOS
   ========================================================= */
function openLibrary() {
  if (!current) return;
  const games = installedGames();
  const body = $('#library-body');
  body.innerHTML = `
    <p style="color:var(--text-dim);font-size:14px;margin-bottom:16px">
      Você tem <strong>${games.length}</strong> jogo(s) instalado(s). Compre mais na <strong>PS Store</strong>!
    </p>
    <div class="store-grid">
      ${games.map(g => {
        const best = current.best[g.id];
        const earned = (current.trophies[g.id] || []).length;
        const total = (TROPHIES[g.id] || []).length;
        return `
          <div class="store-card">
            <div class="store-banner" style="background:linear-gradient(145deg,${g.c1},${g.c2})">
              <span class="store-tag">${esc(g.genre)}</span>
              ${g.icon}
            </div>
            <h4>${esc(g.name)}</h4>
            <p>🏆 ${earned}/${total} troféus ${best != null ? `· ⭐ Recorde: ${best}` : ''}</p>
            <div class="store-foot">
              <span class="settings-badge">Instalado</span>
              <button class="btn-primary btn-sm" data-lib-play="${g.id}">▶ Jogar</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  $$('[data-lib-play]', body).forEach(b => b.addEventListener('click', () => {
    const g = installedGames().find(x => x.id === b.dataset.libPlay);
    if (g) launch(g);
  }));
  show('library');
}

/* =========================================================
   LAUNCH
   ========================================================= */
let launchT;
function launch(g) {
  if (!g || !g.playable) { sBad(); toast(`🔒 ${g ? g.name : 'Jogo'} chega em breve!`); return; }
  sOk();
  $('#launch-icon').textContent = g.icon;
  $('#launch-title').textContent = g.name;
  $('#launch-bg').style.background = `radial-gradient(circle, ${g.c1}, ${g.c2})`;
  const fill = $('#launch-fill'), status = $('#launch-status');
  fill.style.width = '0'; status.textContent = 'Carregando…';
  show('launch');

  let p = 0;
  clearInterval(launchT);
  launchT = setInterval(() => {
    p = Math.min(100, p + rand(12, 26));
    fill.style.width = p + '%';
    if (p > 60) status.textContent = 'Preparando…';
    if (p >= 100) {
      clearInterval(launchT);
      status.textContent = 'Pronto!';
      setTimeout(() => startGame(g), 280);
    }
  }, 180);
}

/* =========================================================
   MOTOR DE JOGO (HUD, timer, fim de partida)
   ========================================================= */
const G = { running:false, score:0, time:0, endAt:0, tick:null, id:null, startedAt:0 };
const field = () => $('#game-playfield');
const hudExtra = () => $('#game-hud-extra');

function setOverlay(which) {
  $('#game-intro').classList.toggle('hide', which !== 'intro');
  $('#game-over').classList.toggle('hide', which !== 'over');
}
function setScore(n) { G.score = n; $('#game-score').textContent = n; }
function setTime(n)  { G.time = n;  $('#game-time').textContent = n; }
function setHudExtra(html) { const e = hudExtra(); if (e) e.innerHTML = html; }

function floatScore(x, y, text) {
  const fl = document.createElement('div');
  fl.className = 'score-float'; fl.textContent = text;
  fl.style.left = x + 'px'; fl.style.top = y + 'px';
  field().appendChild(fl);
  setTimeout(() => fl.remove(), 800);
}

function startGame(g) {
  G.id = g.id;
  $('.intro-icon').textContent = g.icon;
  $('#game-intro h2').textContent = g.name;
  $('#game-intro p').innerHTML = ENGINES[g.id].intro;
  show('game');
  stopGame(); setScore(0); setTime(ENGINES[g.id].duration);
  setOverlay('intro');
}
function stopGame() {
  G.running = false; clearInterval(G.tick);
  setHudExtra('');
  if (G.id && ENGINES[G.id]) ENGINES[G.id].stop();
}
function beginRound() {
  if (!G.id) return;
  const E = ENGINES[G.id];
  stopGame(); setScore(0); setTime(E.duration);
  G.running = true; G.startedAt = performance.now(); G.endAt = G.startedAt + E.duration * 1000;
  setOverlay(null); sOk();
  E.start();
  G.tick = setInterval(() => {
    const left = Math.max(0, Math.ceil((G.endAt - performance.now()) / 1000));
    if (left !== G.time) {
      setTime(left);
      if (left > 0 && left <= 5) beep(300, .05, 'square', .03);
      if (E.onSecond) E.onSecond(left);
    }
    if (left <= 0) {
      if (E.onTimeout) E.onTimeout();
      else endRound(false);
    }
  }, 200);
}
function endRound(won) {
  if (!G.running) return;
  const score = G.score, id = G.id;
  stopGame();
  $('#game-final-score').textContent = score;
  $('#game-over h2').textContent = won ? 'Vitória!' : 'Fim de jogo!';

  const prevBest = current.best[id] || 0;
  const record = score > prevBest;
  if (record) current.best[id] = score;

  const have = current.trophies[id] = current.trophies[id] || [];
  const gained = (TROPHIES[id] || []).filter(t => !have.includes(t.id) && score >= (t.min || 0) && (!t.win || won));
  gained.forEach(t => have.push(t.id));

  // Recompensa em V-Coins (multiplicada pelo PS+)
  const mult = current.psplus ? (current.psplus.tier === 'deluxe' ? 2 : current.psplus.tier === 'extra' ? 1.5 : 1.25) : 1;
  const baseCoins = Math.max(5, Math.floor(score / 12)) + gained.length * 25 + (won ? 20 : 0);
  const coinsEarned = Math.round(baseCoins * mult);
  current.wallet += coinsEarned;
  save();

  let msg = `+${coinsEarned} 🪙${mult > 1 ? ` (PS+ ${mult}x)` : ''}`;
  if (record && prevBest > 0) msg += ' · ⭐ Novo recorde!';
  if (gained.length) msg += '<br>' + gained.map(t => `${t.icon} ${t.name}`).join(' · ');
  $('#game-reward').innerHTML = msg;

  setOverlay('over');
  gained.length || won ? sOk() : beep(300, .2);
  gained.forEach((t, i) => {
    addNotif(`🏆 Troféu: ${t.name}`);
    setTimeout(() => toast(`🏆 Troféu desbloqueado: ${t.name}`), 600 + i * 2300);
  });
}
function exitGame() {
  stopGame(); G.id = null; sNav();
  renderHome(); show('menu');
}
$('#btn-game-start').addEventListener('click', beginRound);
$('#btn-game-again').addEventListener('click', beginRound);
$('#btn-game-back').addEventListener('click', exitGame);
$('#btn-game-exit').addEventListener('click', exitGame);

/* =========================================================
   MINIGAMES (10 JOGOS COMPLETOS!)
   ========================================================= */
let spawnT = null, gameRaf = 0, gameKeyFn = null, gameTimers = [];
const clrTimers = () => { gameTimers.forEach(t => { clearTimeout(t); clearInterval(t); }); gameTimers = []; };

/* Helper compartilhado de corrida em 4 pistas (Neon Drift & Storm Rider) */
function makeRaceEngine({ storm, playerIcon, enemies, pickups, duration }) {
  let track, playerEl, lane = 1, lives = 3, invuln = 0, items = [], lastTs = 0, spawnAcc = 0;
  const lanes = [12.5, 37.5, 62.5, 87.5];

  function updateHud() {
    setHudExtra(`<span>Vidas: <strong>${'❤️'.repeat(Math.max(0, lives)) || '💀'}</strong></span>`);
  }
  function setLane(l) {
    lane = clamp(l, 0, 3);
    if (playerEl) playerEl.style.left = lanes[lane] + '%';
  }
  function loop(ts) {
    if (!G.running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    const elapsed = (ts - G.startedAt) / (duration * 1000);
    const speed = 250 + elapsed * 240;
    const f = field(), H = f.clientHeight, W = f.clientWidth;

    spawnAcc += dt;
    const interval = Math.max(0.32, 0.78 - elapsed * 0.36);
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      const l = Math.floor(Math.random() * 4);
      const isPickup = Math.random() < 0.38;
      const spec = isPickup
        ? pickups[Math.floor(Math.random() * pickups.length)]
        : { icon: enemies[Math.floor(Math.random() * enemies.length)], pts: 0 };
      const el = document.createElement('div');
      el.className = 'race-enemy';
      el.textContent = spec.icon;
      el.style.left = lanes[l] + '%';
      el.style.top = '-48px';
      track.appendChild(el);
      items.push({ el, lane: l, y: -48, isPickup, pts: spec.pts });
    }

    if (invuln > 0) invuln -= dt;
    if (playerEl) playerEl.style.opacity = invuln > 0 && Math.floor(invuln * 14) % 2 ? '0.35' : '1';

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += speed * dt;
      it.el.style.top = it.y + 'px';

      if (it.lane === lane && it.y > H - 88 && it.y < H - 16) {
        if (it.isPickup) {
          setScore(G.score + it.pts);
          beep(780, .06, 'triangle');
          floatScore((lanes[lane] / 100) * W - 15, H - 90, '+' + it.pts);
          it.el.remove(); items.splice(i, 1);
          continue;
        } else if (invuln <= 0) {
          lives--; invuln = 1.2; updateHud(); sBad();
          it.el.remove(); items.splice(i, 1);
          if (lives <= 0) { endRound(false); return; }
          continue;
        }
      }
      if (it.y > H + 50) { it.el.remove(); items.splice(i, 1); }
    }
    gameRaf = requestAnimationFrame(loop);
  }

  return {
    duration,
    intro: storm
      ? 'Desça a tempestade usando <strong>← → / A D</strong> ou tocando nas pistas.<br/>Desvie dos obstáculos e pegue cristais por <strong>45 segundos</strong>!'
      : 'Use <strong>← → / A D</strong> ou toque na pista para trocar de faixa.<br/>Desvie dos carros e pegue moedas por <strong>45 segundos</strong>!',
    start() {
      items = []; lane = 1; lives = 3; invuln = 0; lastTs = 0; spawnAcc = 0;
      track = document.createElement('div');
      track.className = 'race-track' + (storm ? ' storm' : '');
      [25, 50, 75].forEach(pct => {
        const ln = document.createElement('div');
        ln.className = 'race-lane'; ln.style.left = pct + '%';
        track.appendChild(ln);
      });
      playerEl = document.createElement('div');
      playerEl.className = 'race-player'; playerEl.textContent = playerIcon;
      playerEl.style.left = lanes[lane] + '%';
      track.appendChild(playerEl);
      field().appendChild(track);
      updateHud();

      track.addEventListener('pointerdown', e => {
        if (!G.running) return;
        const r = track.getBoundingClientRect();
        const targetLane = clamp(Math.floor(((e.clientX - r.left) / r.width) * 4), 0, 3);
        setLane(targetLane); sNav();
      });
      gameKeyFn = e => {
        if (!G.running) return;
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { e.preventDefault(); setLane(lane - 1); sNav(); }
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { e.preventDefault(); setLane(lane + 1); sNav(); }
      };
      document.addEventListener('keydown', gameKeyFn);
      gameRaf = requestAnimationFrame(loop);
    },
    onSecond() { if (G.running) setScore(G.score + 5); },
    onTimeout() { setScore(G.score + 100); endRound(true); },
    stop() {
      cancelAnimationFrame(gameRaf);
      if (gameKeyFn) { document.removeEventListener('keydown', gameKeyFn); gameKeyFn = null; }
      items.forEach(it => it.el.remove()); items = [];
      if (track) track.remove();
    }
  };
}

const ENGINES = {

  /* 1. VORTEX REFLEX */
  reflex: {
    duration: 30,
    intro: 'Clique nos alvos antes que desapareçam.<br/>Você tem <strong>30 segundos</strong> para fazer o máximo de pontos!',
    start() { spawnLoop(); },
    onTimeout() { endRound(true); },
    stop()  { clearTimeout(spawnT); $$('.game-target, .score-float', field()).forEach(e => e.remove()); },
  },

  /* 2. NEON DRIFT */
  drift: makeRaceEngine({
    storm: false, playerIcon: '🏎️', duration: 45,
    enemies: ['🚙','🚕','🚓','🚛'],
    pickups: [{ icon:'🪙', pts:25 }, { icon:'⚡', pts:50 }],
  }),

  /* 3. STORM RIDER (Loja) */
  storm: makeRaceEngine({
    storm: true, playerIcon: '🏂', duration: 45,
    enemies: ['🪨','🌲','⛄'],
    pickups: [{ icon:'❄️', pts:25 }, { icon:'⚡', pts:50 }],
  }),

  /* 4. VOID HUNTER */
  void: (() => {
    let shield = 5, wave = 1;
    function updateHud() {
      setHudExtra(`<span>Escudo: <strong>${'🛡️'.repeat(Math.max(0, shield)) || '💥'}</strong></span><span>Onda: <strong>${wave}</strong></span>`);
    }
    function spawnAlien() {
      if (!G.running) return;
      const f = field(), W = f.clientWidth, H = f.clientHeight;
      const elapsed = (performance.now() - G.startedAt) / 40000;
      wave = 1 + Math.floor(elapsed * 4);
      updateHud();

      const roll = Math.random();
      const isTank = roll < 0.22;
      const isUfo = !isTank && roll < 0.45;
      let hp = isTank ? 3 : 1;
      const pts = isTank ? 60 : (isUfo ? 30 : 15);
      const life = isTank ? 4600 : (isUfo ? 2400 : 3200);

      const el = document.createElement('button');
      el.className = 'alien' + (isTank ? ' tank' : '');
      el.style.background = 'none'; el.style.border = '0';
      el.textContent = isUfo ? '🛸' : '👾';
      let x = rand(24, Math.max(40, W - 70));
      const y = rand(24, Math.max(40, H - 80));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      f.appendChild(el);

      let dead = false;
      let moveInt = null;
      if (isUfo) {
        let dir = Math.random() < 0.5 ? 1 : -1;
        moveInt = setInterval(() => {
          if (dead || !G.running) return;
          x += dir * 6;
          if (x < 16 || x > f.clientWidth - 56) dir *= -1;
          el.style.left = x + 'px';
        }, 30);
        gameTimers.push(moveInt);
      }

      el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (dead || !G.running) return;
        hp--;
        if (hp > 0) {
          el.style.transform = 'scale(0.85)';
          setTimeout(() => { if (el.isConnected) el.style.transform = ''; }, 90);
          beep(420, .05, 'triangle');
          return;
        }
        dead = true; clearInterval(moveInt);
        setScore(G.score + pts);
        beep(820, .07, 'triangle');
        floatScore(x, y, '+' + pts);
        el.remove();
      });

      const attackT = setTimeout(() => {
        if (dead || !G.running || !el.isConnected) return;
        dead = true; clearInterval(moveInt);
        el.remove();
        shield--; updateHud(); sBad();
        if (shield <= 0) endRound(false);
      }, life);
      gameTimers.push(attackT);

      const nextT = setTimeout(spawnAlien, Math.max(360, 880 - elapsed * 460));
      gameTimers.push(nextT);
    }

    return {
      duration: 40,
      intro: 'Clique ou toque nos alienígenas (<strong>👾</strong>, <strong>🛸</strong>) antes que atirem no seu escudo.<br/>Aliens azuis precisam de <strong>3 tiros</strong>! Sobreviva 40s.',
      start() { shield = 5; wave = 1; updateHud(); spawnAlien(); },
      onTimeout() { setScore(G.score + shield * 25); endRound(true); },
      stop() { clrTimers(); $$('.alien, .score-float', field()).forEach(e => e.remove()); }
    };
  })(),

  /* 5. PIXEL KINGDOMS */
  kingdoms: (() => {
    const BOSSES = [
      { name:'Slime Sombrio',    icon:'🫧', hp:60,  atk:[10,15], pts:150 },
      { name:'Goblin Guerreiro', icon:'👺', hp:85,  atk:[13,19], pts:220 },
      { name:'Cavaleiro Negro',  icon:'💀', hp:115, atk:[16,23], pts:300 },
      { name:'Dragão Pixelado',  icon:'🐉', hp:150, atk:[19,27], pts:450 },
    ];
    let wrap, stage, pHp, pMaxHp, pMp, potions, eHp, eMaxHp, shieldDef, busy;

    function renderBattle(logMsg) {
      if (!wrap) return;
      const b = BOSSES[stage];
      setHudExtra(`<span>Fase <strong>${stage + 1}/4</strong></span><span>✨ MP: <strong>${pMp}</strong></span><span>🧪 Poções: <strong>${potions}</strong></span>`);
      wrap.innerHTML = `
        <div class="kingdom-battle">
          <div class="kingdom-side">
            <div class="kingdom-name">Herói</div>
            <div class="kingdom-emoji">🧙‍♂️</div>
            <div class="kingdom-hp"><div class="kingdom-hp-fill" style="width:${(pHp/pMaxHp)*100}%"></div></div>
            <div style="font-size:12px;margin-top:6px;color:var(--text-dim)">${pHp} / ${pMaxHp} HP</div>
          </div>
          <div style="font-size:26px;font-weight:900;color:var(--muted)">VS</div>
          <div class="kingdom-side enemy">
            <div class="kingdom-name">${esc(b.name)}</div>
            <div class="kingdom-emoji">${b.icon}</div>
            <div class="kingdom-hp"><div class="kingdom-hp-fill" style="width:${(eHp/eMaxHp)*100}%"></div></div>
            <div style="font-size:12px;margin-top:6px;color:var(--text-dim)">${eHp} / ${eMaxHp} HP</div>
          </div>
        </div>
        <div class="kingdom-log">${esc(logMsg)}</div>
        <div class="kingdom-actions">
          <button class="kingdom-btn attack" data-act="attack" ${busy?'disabled':''}>⚔️ Espada</button>
          <button class="kingdom-btn magic"  data-act="magic"  ${busy || pMp < 20 ?'disabled':''}>🔮 Magia (20 MP)</button>
          <button class="kingdom-btn heal"   data-act="heal"   ${busy || (potions<=0 && pMp<15)?'disabled':''}>💚 Curar</button>
        </div>`;
      $$('.kingdom-btn', wrap).forEach(btn => btn.addEventListener('click', () => act(btn.dataset.act)));
    }

    function act(type) {
      if (!G.running || busy) return;
      busy = true;
      const b = BOSSES[stage];
      let msg = '';

      if (type === 'attack') {
        const crit = Math.random() < 0.22;
        const dmg = Math.round(rand(18, 26) * (crit ? 1.5 : 1));
        eHp = Math.max(0, eHp - dmg);
        pMp = Math.min(50, pMp + 10);
        beep(640, .08, 'triangle');
        msg = `${crit ? '💥 CRÍTICO! ' : ''}Você atacou ${b.name} causando ${dmg} de dano!`;
      } else if (type === 'magic') {
        pMp -= 20;
        const dmg = Math.round(rand(34, 46));
        eHp = Math.max(0, eHp - dmg);
        shieldDef = true;
        beep(880, .12, 'sine');
        msg = `🔮 Magia arcana causou ${dmg} de dano e reduziu o próximo ataque!`;
      } else if (type === 'heal') {
        if (potions > 0) potions--; else pMp -= 15;
        const heal = Math.round(rand(34, 44));
        pHp = Math.min(pMaxHp, pHp + heal);
        beep(520, .1, 'sine');
        msg = `💚 Você recuperou ${heal} HP!`;
      }

      if (eHp <= 0) {
        setScore(G.score + b.pts);
        if (stage >= BOSSES.length - 1) {
          setScore(G.score + G.time * 5);
          renderBattle(`🏆 ${b.name} foi derrotado!`);
          const t = setTimeout(() => endRound(true), 600);
          gameTimers.push(t);
          return;
        }
        stage++;
        pHp = Math.min(pMaxHp, pHp + 20);
        pMp = Math.min(50, pMp + 15);
        eMaxHp = eHp = BOSSES[stage].hp;
        busy = false; sOk();
        renderBattle(`✨ ${b.name} derrotado! +${b.pts} pts! Aparece ${BOSSES[stage].name}!`);
        return;
      }

      renderBattle(msg);
      const t = setTimeout(() => {
        if (!G.running) return;
        let eDmg = Math.round(rand(b.atk[0], b.atk[1]));
        if (shieldDef) { eDmg = Math.round(eDmg * 0.65); shieldDef = false; }
        pHp = Math.max(0, pHp - eDmg);
        sBad();
        busy = false;
        if (pHp <= 0) {
          renderBattle(`💀 ${b.name} causou ${eDmg} de dano!`);
          const t2 = setTimeout(() => endRound(false), 500);
          gameTimers.push(t2);
          return;
        }
        renderBattle(`${b.name} contra-atacou causando ${eDmg} de dano!`);
      }, 480);
      gameTimers.push(t);
    }

    return {
      duration: 90,
      intro: 'Batalhe por turnos contra <strong>4 chefes</strong>!<br/>Use Espada (+MP), Magia (dano alto + defesa) e Curar.',
      start() {
        stage = 0; pMaxHp = 100; pHp = 100; pMp = 40; potions = 3;
        eMaxHp = eHp = BOSSES[0].hp; shieldDef = false; busy = false;
        wrap = document.createElement('div');
        wrap.className = 'kingdom-wrap';
        field().appendChild(wrap);
        renderBattle('Um Slime Sombrio bloqueia o caminho!');
      },
      onTimeout() { endRound(false); },
      stop() { clrTimers(); if (wrap) wrap.remove(); wrap = null; }
    };
  })(),

  /* 6. ABYSS DIVE */
  abyss: (() => {
    let bg, diver, dx = 120, dy = 160, tx = 120, ty = 160, lives = 3, invuln = 0, entities = [], lastTs = 0, spawnAcc = 0;
    const keys = {};

    function updateHud() {
      setHudExtra(`<span>Oxigênio: <strong>${'🫧'.repeat(Math.max(0, lives)) || '💀'}</strong></span>`);
    }
    function loop(ts) {
      if (!G.running) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const f = field(), W = f.clientWidth, H = f.clientHeight;
      const spd = 290;
      if (keys.ArrowLeft || keys.a)  tx -= spd * dt;
      if (keys.ArrowRight || keys.d) tx += spd * dt;
      if (keys.ArrowUp || keys.w)    ty -= spd * dt;
      if (keys.ArrowDown || keys.s)  ty += spd * dt;
      tx = clamp(tx, 24, W - 24); ty = clamp(ty, 24, H - 24);
      dx += (tx - dx) * Math.min(1, dt * 12);
      dy += (ty - dy) * Math.min(1, dt * 12);
      diver.style.left = dx + 'px'; diver.style.top = dy + 'px';

      if (invuln > 0) invuln -= dt;
      diver.style.opacity = invuln > 0 && Math.floor(invuln * 12) % 2 ? '0.35' : '1';

      const elapsed = (ts - G.startedAt) / 35000;
      spawnAcc += dt;
      if (spawnAcc >= Math.max(0.38, 0.72 - elapsed * 0.3)) {
        spawnAcc = 0;
        const isJelly = Math.random() < 0.48;
        const isGold = !isJelly && Math.random() < 0.25;
        const el = document.createElement('div');
        el.className = isJelly ? 'abyss-jelly' : 'abyss-pearl';
        el.textContent = isJelly ? '🪼' : (isGold ? '🌟' : '🦪');
        const ex = W + 30;
        const ey = rand(30, H - 30);
        el.style.left = ex + 'px'; el.style.top = ey + 'px';
        bg.appendChild(el);
        entities.push({
          el, x: ex, y: ey, vx: -rand(130, 220 + elapsed * 110),
          vy: isJelly ? rand(-45, 45) : 0, isJelly, pts: isGold ? 50 : 20
        });
      }

      for (let i = entities.length - 1; i >= 0; i--) {
        const it = entities[i];
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        if (it.y < 24 || it.y > H - 24) it.vy *= -1;
        it.el.style.left = it.x + 'px'; it.el.style.top = it.y + 'px';

        if (Math.hypot(it.x - dx, it.y - dy) < 34) {
          if (!it.isJelly) {
            setScore(G.score + it.pts);
            beep(840, .06, 'triangle');
            floatScore(it.x, it.y, '+' + it.pts);
            it.el.remove(); entities.splice(i, 1);
            continue;
          } else if (invuln <= 0) {
            lives--; invuln = 1.2; updateHud(); sBad();
            it.el.remove(); entities.splice(i, 1);
            if (lives <= 0) { endRound(false); return; }
            continue;
          }
        }
        if (it.x < -40) { it.el.remove(); entities.splice(i, 1); }
      }
      gameRaf = requestAnimationFrame(loop);
    }

    return {
      duration: 35,
      intro: 'Mova o mergulhador com o <strong>mouse/toque</strong> ou <strong>WASD / Setas</strong>.<br/>Colete pérolas (<strong>🦪 🌟</strong>) e fuja das águas-vivas (<strong>🪼</strong>) por 35s!',
      start() {
        const f = field();
        lives = 3; invuln = 0; entities = []; lastTs = 0; spawnAcc = 0;
        dx = tx = Math.min(120, f.clientWidth * 0.25);
        dy = ty = f.clientHeight * 0.5;
        bg = document.createElement('div'); bg.className = 'abyss-bg';
        diver = document.createElement('div'); diver.className = 'abyss-diver'; diver.textContent = '🤿';
        diver.style.left = dx + 'px'; diver.style.top = dy + 'px';
        bg.appendChild(diver); f.appendChild(bg);
        updateHud();

        const moveTo = e => {
          if (!G.running) return;
          const r = bg.getBoundingClientRect();
          tx = e.clientX - r.left; ty = e.clientY - r.top;
        };
        bg.addEventListener('pointermove', moveTo);
        bg.addEventListener('pointerdown', moveTo);
        gameKeyFn = e => {
          if (!G.running) return;
          const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(k)) {
            if (e.type === 'keydown') e.preventDefault();
            keys[k] = (e.type === 'keydown');
          }
        };
        document.addEventListener('keydown', gameKeyFn);
        document.addEventListener('keyup', gameKeyFn);
        gameRaf = requestAnimationFrame(loop);
      },
      onTimeout() { setScore(G.score + 100); endRound(true); },
      stop() {
        cancelAnimationFrame(gameRaf);
        if (gameKeyFn) {
          document.removeEventListener('keydown', gameKeyFn);
          document.removeEventListener('keyup', gameKeyFn);
          gameKeyFn = null;
        }
        Object.keys(keys).forEach(k => delete keys[k]);
        entities.forEach(it => it.el.remove()); entities = [];
        if (bg) bg.remove();
      }
    };
  })(),

  /* 7. GHOST PROTOCOL */
  ghost: (() => {
    const LEVELS = [
      {
        map: [
          '0001000',
          '0101010',
          '0100010',
          '0001000',
          '1101011',
          '0000000',
          '0110102'
        ],
        guards: [[[5,1],[5,2],[5,3],[5,4],[5,5]], [[0,4],[1,4],[2,4],[3,4],[4,4]]],
        chips: [[0,6],[5,0]]
      },
      {
        map: [
          '0000100',
          '1100101',
          '0001000',
          '0100010',
          '0111010',
          '0000000',
          '1010102'
        ],
        guards: [[[2,0],[2,1],[2,2],[3,2],[3,3],[3,4]], [[5,0],[5,1],[5,2],[5,3],[5,4],[5,5]]],
        chips: [[0,6],[4,0]]
      },
      {
        map: [
          '0010000',
          '0010110',
          '0100010',
          '0001000',
          '1011010',
          '0000000',
          '0101012'
        ],
        guards: [[[0,3],[0,4],[0,5],[0,6],[1,6],[2,6]], [[5,1],[5,2],[5,3],[5,4],[5,5]], [[3,0],[3,1],[3,2]]],
        chips: [[0,6],[6,0]]
      }
    ];
    let wrap, grid, lvlIdx, pr, pc, lives, guardState, chips;

    function loadLevel(i) {
      lvlIdx = i; pr = 0; pc = 0;
      const L = LEVELS[lvlIdx];
      chips = L.chips.map(c => [...c]);
      guardState = L.guards.map(path => ({ path, idx: 0, dir: 1 }));
      draw();
    }
    function draw() {
      if (!grid) return;
      const L = LEVELS[lvlIdx];
      setHudExtra(`<span>Andar <strong>${lvlIdx + 1}/3</strong></span><span>Vidas: <strong>${'👻'.repeat(Math.max(0, lives)) || '💀'}</strong></span>`);
      grid.style.gridTemplateColumns = `repeat(7, 1fr)`;
      let html = '';
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const ch = L.map[r][c];
          const isPlayer = (r === pr && c === pc);
          const isGuard = guardState.some(g => g.path[g.idx][0] === r && g.path[g.idx][1] === c);
          const isChip = chips.some(cp => cp[0] === r && cp[1] === c);
          let cls = 'ghost-cell';
          if (ch === '1') cls += ' wall';
          if (ch === '2') cls += ' goal';
          let icon = '';
          if (isPlayer) icon = '👻';
          else if (isGuard) icon = '👁️';
          else if (ch === '2') icon = '🚪';
          else if (isChip) icon = '💾';
          html += `<div class="${cls}" data-r="${r}" data-c="${c}">${icon}</div>`;
        }
      }
      grid.innerHTML = html;
    }
    function checkCollision() {
      if (guardState.some(g => g.path[g.idx][0] === pr && g.path[g.idx][1] === pc)) {
        lives--; sBad();
        if (lives <= 0) { endRound(false); return true; }
        pr = 0; pc = 0;
        toast('👁️ Detectado! Voltando ao início do andar');
        draw();
        return true;
      }
      return false;
    }
    function move(dr, dc) {
      if (!G.running) return;
      const nr = pr + dr, nc = pc + dc;
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 7) return;
      if (LEVELS[lvlIdx].map[nr][nc] === '1') { beep(160, .04); return; }
      pr = nr; pc = nc; sNav();

      const ci = chips.findIndex(cp => cp[0] === pr && cp[1] === pc);
      if (ci >= 0) {
        chips.splice(ci, 1);
        setScore(G.score + 50);
        beep(840, .08, 'triangle');
      }
      if (checkCollision()) return;

      if (LEVELS[lvlIdx].map[pr][pc] === '2') {
        setScore(G.score + 200);
        sOk();
        if (lvlIdx >= LEVELS.length - 1) {
          setScore(G.score + G.time * 10);
          endRound(true);
          return;
        }
        loadLevel(lvlIdx + 1);
        return;
      }
      draw();
    }

    return {
      duration: 60,
      intro: 'Infiltre-se até a saída verde (<strong>🚪</strong>) usando <strong>WASD / Setas</strong> ou clicando na direção.<br/>Colete chips (<strong>💾</strong>) e evite os guardas (<strong>👁️</strong>) nos 3 andares!',
      start() {
        lives = 3;
        wrap = document.createElement('div'); wrap.className = 'ghost-wrap';
        grid = document.createElement('div'); grid.className = 'ghost-grid';
        wrap.appendChild(grid); field().appendChild(wrap);
        loadLevel(0);

        grid.addEventListener('pointerdown', e => {
          const cell = e.target.closest('.ghost-cell'); if (!cell || !G.running) return;
          const r = +cell.dataset.r, c = +cell.dataset.c;
          const dr = r - pr, dc = c - pc;
          if (dr === 0 && dc === 0) return;
          if (Math.abs(dr) >= Math.abs(dc)) move(Math.sign(dr), 0);
          else move(0, Math.sign(dc));
        });

        gameKeyFn = e => {
          if (!G.running) return;
          const k = e.key.toLowerCase();
          if (e.key === 'ArrowUp' || k === 'w')    { e.preventDefault(); move(-1, 0); }
          if (e.key === 'ArrowDown' || k === 's')  { e.preventDefault(); move(1, 0); }
          if (e.key === 'ArrowLeft' || k === 'a')  { e.preventDefault(); move(0, -1); }
          if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); move(0, 1); }
        };
        document.addEventListener('keydown', gameKeyFn);

        const patrolInt = setInterval(() => {
          if (!G.running) return;
          guardState.forEach(g => {
            g.idx += g.dir;
            if (g.idx >= g.path.length - 1 || g.idx <= 0) g.dir *= -1;
          });
          if (!checkCollision()) draw();
        }, 620);
        gameTimers.push(patrolInt);
      },
      onTimeout() { endRound(false); },
      stop() {
        clrTimers();
        if (gameKeyFn) { document.removeEventListener('keydown', gameKeyFn); gameKeyFn = null; }
        if (wrap) wrap.remove(); wrap = grid = null;
      }
    };
  })(),

  /* 8. RUNE LEGACY */
  rune: {
    duration: 60,
    intro: 'Vire as runas e encontre os <strong>8 pares</strong>.<br/>+100 por par · −10 por erro · bônus por tempo sobrando. Você tem <strong>60 segundos</strong>!',
    start() {
      const syms = ['🔥','💧','🌿','⚡','❄️','🌙','☀️','💀'];
      const deck = [...syms, ...syms].sort(() => Math.random() - .5);
      const wrap = document.createElement('div');
      wrap.className = 'rune-wrap'; wrap.id = 'rune-layer';
      wrap.innerHTML = '<div class="rune-grid">' +
        deck.map((_, i) => `<button type="button" class="rune-card" data-i="${i}"></button>`).join('') + '</div>';
      field().appendChild(wrap);

      let open = [], lock = false, matched = 0;
      wrap.addEventListener('click', e => {
        const c = e.target.closest('.rune-card');
        if (!c || lock || !G.running || c.classList.contains('flipped') || c.classList.contains('matched')) return;
        c.classList.add('flipped'); c.textContent = deck[c.dataset.i];
        beep(560, .05, 'triangle'); open.push(c);
        if (open.length < 2) return;

        const [a, b] = open; open = [];
        if (a.textContent === b.textContent) {
          a.classList.replace('flipped', 'matched'); b.classList.replace('flipped', 'matched');
          setScore(G.score + 100); beep(880, .1, 'triangle'); matched++;
          if (matched === 8) {
            clearInterval(G.tick);
            setScore(G.score + G.time * 10);
            setTimeout(() => endRound(true), 500);
          }
        } else {
          lock = true; beep(200, .12, 'square');
          setScore(Math.max(0, G.score - 10));
          setTimeout(() => {
            [a, b].forEach(x => { x.classList.remove('flipped'); x.textContent = ''; });
            lock = false;
          }, 700);
        }
      });
    },
    onTimeout() { endRound(false); },
    stop() { const l = $('#rune-layer'); if (l) l.remove(); },
  },

  /* 9. ORBIT DEFENSE (Loja) */
  orbit: (() => {
    let base, shield = 5, meteors = [], lastTs = 0, spawnAcc = 0;
    function updateHud() {
      setHudExtra(`<span>Planeta: <strong>${'🌍'.repeat(Math.max(0, shield)) || '💥'}</strong></span>`);
    }
    function shootBeam(tx, ty) {
      const f = field(), bx = f.clientWidth / 2, by = f.clientHeight - 34;
      const beam = document.createElement('div');
      beam.className = 'orbit-beam';
      const len = Math.hypot(tx - bx, ty - by);
      const ang = Math.atan2(ty - by, tx - bx) * 180 / Math.PI;
      beam.style.left = bx + 'px'; beam.style.top = by + 'px';
      beam.style.width = len + 'px'; beam.style.transform = `rotate(${ang}deg)`;
      f.appendChild(beam);
      setTimeout(() => beam.remove(), 120);
    }
    function loop(ts) {
      if (!G.running) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      const f = field(), W = f.clientWidth, H = f.clientHeight;
      const elapsed = (ts - G.startedAt) / 40000;

      spawnAcc += dt;
      if (spawnAcc >= Math.max(0.42, 0.92 - elapsed * 0.45)) {
        spawnAcc = 0;
        const isBig = Math.random() < 0.25;
        const el = document.createElement('div');
        el.className = 'alien' + (isBig ? ' tank' : '');
        el.textContent = isBig ? '🛸' : '☄️';
        const x = rand(28, W - 56), y = -36;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        f.appendChild(el);
        const m = { el, x, y, hp: isBig ? 2 : 1, pts: isBig ? 45 : 20, vy: rand(80, 140 + elapsed * 90) };
        el.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (!G.running) return;
          shootBeam(m.x + 18, m.y + 18);
          m.hp--;
          if (m.hp <= 0) {
            setScore(G.score + m.pts);
            beep(880, .06, 'triangle');
            floatScore(m.x, m.y, '+' + m.pts);
            el.remove();
            meteors = meteors.filter(k => k !== m);
          } else {
            beep(500, .05);
          }
        });
        meteors.push(m);
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.y += m.vy * dt;
        m.el.style.top = m.y + 'px';
        if (m.y >= H - 55) {
          m.el.remove(); meteors.splice(i, 1);
          shield--; updateHud(); sBad();
          if (shield <= 0) { endRound(false); return; }
        }
      }
      gameRaf = requestAnimationFrame(loop);
    }
    return {
      duration: 40,
      intro: 'Clique ou toque nos meteoros (<strong>☄️</strong>) e OVNIs (<strong>🛸</strong>) para disparar o laser da sua base orbital!',
      start() {
        shield = 5; meteors = []; lastTs = 0; spawnAcc = 0;
        base = document.createElement('div');
        base.className = 'orbit-base'; base.textContent = '🛰️';
        field().appendChild(base);
        updateHud();
        gameRaf = requestAnimationFrame(loop);
      },
      onTimeout() { setScore(G.score + shield * 25); endRound(true); },
      stop() {
        cancelAnimationFrame(gameRaf);
        meteors.forEach(m => m.el.remove()); meteors = [];
        if (base) base.remove(); base = null;
      }
    };
  })(),

  /* 10. NEON PULSE (Loja) */
  pulse: (() => {
    const PADS = [
      { color:'#a855f7', freq:523, label:'▲' },
      { color:'#ec4899', freq:587, label:'●' },
      { color:'#3b82f6', freq:659, label:'✕' },
      { color:'#10b981', freq:784, label:'■' },
      { color:'#f59e0b', freq:880, label:'◆' },
      { color:'#ef4444', freq:987, label:'★' },
      { color:'#06b6d4', freq:1046, label:'◈' },
      { color:'#84cc16', freq:1174, label:'✦' },
    ];
    let wrap, pads = [], seq = [], step = 0, lives = 3, locked = true;

    function updateHud() {
      setHudExtra(`<span>Rodada <strong>${seq.length}</strong></span><span>Vidas: <strong>${'❤️'.repeat(Math.max(0, lives)) || '💀'}</strong></span>`);
    }
    function flash(idx, dur = 320) {
      const p = pads[idx]; if (!p) return;
      p.classList.add('lit');
      beep(PADS[idx].freq, dur / 1000, 'sine', .07);
      const t = setTimeout(() => p.classList.remove('lit'), dur);
      gameTimers.push(t);
    }
    function playSeq() {
      locked = true; updateHud();
      seq.forEach((padIdx, k) => {
        const t = setTimeout(() => {
          if (!G.running) return;
          flash(padIdx, 300);
          if (k === seq.length - 1) {
            const t2 = setTimeout(() => { locked = false; }, 350);
            gameTimers.push(t2);
          }
        }, 420 + k * 440);
        gameTimers.push(t);
      });
    }
    function nextRound() {
      step = 0;
      seq.push(Math.floor(Math.random() * 8));
      playSeq();
    }

    return {
      duration: 60,
      intro: 'Memorize a sequência de pads luminosos estilo PlayStation e repita na ordem certa!<br/>Complete <strong>7 rodadas</strong> para vencer!',
      start() {
        seq = []; step = 0; lives = 3; locked = true;
        wrap = document.createElement('div'); wrap.className = 'rune-wrap';
        const grid = document.createElement('div'); grid.className = 'rune-grid';
        pads = PADS.map((pd, i) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'pulse-pad';
          b.style.background = pd.color; b.style.color = pd.color;
          b.innerHTML = `<span style="color:#fff">${pd.label}</span>`;
          b.addEventListener('pointerdown', () => {
            if (!G.running || locked) return;
            flash(i, 200);
            if (i === seq[step]) {
              step++;
              if (step >= seq.length) {
                setScore(G.score + seq.length * 100);
                sOk();
                if (seq.length >= 7) {
                  setScore(G.score + G.time * 5);
                  const t = setTimeout(() => endRound(true), 350);
                  gameTimers.push(t);
                  return;
                }
                locked = true;
                const t = setTimeout(nextRound, 500);
                gameTimers.push(t);
              }
            } else {
              lives--; sBad(); updateHud();
              if (lives <= 0) { endRound(false); return; }
              step = 0; locked = true;
              const t = setTimeout(playSeq, 650);
              gameTimers.push(t);
            }
          });
          grid.appendChild(b);
          return b;
        });
        wrap.appendChild(grid); field().appendChild(wrap);
        nextRound();
      },
      onTimeout() { endRound(G.score >= 100); },
      stop() { clrTimers(); if (wrap) wrap.remove(); wrap = null; pads = []; }
    };
  })(),
};

/* ---------- Reflex: alvos ---------- */
function spawnLoop() {
  if (!G.running) return;
  spawnTarget();
  const elapsed = (performance.now() - G.startedAt) / 30000;
  spawnT = setTimeout(spawnLoop, 850 - elapsed * 400);
}
function spawnTarget() {
  const f = field();
  const W = f.clientWidth, H = f.clientHeight;
  const size = rand(52, 84);
  const t = document.createElement('button');
  t.className = 'game-target';
  t.style.width = t.style.height = size + 'px';
  t.style.left = rand(8, Math.max(9, W - size - 8)) + 'px';
  t.style.top  = rand(8, Math.max(9, H - size - 8)) + 'px';
  f.appendChild(t);

  const elapsed = (performance.now() - G.startedAt) / 30000;
  const life = 1200 - elapsed * 500;
  let hit = false;

  t.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (hit || !G.running) return;
    hit = true;
    const pts = size < 62 ? 15 : 10;
    setScore(G.score + pts);
    beep(700 + Math.min(G.score, 400), .06, 'triangle');
    floatScore(parseFloat(t.style.left), parseFloat(t.style.top), '+' + pts);
    t.classList.add('game-target-hit');
    setTimeout(() => t.remove(), 350);
  });

  setTimeout(() => {
    if (hit || !t.isConnected) return;
    t.classList.add('game-target-out');
    setTimeout(() => t.remove(), 300);
  }, life);
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
function ensureMusicToggle() {
  if ($('#music-toggle')) return;
  const item = document.createElement('div');
  item.className = 'settings-item';
  item.innerHTML = `<div class="settings-info"><strong>Música de fundo</strong><p>Toca ${MUSIC_FILE} da pasta do projeto</p></div><button class="btn-toggle" id="music-toggle"></button>`;
  $('#sound-toggle').closest('.settings-item').after(item);
  $('#music-toggle').addEventListener('click', () => {
    db.music = !db.music; save();
    db.music ? playMusic() : music.pause();
    refreshToggles(); sNav();
  });
}
function refreshToggles() {
  const sEl = $('#sound-toggle'), m = $('#music-toggle');
  sEl.textContent = db.sound ? 'Ativado' : 'Desativado'; sEl.classList.toggle('off', !db.sound);
  if (m) { m.textContent = db.music ? 'Ativada' : 'Desativada'; m.classList.toggle('off', !db.music); }
}
function openSettings() {
  ensureMusicToggle(); refreshToggles();
  applyTheme(db.theme);
  show('settings');
}
$('#btn-settings-back').addEventListener('click', () => { sNav(); show(current ? 'menu' : 'profiles'); });
$('#theme-switch').addEventListener('click', e => {
  const b = e.target.closest('.theme-opt'); if (!b) return;
  applyTheme(b.dataset.theme); sNav();
});
$('#sound-toggle').addEventListener('click', () => {
  db.sound = !db.sound; save();
  $('#sound-toggle').textContent = db.sound ? 'Ativado' : 'Desativado';
  $('#sound-toggle').classList.toggle('off', !db.sound);
  sNav();
});
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Apagar TODOS os perfis, troféus, compras e recordes? Isso não pode ser desfeito.')) return;
  const theme = db.theme;
  db = { profiles: [], sound: true, music: true, theme };
  save(); current = null; pIdx = 0; notifications = [];
  renderProfiles(); show('profiles'); toast('Dados apagados');
});

/* =========================================================
   TROFÉUS
   ========================================================= */
function openTrophies() {
  if (!current) return;
  $('#trophies-owner').textContent = current.name;
  const body = $('#trophies-body');
  const games = installedGames().filter(g => TROPHIES[g.id]);
  body.innerHTML = games.map(g => {
    const list = TROPHIES[g.id], have = current.trophies[g.id] || [];
    return `
      <div class="trophy-game">
        <div class="trophy-game-header">
          <div class="trophy-game-icon" style="background:linear-gradient(145deg,${g.c1},${g.c2})">${g.icon}</div>
          <div>
            <div class="trophy-game-name">${esc(g.name)}</div>
            <div class="trophy-game-progress">${have.length}/${list.length} troféus${current.best[g.id] != null ? ' · Recorde: ' + current.best[g.id] : ''}</div>
          </div>
        </div>
        <div class="trophy-list">
          ${list.map(t => `
            <div class="trophy-item ${t.tier}${have.includes(t.id) ? ' earned' : ''}" title="${esc(t.desc)}">
              <span class="trophy-icon">${t.icon}</span>
              <span><strong>${esc(t.name)}</strong><br>${esc(t.desc)}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
  show('trophies'); sNav();
}
$('#btn-trophies-back').addEventListener('click', () => { sNav(); show('menu'); });

/* =========================================================
   TECLADO
   ========================================================= */
document.addEventListener('keydown', e => {
  if (anyModalOpen()) {
    if (e.key === 'Escape') $$('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    if (e.key === 'Enter') {
      if ($('#modal-create').classList.contains('open')) confirmCreate();
      else if ($('#modal-power').classList.contains('open')) $('#btn-power-confirm').click();
      else if ($('#modal-checkout')?.classList.contains('open') && checkoutHandler) checkoutHandler();
    }
    return;
  }

  if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('button')) return;

  switch (screen) {
    case 'boot':
      afterBoot(); break;

    case 'profiles': {
      const max = db.profiles.length + (db.profiles.length < MAX_PROFILES ? 1 : 0) - 1;
      if (e.key === 'ArrowRight') { pIdx = Math.min(max, pIdx + 1); markSelected(); sNav(); }
      else if (e.key === 'ArrowLeft') { pIdx = Math.max(0, pIdx - 1); markSelected(); sNav(); }
      else if (e.key === 'Enter') {
        if (pIdx < db.profiles.length) login(db.profiles[pIdx]); else openCreate();
      }
      else if (e.key === 'Delete' && pIdx < db.profiles.length) removeProfile(pIdx);
      break;
    }

    case 'menu':
      if (e.key === 'ArrowRight') selectGame(gameIdx + 1);
      else if (e.key === 'ArrowLeft') selectGame(gameIdx - 1);
      else if (e.key === 'Enter') launch(installedGames()[gameIdx]);
      else if (e.key.toLowerCase() === 't') openTrophies();
      else if (e.key.toLowerCase() === 's') openSettings();
      else if (e.key.toLowerCase() === 'l') openStore();
      else if (e.key.toLowerCase() === 'p') openPSPlus();
      break;

    case 'game':
      if (e.key === 'Escape') exitGame();
      else if (e.key === 'Enter' && !$('#game-intro').classList.contains('hide')) beginRound();
      break;

    case 'settings':
      if (e.key === 'Escape') $('#btn-settings-back').click();
      break;

    case 'trophies':
      if (e.key === 'Escape') $('#btn-trophies-back').click();
      break;

    case 'store':
    case 'psplus':
    case 'library':
      if (e.key === 'Escape') { sNav(); renderHome(); show('menu'); }
      break;
  }
});

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
ensureDynamicUI();
applyTheme(db.theme);
setOverlay('intro');
$$('.modal-overlay').forEach(o => o.addEventListener('mousedown', e => { if (e.target === o) o.classList.remove('open'); }));
startBoot();

})();
