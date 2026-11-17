/* =========================================================
   VORTEX 4 — vortexOS 4.02
   script.js
   ========================================================= */
(() => {
'use strict';

/* ---------- Atalhos ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rand = (a, b) => Math.random() * (b - a) + a;

/* ---------- Catálogo ---------- */
const GAMES = [
  { id:'reflex',   name:'Vortex Reflex',   genre:'Arcade',        icon:'⚡',  c1:'#a855f7', c2:'#ec4899', playable:true,
    desc:'Clique nos alvos antes que desapareçam. 30 segundos para fazer o máximo de pontos.' },
  { id:'drift',    name:'Neon Drift',      genre:'Corrida',       icon:'🏎️', c1:'#7c3aed', c2:'#1e1b4b', playable:false,
    desc:'Derrape por pistas de neon desviando do tráfego em alta velocidade.' },
  { id:'void',     name:'Void Hunter',     genre:'Tiro espacial', icon:'👾',  c1:'#6366f1', c2:'#0f172a', playable:false,
    desc:'Defenda sua base orbital contra ondas de alienígenas.' },
  { id:'kingdoms', name:'Pixel Kingdoms',  genre:'RPG',           icon:'⚔️', c1:'#f97316', c2:'#7f1d1d', playable:false,
    desc:'Batalhas por turnos em um reino feito de pixels.' },
  { id:'abyss',    name:'Abyss Dive',      genre:'Aventura',      icon:'🤿',  c1:'#0ea5e9', c2:'#082f49', playable:false,
    desc:'Mergulhe fundo, colete pérolas e fuja das águas-vivas.' },
  { id:'ghost',    name:'Ghost Protocol',  genre:'Furtivo',       icon:'👻',  c1:'#10b981', c2:'#022c22', playable:false,
    desc:'Infiltre-se no labirinto sem ser detectado.' },
  { id:'rune',     name:'Rune Legacy',     genre:'Puzzle',        icon:'🔮',  c1:'#d946ef', c2:'#3b0764', playable:false,
    desc:'Encontre os pares de runas antigas na memória.' },
];

const TROPHIES = {
  reflex: [
    { id:'r50',  tier:'bronze', icon:'🥉', name:'Aquecimento',      desc:'Faça 50 pontos',  min:50  },
    { id:'r150', tier:'silver', icon:'🥈', name:'Reflexo Rápido',   desc:'Faça 150 pontos', min:150 },
    { id:'r300', tier:'gold',   icon:'🥇', name:'Lenda do Vortex',  desc:'Faça 300 pontos', min:300 },
  ],
};

const AVATARS = ['🎮','👾','🦊','🐉','🚀','🤖','👻','🔥'];
const COLORS  = ['#a855f7','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444'];
const MAX_PROFILES = 5;

/* ---------- Estado persistente ---------- */
const KEY = 'vortex4.v1';
let db = load();
function load() {
  try { return Object.assign({ profiles:[], sound:true, theme:'dark' }, JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { return { profiles:[], sound:true, theme:'dark' }; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }

let current = null;     // perfil ativo
let gameIdx = 0;        // jogo selecionado na home
let pIdx = 0;           // perfil selecionado na tela de perfis
let screen = 'boot';

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

/* ---------- Toast ---------- */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
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
}
function anyModalOpen() { return $$('.modal-overlay.open').length > 0; }
const openModal  = id => $('#' + id).classList.add('open');
const closeModal = id => $('#' + id).classList.remove('open');

/* ---------- Tema ---------- */
function applyTheme(t) {
  db.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  $('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#08040f' : '#f7f3ff');
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === t));
  save();
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
    el.innerHTML = `
      <div class="profile-avatar" style="background:linear-gradient(145deg,${esc(p.color)},#1a0f2e)">${esc(p.avatar)}</div>
      <div class="profile-name">${esc(p.name)}</div>
      <div class="profile-trophies">🏆 ${totalTrophies(p)}</div>
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
  current = p; sOk();
  gameIdx = 0;
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
  const p = { id: 'p' + Date.now(), name, avatar: selAvatar, color: selColor, trophies: {}, best: {} };
  db.profiles.push(p); save();
  closeModal('modal-create');
  pIdx = db.profiles.length - 1;
  renderProfiles(); sOk(); toast(`Bem-vindo, ${name}!`);
}

/* =========================================================
   HOME
   ========================================================= */
function renderHome() {
  $('#user-name').textContent = current.name;
  const av = $('#user-avatar');
  av.textContent = current.avatar;
  av.style.background = `linear-gradient(145deg,${current.color},var(--primary-2))`;

  const track = $('#carousel-track');
  track.innerHTML = '';
  GAMES.forEach((g, i) => {
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
      if (i === gameIdx) launch(g); else selectGame(i);
    });
    track.appendChild(c);
  });
  selectGame(gameIdx, true);
}

function selectGame(i, silent) {
  gameIdx = (i + GAMES.length) % GAMES.length;
  const g = GAMES[gameIdx];
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

$('#btn-play').addEventListener('click', () => launch(GAMES[gameIdx]));
$('#btn-trophies').addEventListener('click', openTrophies);

/* ---------- Ações da topbar / quickbar ---------- */
function doAction(a) {
  sNav();
  switch (a) {
    case 'notifications': toast('🔔 Nenhuma notificação nova'); break;
    case 'settings':      openSettings(); break;
    case 'power':         openModal('modal-power'); break;
    case 'library':       toast('📚 Biblioteca: ' + GAMES.filter(g => g.playable).length + ' jogo(s) instalado(s)'); break;
    case 'trophies':      openTrophies(); break;
    case 'logout':        current = null; pIdx = 0; renderProfiles(); show('profiles'); break;
  }
}
$$('[data-action]').forEach(b => b.addEventListener('click', () => doAction(b.dataset.action)));

/* ---------- Desligar ---------- */
$('#btn-power-cancel').addEventListener('click', () => closeModal('modal-power'));
$('#btn-power-confirm').addEventListener('click', () => {
  closeModal('modal-power');
  current = null;
  const sb = document.createElement('div');
  sb.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000;color:#444;display:grid;place-items:center;font-size:13px;letter-spacing:.2em;cursor:pointer;text-transform:uppercase';
  sb.textContent = 'Modo de espera — toque para ligar';
  const wake = () => { sb.remove(); document.removeEventListener('keydown', wake); startBoot(); };
  sb.addEventListener('click', wake);
  setTimeout(() => document.addEventListener('keydown', wake, { once: true }), 300);
  document.body.appendChild(sb);
});

/* =========================================================
   LAUNCH
   ========================================================= */
let launchT;
function launch(g) {
  if (!g.playable) { sBad(); toast(`🔒 ${g.name} chega em breve!`); return; }
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
    p = Math.min(100, p + rand(8, 22));
    fill.style.width = p + '%';
    if (p > 60) status.textContent = 'Preparando…';
    if (p >= 100) {
      clearInterval(launchT);
      status.textContent = 'Pronto!';
      setTimeout(() => startGame(g), 350);
    }
  }, 220);
}

/* =========================================================
   VORTEX REFLEX
   ========================================================= */
const G = { running:false, score:0, time:30, tick:null, spawn:null, startedAt:0 };

function startGame(g) {
  show('game');
  resetGameUI();
}
function resetGameUI() {
  stopGame();
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '30';
  $('#game-intro').classList.remove('hide');
  $('#game-over').classList.add('hide');
}
function stopGame() {
  G.running = false;
  clearInterval(G.tick); clearTimeout(G.spawn);
  $$('.game-target, .score-float', $('#game-playfield')).forEach(e => e.remove());
}
function beginRound() {
  stopGame();
  G.running = true; G.score = 0; G.time = 30; G.startedAt = performance.now();
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '30';
  $('#game-intro').classList.add('hide');
  $('#game-over').classList.add('hide');
  sOk();

  G.tick = setInterval(() => {
    G.time--;
    $('#game-time').textContent = G.time;
    if (G.time <= 5 && G.time > 0) beep(300, .05, 'square', .03);
    if (G.time <= 0) endRound();
  }, 1000);
  spawnLoop();
}
function spawnLoop() {
  if (!G.running) return;
  spawnTarget();
  const elapsed = (performance.now() - G.startedAt) / 30000;     // 0..1
  const delay = 850 - elapsed * 400;                              // 850ms → 450ms
  G.spawn = setTimeout(spawnLoop, delay);
}
function spawnTarget() {
  const field = $('#game-playfield');
  const W = field.clientWidth, H = field.clientHeight;
  const size = rand(52, 84);
  const t = document.createElement('button');
  t.className = 'game-target';
  t.style.width = t.style.height = size + 'px';
  t.style.left = rand(8, Math.max(9, W - size - 8)) + 'px';
  t.style.top  = rand(8, Math.max(9, H - size - 8)) + 'px';
  field.appendChild(t);

  const elapsed = (performance.now() - G.startedAt) / 30000;
  const life = 1200 - elapsed * 500;                              // 1200ms → 700ms
  let hit = false;

  const hitFn = e => {
    e.stopPropagation();
    if (hit || !G.running) return;
    hit = true;
    const pts = size < 62 ? 15 : 10;                              // alvo pequeno vale mais
    G.score += pts;
    $('#game-score').textContent = G.score;
    beep(700 + Math.min(G.score, 400), .06, 'triangle');
    const f = document.createElement('div');
    f.className = 'score-float'; f.textContent = '+' + pts;
    f.style.left = t.style.left; f.style.top = t.style.top;
    field.appendChild(f); setTimeout(() => f.remove(), 800);
    t.classList.add('game-target-hit');
    setTimeout(() => t.remove(), 350);
  };
  t.addEventListener('pointerdown', hitFn);

  setTimeout(() => {
    if (hit || !t.isConnected) return;
    t.classList.add('game-target-out');
    setTimeout(() => t.remove(), 300);
  }, life);
}
function endRound() {
  if (!G.running) return;
  const score = G.score;
  stopGame();
  $('#game-final-score').textContent = score;

  // recorde + troféus
  const prevBest = current.best.reflex || 0;
  const isRecord = score > prevBest;
  if (isRecord) current.best.reflex = score;

  const have = current.trophies.reflex = current.trophies.reflex || [];
  const won = TROPHIES.reflex.filter(t => score >= t.min && !have.includes(t.id));
  won.forEach(t => have.push(t.id));
  save();

  const rw = $('#game-reward');
  let msg = '';
  if (isRecord && prevBest > 0) msg += '⭐ Novo recorde! ';
  if (won.length) msg += won.map(t => `${t.icon} ${t.name}`).join(' · ');
  rw.textContent = msg;

  $('#game-over').classList.remove('hide');
  won.length ? sOk() : beep(300, .2);
  won.forEach((t, i) => setTimeout(() => toast(`🏆 Troféu desbloqueado: ${t.name}`), 600 + i * 2300));
}

$('#btn-game-start').addEventListener('click', beginRound);
$('#btn-game-again').addEventListener('click', beginRound);
$('#btn-game-back').addEventListener('click', exitGame);
$('#btn-game-exit').addEventListener('click', exitGame);
function exitGame() {
  stopGame(); sNav();
  renderHome(); show('menu');
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */
function openSettings() {
  $('#sound-toggle').textContent = db.sound ? 'Ativado' : 'Desativado';
  $('#sound-toggle').classList.toggle('off', !db.sound);
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
  if (!confirm('Apagar TODOS os perfis, troféus e recordes? Isso não pode ser desfeito.')) return;
  const theme = db.theme;
  db = { profiles: [], sound: true, theme };
  save(); current = null; pIdx = 0;
  renderProfiles(); show('profiles'); toast('Dados apagados');
});

/* =========================================================
   TROFÉUS
   ========================================================= */
function openTrophies() {
  if (!current) return;
  $('#trophies-owner').textContent = current.name;
  const body = $('#trophies-body');
  body.innerHTML = GAMES.filter(g => TROPHIES[g.id]).map(g => {
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
  // modais primeiro
  if (anyModalOpen()) {
    if (e.key === 'Escape') { closeModal('modal-create'); closeModal('modal-power'); }
    if (e.key === 'Enter') {
      if ($('#modal-create').classList.contains('open')) confirmCreate();
      else $('#btn-power-confirm').click();
    }
    return;
  }

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
      else if (e.key === 'Enter') launch(GAMES[gameIdx]);
      else if (e.key.toLowerCase() === 't') openTrophies();
      else if (e.key.toLowerCase() === 's') openSettings();
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
  }
});

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
applyTheme(db.theme);
startBoot();

})();
