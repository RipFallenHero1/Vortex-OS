/* =========================================================
   VORTEX 4 — vortexOS 4.02
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));

/* ================= SETTINGS ================= */
let settings = (() => {
  try { return { theme:'dark', sound:true, ...(JSON.parse(localStorage.getItem('vortex4.settings')) || {}) }; }
  catch { return { theme:'dark', sound:true }; }
})();
const saveSettings = () => localStorage.setItem('vortex4.settings', JSON.stringify(settings));

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
  const st = $('#sound-toggle');
  if (st) {
    st.textContent = settings.sound ? 'Ativado' : 'Desativado';
    st.classList.toggle('off', !settings.sound);
  }
}

/* ================= ÁUDIO (safe) ================= */
let actx = null;
function initAudio() {
  if (actx) {
    if (actx.state === 'suspended') actx.resume().catch(() => {});
    return;
  }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
  } catch { actx = null; }
}
function beep(freq = 520, dur = 0.07, type = 'sine', vol = 0.035) {
  if (!settings.sound || !actx) return;
  try {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch {}
}
function startupChime() {
  if (!settings.sound) return;
  [523.25, 659.25, 783.99].forEach((f, i) => setTimeout(() => beep(f, 0.5, 'sine', 0.05), i * 180));
}
// init audio on ANY user interaction (safe, idempotent)
['pointerdown','keydown','touchstart'].forEach(evt =>
  window.addEventListener(evt, initAudio, { once: true, passive: true })
);

/* ================= TELAS ================= */
let currentScreen = 'screen-boot';
function showScreen(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  currentScreen = id;
  if (id === 'screen-menu') {
    requestAnimationFrame(() => { updateCarousel(); requestAnimationFrame(updateCarousel); });
  }
}

/* ================= DADOS ================= */
const AVATARS = ['🎮','😎','👾','🐉','🦊','🤖','🐺','🦄','🔥','⭐','🌙','🍕'];
const COLORS = [
  ['#a855f7','#6d28d9'], ['#ec4899','#7c3aed'], ['#f97316','#dc2626'],
  ['#06b6d4','#3b82f6'], ['#10b981','#0891b2'], ['#f43f5e','#a21caf'],
];
const TIERS = { bronze:{name:'Bronze',icon:'🥉'}, silver:{name:'Prata',icon:'🥈'}, gold:{name:'Ouro',icon:'🥇'} };

const GAMES = [
  { id:'reflex', title:'Vortex Reflex', genre:'Arcade', emoji:'⚡', c1:'#a855f7', c2:'#ec4899',
    desc:'Clique nos alvos que surgem antes que desapareçam. Trinta segundos para fazer o máximo de pontos!',
    trophies:[ {id:'bronze',tier:'bronze',req:'10 pts',score:10}, {id:'silver',tier:'silver',req:'20 pts',score:20}, {id:'gold',tier:'gold',req:'30 pts',score:30} ] },
  { id:'drift', title:'Neon Drift', genre:'Corrida', emoji:'🏎️', c1:'#06b6d4', c2:'#3b82f6',
    desc:'Desvie dos carros na rodovia cyberpunk usando ← →. Cada segundo vivo vale 2 pontos. Aguentar 30s!',
    trophies:[ {id:'bronze',tier:'bronze',req:'20 pts',score:20}, {id:'silver',tier:'silver',req:'40 pts',score:40}, {id:'gold',tier:'gold',req:'60 pts',score:60} ] },
  { id:'hunter', title:'Void Hunter', genre:'Ação', emoji:'🚀', c1:'#ec4899', c2:'#7c3aed',
    desc:'Clique nos aliens antes que cheguem ao fundo! Cada kill vale 2 pts. Você tem 3 vidas — perde 1 por alien que escapar.',
    trophies:[ {id:'bronze',tier:'bronze',req:'10 pts',score:10}, {id:'silver',tier:'silver',req:'20 pts',score:20}, {id:'gold',tier:'gold',req:'30 pts',score:30} ] },
  { id:'kingdoms', title:'Pixel Kingdoms', genre:'RPG', emoji:'⚔️', c1:'#f59e0b', c2:'#dc2626',
    desc:'Batalha por turnos contra o Lorde das Sombras. Escolha: ⚔️ Atacar, ✨ Magia (40% falha) ou 💚 Curar.',
    trophies:[ {id:'bronze',tier:'bronze',req:'30 dmg',score:30}, {id:'silver',tier:'silver',req:'60 dmg',score:60}, {id:'gold',tier:'gold',req:'100 dmg',score:100} ] },
  { id:'abyss', title:'Abyss Dive', genre:'Aventura', emoji:'🌊', c1:'#10b981', c2:'#0891b2',
    desc:'Mergulhe e colete pérolas com ← → ↑ ↓. Evite as águas-vivas! Cada pérola vale 2 pts em 30s.',
    trophies:[ {id:'bronze',tier:'bronze',req:'10 pts',score:10}, {id:'silver',tier:'silver',req:'20 pts',score:20}, {id:'gold',tier:'gold',req:'30 pts',score:30} ] },
  { id:'ghost', title:'Ghost Protocol', genre:'Stealth', emoji:'👻', c1:'#94a3b8', c2:'#4c1d95',
    desc:'Mova com ← → ↑ ↓ até a porta 🚪 evitando os guardas 👁️. Cada nível vale 10 pts. 3 níveis!',
    trophies:[ {id:'bronze',tier:'bronze',req:'1 nível',score:10}, {id:'silver',tier:'silver',req:'2 níveis',score:20}, {id:'gold',tier:'gold',req:'3 níveis',score:30} ] },
  { id:'storm', title:'Storm Riders', genre:'Esporte', emoji:'🏂', c1:'#f97316', c2:'#dc2626',
    desc:'Desça a montanha em tempestade! Desvie das árvores com ← →. Cada segundo vale 2 pts.',
    trophies:[ {id:'bronze',tier:'bronze',req:'20 pts',score:20}, {id:'silver',tier:'silver',req:'40 pts',score:40}, {id:'gold',tier:'gold',req:'60 pts',score:60} ] },
  { id:'orbit', title:'Orbit Wars', genre:'Estratégia', emoji:'🛸', c1:'#7cf5ff', c2:'#2563eb',
    desc:'Defenda a base! Clique nas naves inimigas antes que cheguem. Tanques (azuis) precisam de 2 cliques. Base tem 5 HP.',
    trophies:[ {id:'bronze',tier:'bronze',req:'10 pts',score:10}, {id:'silver',tier:'silver',req:'20 pts',score:20}, {id:'gold',tier:'gold',req:'30 pts',score:30} ] },
  { id:'rune', title:'Rune Legacy', genre:'RPG', emoji:'🔮', c1:'#c084fc', c2:'#6d28d9',
    desc:'Encontre os pares de runas virando as cartas. Cada par vale 5 pts em 30s!',
    trophies:[ {id:'bronze',tier:'bronze',req:'10 pts',score:10}, {id:'silver',tier:'silver',req:'20 pts',score:20}, {id:'gold',tier:'gold',req:'30 pts',score:30} ] },
];

/* ================= PERFIS ================= */
let profiles = (() => {
  try { return JSON.parse(localStorage.getItem('vortex4.profiles')) || []; }
  catch { return []; }
})();
const saveProfiles = () => localStorage.setItem('vortex4.profiles', JSON.stringify(profiles));
let profileIndex = 0;
let currentProfile = null;
const trophyCount = p => p?.trophies ? Object.values(p.trophies).reduce((n, a) => n + a.length, 0) : 0;

function renderProfiles() {
  const row = $('#profiles-row');
  row.innerHTML = '';
  profiles.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'profile-card' + (i === profileIndex ? ' selected' : '');
    card.dataset.idx = i;
    card.innerHTML = `
      <div class="profile-avatar" style="background:linear-gradient(145deg,${p.color[0]},${p.color[1]})">${p.avatar}</div>
      <span class="profile-name">${esc(p.name)}</span>
      <span class="profile-trophies">${trophyCount(p) ? '🏆 ' + trophyCount(p) : ''}</span>
      <button type="button" class="profile-del" data-del="${i}">✕</button>
    `;
    card.addEventListener('click', e => {
      if (e.target.dataset.del !== undefined) return;
      profileIndex = i;
      beep(620);
      renderProfiles();
    });
    card.addEventListener('dblclick', () => loginAs(i));
    const del = card.querySelector('.profile-del');
    del.addEventListener('click', e => {
      e.stopPropagation();
      profiles.splice(i, 1);
      saveProfiles();
      profileIndex = Math.max(0, Math.min(profileIndex, profiles.length));
      beep(240, 0.13, 'sawtooth');
      renderProfiles();
    });
    row.appendChild(card);
  });
  const add = document.createElement('div');
  add.className = 'profile-card' + (profileIndex === profiles.length ? ' selected' : '');
  add.innerHTML = `
    <div class="profile-avatar add-avatar">+</div>
    <span class="profile-name">Novo Perfil</span>
    <span class="profile-trophies"></span>
  `;
  add.addEventListener('click', () => { profileIndex = profiles.length; renderProfiles(); openModal(); });
  row.appendChild(add);
}

function loginAs(i) {
  const p = profiles[i];
  if (!p) return;
  currentProfile = p;
  $('#user-name').textContent = p.name;
  const av = $('#user-avatar');
  av.textContent = p.avatar;
  av.style.background = `linear-gradient(145deg,${p.color[0]},${p.color[1]})`;
  gameIndex = 0;
  renderCarousel();
  showScreen('screen-menu');
  beep(1040, 0.12, 'triangle');
}

function logout() {
  beep(400, 0.1);
  profileIndex = Math.max(0, profiles.indexOf(currentProfile));
  currentProfile = null;
  renderProfiles();
  showScreen('screen-profiles');
}

/* ================= MODAL CRIAR PERFIL ================= */
let newAvatar = AVATARS[0], newColor = COLORS[0];
function openModal() {
  if (profiles.length >= 8) { toast('Limite de 8 perfis 😅'); return; }
  newAvatar = AVATARS[rndInt(0, AVATARS.length - 1)];
  newColor = COLORS[rndInt(0, COLORS.length - 1)];
  $('#input-name').value = '';
  buildPickers();
  $('#modal-create').classList.add('open');
  setTimeout(() => $('#input-name').focus(), 130);
  beep(700, 0.08, 'triangle');
}
const closeModal = () => $('#modal-create').classList.remove('open');

function buildPickers() {
  const pa = $('#picker-avatar'); pa.innerHTML = '';
  AVATARS.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (a === newAvatar ? ' sel' : '');
    b.textContent = a;
    b.onclick = () => { newAvatar = a; beep(760); buildPickers(); };
    pa.appendChild(b);
  });
  const pc = $('#picker-color'); pc.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick color' + (c === newColor ? ' sel' : '');
    b.style.background = `linear-gradient(145deg,${c[0]},${c[1]})`;
    b.onclick = () => { newColor = c; beep(760); buildPickers(); };
    pc.appendChild(b);
  });
}

$('#btn-cancel').addEventListener('click', closeModal);
$('#modal-create').addEventListener('click', e => { if (e.target.id === 'modal-create') closeModal(); });
$('#btn-confirm').addEventListener('click', () => {
  if (profiles.length >= 8) { toast('Limite de 8 perfis 😅'); return; }
  const name = ($('#input-name').value || '').trim() || 'Jogador' + (profiles.length + 1);
  profiles.push({ id: Date.now(), name, avatar: newAvatar, color: newColor, trophies: {}, bestScores: {} });
  saveProfiles();
  closeModal();
  beep(900, 0.12, 'triangle');
  loginAs(profiles.length - 1);
});

/* ================= CARROSSEL / HOME ================= */
let gameIndex = 0;

function renderCarousel() {
  const track = $('#carousel-track');
  track.innerHTML = '';
  GAMES.forEach((g, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'game-card';
    card.style.setProperty('--c1', g.c1);
    card.style.setProperty('--c2', g.c2);
    const earned = currentProfile?.trophies?.[g.id]?.length || 0;
    card.innerHTML = `
      <div class="game-art">${g.emoji}</div>
      <span class="game-genre">${g.genre}</span>
      ${earned > 0 ? `<span class="game-trophy-mark">🏆${earned}</span>` : ''}
      <span class="game-name">${esc(g.title)}</span>
    `;
    card.addEventListener('click', () => {
      if (gameIndex === i) { launchGame(i); }
      else { selectGame(i); beep(560); }
    });
    track.appendChild(card);
  });
  selectGame(0);
  requestAnimationFrame(updateCarousel);
}

function selectGame(i) {
  gameIndex = (i + GAMES.length) % GAMES.length;
  $$('.game-card').forEach((c, idx) => c.classList.toggle('selected', idx === gameIndex));
  updateHero();
  updateCarousel();
}

function updateHero() {
  const g = GAMES[gameIndex];
  if (!g) return;
  $('#hero-genre').textContent = g.genre;
  $('#hero-title').textContent = g.title;
  $('#hero-desc').textContent = g.desc;
  $('#home-bg').style.background = `
    radial-gradient(circle at 75% 30%, ${g.c1}, transparent 55%),
    radial-gradient(circle at 20% 75%, ${g.c2}, transparent 55%)
  `;
  const earned = currentProfile?.trophies?.[g.id]?.length || 0;
  const total = g.trophies?.length || 0;
  const best = currentProfile?.bestScores?.[g.id] || 0;
  const items = [];
  if (total > 0) items.push(`🏆 ${earned}/${total} troféus`);
  if (best > 0) items.push(`⭐ Recorde: ${best}`);
  $('#hero-meta').innerHTML = items.map(t => `<span>${t}</span>`).join('');
}

function updateCarousel() {
  const wrap = $('#home-carousel');
  const track = $('#carousel-track');
  if (!wrap || !track || !track.children.length) return;
  const cardW = track.children[0].offsetWidth;
  if (!cardW) return;
  const step = cardW + 20;
  const offset = (wrap.clientWidth - cardW) / 2 - gameIndex * step;
  track.style.transform = `translateX(${offset}px)`;
}
window.addEventListener('resize', () => {
  if (currentScreen === 'screen-menu') updateCarousel();
});

function refreshTrophyMarks() {
  $$('.game-card').forEach((card, i) => {
    const g = GAMES[i];
    const earned = currentProfile?.trophies?.[g.id]?.length || 0;
    const mark = card.querySelector('.game-trophy-mark');
    if (earned > 0) {
      if (mark) mark.textContent = `🏆${earned}`;
      else {
        const m = document.createElement('span');
        m.className = 'game-trophy-mark';
        m.textContent = `🏆${earned}`;
        card.appendChild(m);
      }
    } else if (mark) mark.remove();
  });
}

/* ================= HOME BOTÕES (delegação GLOBAL) ================= */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  try {
    initAudio();
    beep(620);
    if (action === 'settings') openSettings();
    else if (action === 'notifications') toast('Sem notificações novas 📭');
    else if (action === 'power') $('#modal-power').classList.add('open');
    else if (action === 'library') toast('Biblioteca em breve 📚');
    else if (action === 'trophies') openTrophies();
    else if (action === 'logout') logout();
  } catch (err) { console.warn('action error', err); }
});

$('#btn-play').addEventListener('click', () => launchGame(gameIndex));
$('#btn-trophies').addEventListener('click', openTrophies);

/* ================= LAUNCH ================= */
let launchTimer = null;
let launchTarget = null;

function launchGame(i) {
  const g = GAMES[i];
  if (!g) return;
  launchTarget = g;
  $('#launch-bg').style.background = `
    radial-gradient(circle at 40% 40%, ${g.c1}, transparent 60%),
    radial-gradient(circle at 70% 70%, ${g.c2}, transparent 60%)
  `;
  $('#launch-icon').textContent = g.emoji;
  $('#launch-title').textContent = g.title;
  $('#launch-fill').style.width = '0%';
  $('#launch-status').textContent = 'Verificando licença…';
  showScreen('screen-launch');
  beep(880, 0.1, 'triangle');
  clearInterval(launchTimer);
  let p = 0;
  const msgs = ['Verificando licença…','Carregando texturas…','Compilando shaders…','Sincronizando save…','Pronto!'];
  launchTimer = setInterval(() => {
    p += rnd(8, 20);
    if (p >= 100) {
      p = 100;
      clearInterval(launchTimer);
      $('#launch-fill').style.width = '100%';
      $('#launch-status').textContent = 'Pronto!';
      setTimeout(() => {
        if (g.playable !== false) startGameScreen();
        else backToMenu();
      }, 450);
    } else {
      $('#launch-fill').style.width = p + '%';
      $('#launch-status').textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 25))];
    }
  }, 220);
}

function backToMenu() {
  clearInterval(launchTimer);
  GameSession.reset();
  launchTarget = null;
  stopGameKeyHandler();
  showScreen('screen-menu');
  if (currentProfile) {
    refreshTrophyMarks();
    updateHero();
  }
  requestAnimationFrame(() => { updateCarousel(); requestAnimationFrame(updateCarousel); });
  beep(520, 0.1);
}

/* =========================================================
   GAME SESSION FRAMEWORK
   ========================================================= */
const GameSession = {
  timers: [], cleanups: [], raf: null, score: 0,
  reset() {
    this.timers.forEach(({ id, interval }) => interval ? clearInterval(id) : clearTimeout(id));
    this.timers = [];
    this.cleanups.forEach(fn => { try { fn(); } catch {} });
    this.cleanups = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.score = 0;
    const layer = $('#game-layer');
    if (layer) layer.innerHTML = '';
    const extra = $('#game-extra');
    if (extra) extra.innerHTML = '';
    const timeLabel = $('#game-time-label');
    if (timeLabel) timeLabel.textContent = 'Tempo';
    const scoreEl = $('#game-score');
    if (scoreEl) scoreEl.textContent = '0';
    const timeEl = $('#game-time');
    if (timeEl) timeEl.textContent = '0';
  },
  setTimeout(fn, ms) { const id = setTimeout(fn, ms); this.timers.push({ id, interval: false }); return id; },
  setInterval(fn, ms) { const id = setInterval(fn, ms); this.timers.push({ id, interval: true }); return id; },
  loop(fn) {
    const tick = (t) => {
      try { fn(t); } catch (err) { console.warn(err); }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  },
  setScore(n) { this.score = n; const el = $('#game-score'); if (el) el.textContent = n; },
  addScore(n) { this.setScore(this.score + n); },
  setStat(label, value) {
    const l = $('#game-time-label'); const v = $('#game-time');
    if (l) l.textContent = label; if (v) v.textContent = value;
  },
  setExtra(html) { const el = $('#game-extra'); if (el) el.innerHTML = html; },
  onCleanup(fn) { this.cleanups.push(fn); },
  end(win, message) {
    const finalScore = this.score;
    const game = launchTarget;
    this.reset();
    showGameOver(finalScore, win, message, game);
  },
};

/* ================= GAME HUD / INTRO / OVER ================= */
function startGameScreen() {
  GameSession.reset();
  const g = launchTarget;
  showScreen('screen-game');
  $('#intro-icon').textContent = g.emoji;
  $('#intro-title').textContent = g.title;
  $('#intro-desc').textContent = g.desc;
  $('#game-intro').classList.remove('hide');
  $('#game-over').classList.add('hide');
  beep(1040, 0.12, 'triangle');
}

function showGameOver(score, win, message, game) {
  $('#game-final-score').textContent = score;
  const rewards = [];
  if (currentProfile && game) {
    if (!currentProfile.trophies) currentProfile.trophies = {};
    if (!currentProfile.trophies[game.id]) currentProfile.trophies[game.id] = [];
    if (!currentProfile.bestScores) currentProfile.bestScores = {};
    if (game.trophies) {
      for (const t of game.trophies) {
        if (score >= t.score && !currentProfile.trophies[game.id].includes(t.id)) {
          currentProfile.trophies[game.id].push(t.id);
          rewards.push(`${TIERS[t.tier].icon} ${TIERS[t.tier].name}`);
        }
      }
    }
    currentProfile.bestScores[game.id] = Math.max(currentProfile.bestScores[game.id] || 0, score);
    const idx = profiles.findIndex(p => p.id === currentProfile.id);
    if (idx >= 0) profiles[idx] = currentProfile;
    saveProfiles();
  }
  $('#game-reward').textContent = rewards.length
    ? `🏆 Novo troféu: ${rewards.join(' · ')}`
    : (message || '');
  $('#game-over').classList.remove('hide');
  if (rewards.length) { beep(1200, 0.15, 'sine'); setTimeout(() => beep(1500, 0.2, 'sine'), 180); }
  else beep(400, 0.2, 'sine');
}

$('#btn-game-start').addEventListener('click', () => {
  const g = launchTarget;
  const engine = ENGINES[g?.id];
  if (engine) engine.start();
});
$('#btn-game-again').addEventListener('click', () => startGameScreen());
$('#btn-game-back').addEventListener('click', backToMenu);
$('#btn-game-exit').addEventListener('click', () => { GameSession.reset(); backToMenu(); });

/* =========================================================
   ENGINES — 9 JOGOS
   ========================================================= */
const ENGINES = {};

/* -------- utils -------- */
function layerEl() { return $('#game-layer'); }
function fieldRect() { return $('#game-playfield').getBoundingClientRect(); }
function addFloat(x, y, text, color) {
  const el = document.createElement('div');
  el.className = 'score-float';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  if (color) el.style.color = color;
  layerEl().appendChild(el);
  setTimeout(() => el.remove(), 800);
}

let gameKeyHandler = null;
function setGameKeyHandler(fn) {
  stopGameKeyHandler();
  gameKeyHandler = fn;
  document.addEventListener('keydown', gameKeyHandler);
}
function stopGameKeyHandler() {
  if (gameKeyHandler) {
    document.removeEventListener('keydown', gameKeyHandler);
    gameKeyHandler = null;
  }
}

/* =========================================================
   ENGINE 1: VORTEX REFLEX
   ========================================================= */
ENGINES.reflex = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setStat('Tempo', '30');
    GameSession.setScore(0);
    let time = 30;
    let running = true;
    GameSession.onCleanup(() => running = false);

    // spawn targets
    GameSession.setInterval(() => {
      if (!running) return;
      const layer = layerEl();
      if (!layer || layer.querySelectorAll('.game-target').length >= 5) return;
      const r = fieldRect();
      const size = rnd(48, 84);
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'game-target';
      t.style.width = size + 'px';
      t.style.height = size + 'px';
      t.style.left = rnd(20, r.width - size - 20) + 'px';
      t.style.top = rnd(20, r.height - size - 20) + 'px';
      let gone = false;
      const remove = (hit) => {
        if (gone) return;
        gone = true;
        t.classList.add(hit ? 'game-target-hit' : 'game-target-out');
        setTimeout(() => t.remove(), 350);
      };
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        if (gone || !running) return;
        GameSession.addScore(1);
        beep(900 + rnd(0, 400), 0.05, 'triangle');
        addFloat(t.offsetLeft, t.offsetTop, '+1');
        remove(true);
      });
      setTimeout(() => remove(false), rnd(1000, 1800));
      layer.appendChild(t);
    }, 420);

    // countdown
    GameSession.setInterval(() => {
      if (!running) return;
      time--;
      GameSession.setStat('Tempo', time + 's');
      if (time <= 5) beep(1200, 0.05, 'square');
      if (time <= 0) {
        running = false;
        setTimeout(() => GameSession.end(true, ''), 400);
      }
    }, 1000);
  }
};

/* =========================================================
   ENGINE 2: NEON DRIFT / STORM RIDERS (lane dodger)
   ========================================================= */
function makeLaneGame(cfg) {
  return {
    start() {
      GameSession.reset();
      $('#game-intro').classList.add('hide');
      GameSession.setScore(0);
      GameSession.setStat('Tempo', '30s');

      const r = fieldRect();
      const cols = 3;
      const laneW = r.width / cols;
      let playerCol = 1;
      let running = true;
      let time = 30;
      GameSession.onCleanup(() => running = false);

      const layer = layerEl();
      const track = document.createElement('div');
      track.className = 'race-track' + (cfg.storm ? ' storm' : '');
      layer.appendChild(track);
      for (let i = 1; i < cols; i++) {
        const line = document.createElement('div');
        line.className = 'race-lane';
        line.style.left = (i * laneW) + 'px';
        track.appendChild(line);
      }
      const player = document.createElement('div');
      player.className = 'race-player';
      player.textContent = cfg.playerEmoji;
      player.style.left = (playerCol * laneW + laneW / 2) + 'px';
      track.appendChild(player);

      const setCol = (c) => {
        playerCol = Math.max(0, Math.min(cols - 1, c));
        player.style.left = (playerCol * laneW + laneW / 2) + 'px';
      };

      const enemies = [];
      const spawn = () => {
        if (!running) return;
        const col = rndInt(0, cols - 1);
        const el = document.createElement('div');
        el.className = 'race-enemy';
        el.textContent = cfg.enemyEmoji;
        el.style.left = (col * laneW + laneW / 2) + 'px';
        el.style.top = '-60px';
        track.appendChild(el);
        enemies.push({ el, x: col * laneW + laneW / 2, y: -60, col });
      };
      GameSession.setInterval(spawn, cfg.spawnMs);
      GameSession.setInterval(() => { if (running) { GameSession.addScore(2); } }, 1000);

      GameSession.loop(() => {
        if (!running) return;
        const maxY = r.height;
        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.y += cfg.speed;
          e.el.style.top = e.y + 'px';
          if (e.y > maxY - 90 && e.col === playerCol && e.y < maxY - 20) {
            running = false;
            setTimeout(() => GameSession.end(false, 'Você bateu! 💥'), 300);
            return;
          }
          if (e.y > maxY + 60) { e.el.remove(); enemies.splice(i, 1); }
        }
      });

      setGameKeyHandler((e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setCol(playerCol - 1); beep(600, 0.04); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setCol(playerCol + 1); beep(600, 0.04); }
      });
      GameSession.onCleanup(stopGameKeyHandler);

      GameSession.setInterval(() => {
        if (!running) return;
        time--;
        GameSession.setStat('Tempo', time + 's');
        if (time <= 0) { running = false; setTimeout(() => GameSession.end(true, 'Sobreviveu! 🎉'), 300); }
      }, 1000);
    }
  };
}

ENGINES.drift = makeLaneGame({ playerEmoji:'🏎️', enemyEmoji:'🚗', spawnMs:620, speed:5.5, storm:false });
ENGINES.storm = makeLaneGame({ playerEmoji:'🏂', enemyEmoji:'🌲', spawnMs:700, speed:6.5, storm:true });

/* =========================================================
   ENGINE 3: VOID HUNTER (click aliens before bottom)
   ========================================================= */
ENGINES.hunter = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Tempo', '30s');
    GameSession.setExtra(`Vidas: <strong id="lives">3</strong>`);
    let lives = 3;
    let running = true;
    let time = 30;
    GameSession.onCleanup(() => running = false);

    const r = fieldRect();
    const aliens = [];
    const layer = layerEl();

    const updateLives = () => {
      const el = $('#lives');
      if (el) el.textContent = lives;
    };

    const spawn = () => {
      if (!running) return;
      const el = document.createElement('div');
      el.className = 'alien';
      el.textContent = ['👾','🛸','👽'][rndInt(0, 2)];
      const x = rnd(20, r.width - 60);
      el.style.left = x + 'px';
      el.style.top = '-40px';
      layer.appendChild(el);
      aliens.push({ el, x, y: -40, dead: false });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (a.dead || !running) return;
        a.dead = true;
        el.remove();
        GameSession.addScore(2);
        beep(1100, 0.06, 'triangle');
        addFloat(x, parseFloat(el.style.top), '+2');
        const idx = aliens.indexOf(a);
        if (idx >= 0) aliens.splice(idx, 1);
      });
    };
    // we need a reference outside — fix closure
    let a;
    GameSession.setInterval(() => {
      if (!running) return;
      const el = document.createElement('div');
      el.className = 'alien';
      el.textContent = ['👾','🛸','👽'][rndInt(0, 2)];
      const x = rnd(20, r.width - 60);
      el.style.left = x + 'px';
      el.style.top = '-40px';
      layer.appendChild(el);
      const obj = { el, x, y: -40, dead: false };
      aliens.push(obj);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (obj.dead || !running) return;
        obj.dead = true;
        el.remove();
        GameSession.addScore(2);
        beep(1100, 0.06, 'triangle');
        addFloat(x, obj.y, '+2');
        const idx = aliens.indexOf(obj);
        if (idx >= 0) aliens.splice(idx, 1);
      });
    }, 900);

    GameSession.loop(() => {
      if (!running) return;
      for (let i = aliens.length - 1; i >= 0; i--) {
        const e = aliens[i];
        if (e.dead) continue;
        e.y += 1.4;
        e.el.style.top = e.y + 'px';
        if (e.y > r.height - 30) {
          e.dead = true;
          e.el.remove();
          aliens.splice(i, 1);
          lives--;
          updateLives();
          beep(300, 0.15, 'sawtooth');
          if (lives <= 0) { running = false; setTimeout(() => GameSession.end(false, 'Você perdeu todas as vidas! 💀'), 300); return; }
        }
      }
    });

    GameSession.setInterval(() => {
      if (!running) return;
      time--;
      GameSession.setStat('Tempo', time + 's');
      if (time <= 0) { running = false; setTimeout(() => GameSession.end(true, ''), 300); }
    }, 1000);
  }
};

/* =========================================================
   ENGINE 4: PIXEL KINGDOMS (turn-based)
   ========================================================= */
ENGINES.kingdoms = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Turno', '0');

    const layer = layerEl();
    layer.innerHTML = `
      <div class="kingdom-wrap">
        <div class="kingdom-battle">
          <div class="kingdom-side">
            <div class="kingdom-name">Você</div>
            <div class="kingdom-emoji">🧙</div>
            <div class="kingdom-hp"><div class="kingdom-hp-fill" id="hp-player" style="width:100%"></div></div>
            <div class="kingdom-name" style="margin-top:8px"><span id="hp-player-num">100</span> / 100 HP</div>
          </div>
          <div class="kingdom-side enemy">
            <div class="kingdom-name">Lorde das Sombras</div>
            <div class="kingdom-emoji">😈</div>
            <div class="kingdom-hp"><div class="kingdom-hp-fill" id="hp-enemy" style="width:100%"></div></div>
            <div class="kingdom-name" style="margin-top:8px"><span id="hp-enemy-num">100</span> / 100 HP</div>
          </div>
        </div>
        <div class="kingdom-log" id="k-log">Sua vez. Escolha uma ação!</div>
        <div class="kingdom-actions">
          <button type="button" class="kingdom-btn attack" data-k="attack">⚔️ Atacar</button>
          <button type="button" class="kingdom-btn magic" data-k="magic">✨ Magia</button>
          <button type="button" class="kingdom-btn heal" data-k="heal">💚 Curar</button>
        </div>
      </div>
    `;

    const battle = { playerHp: 100, enemyHp: 100, turn: 0, active: true };
    GameSession.onCleanup(() => battle.active = false);

    const updateHUD = () => {
      $('#hp-player').style.width = battle.playerHp + '%';
      $('#hp-enemy').style.width = battle.enemyHp + '%';
      $('#hp-player-num').textContent = battle.playerHp;
      $('#hp-enemy-num').textContent = battle.enemyHp;
      GameSession.setScore(100 - battle.enemyHp);
      GameSession.setStat('Turno', battle.turn);
    };

    const log = (msg) => { const el = $('#k-log'); if (el) el.textContent = msg; };

    const action = (kind) => {
      if (!battle.active) return;
      const btns = $$('.kingdom-btn');
      btns.forEach(b => b.disabled = true);
      battle.turn++;

      let dmg = 0, heal = 0, msg = '';
      if (kind === 'attack') {
        dmg = rndInt(10, 15);
        msg = `⚔️ Você causou ${dmg} de dano!`;
      } else if (kind === 'magic') {
        if (Math.random() < 0.4) msg = `✨ Sua magia falhou!`;
        else { dmg = rndInt(20, 30); msg = `✨ Magia! ${dmg} de dano!`; }
      } else if (kind === 'heal') {
        heal = rndInt(15, 20);
        msg = `💚 Você recuperou ${heal} HP!`;
      }
      battle.enemyHp = Math.max(0, battle.enemyHp - dmg);
      battle.playerHp = Math.min(100, battle.playerHp + heal);
      updateHUD();
      log(msg);

      if (battle.enemyHp <= 0) {
        battle.active = false;
        setTimeout(() => GameSession.end(true, 'Vitória! 🎉'), 800);
        return;
      }

      GameSession.setTimeout(() => {
        if (!battle.active) return;
        const edmg = rndInt(8, 15);
        battle.playerHp = Math.max(0, battle.playerHp - edmg);
        updateHUD();
        log(msg + ` | 😈 causou ${edmg} de dano.`);
        if (battle.playerHp <= 0) {
          battle.active = false;
          setTimeout(() => GameSession.end(false, 'Derrota... 💀'), 600);
          return;
        }
        btns.forEach(b => b.disabled = false);
      }, 850);
    };

    layer.addEventListener('click', (e) => {
      const btn = e.target.closest('.kingdom-btn');
      if (!btn) return;
      action(btn.dataset.k);
    });
    updateHUD();
  }
};

/* =========================================================
   ENGINE 5: ABYSS DIVE (move + collect)
   ========================================================= */
ENGINES.abyss = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Tempo', '30s');

    const r = fieldRect();
    const layer = layerEl();
    const bg = document.createElement('div');
    bg.className = 'abyss-bg';
    layer.appendChild(bg);

    const diver = document.createElement('div');
    diver.className = 'abyss-diver';
    diver.textContent = '🤿';
    let px = r.width / 2, py = r.height / 2;
    diver.style.left = px + 'px';
    diver.style.top = py + 'px';
    layer.appendChild(diver);

    const pearls = [], jellies = [];
    let running = true, time = 30;
    GameSession.onCleanup(() => running = false);

    const spawn = (arr, emoji, cls, count) => {
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = cls;
        el.textContent = emoji;
        const x = rnd(30, r.width - 30), y = rnd(30, r.height - 30);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        layer.appendChild(el);
        arr.push({ el, x, y, dead: false });
      }
    };
    spawn(pearls, '💎', 'abyss-pearl', 5);
    spawn(jellies, '🪼', 'abyss-jelly', 3);

    GameSession.setInterval(() => {
      if (!running) return;
      // respawn
      if (pearls.length < 5) {
        const el = document.createElement('div');
        el.className = 'abyss-pearl';
        el.textContent = '💎';
        const x = rnd(30, r.width - 30), y = rnd(30, r.height - 30);
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        pearls.push({ el, x, y, dead: false });
      }
      if (jellies.length < 3 && Math.random() < 0.4) {
        const el = document.createElement('div');
        el.className = 'abyss-jelly';
        el.textContent = '🪼';
        const x = rnd(30, r.width - 30), y = rnd(30, r.height - 30);
        el.style.left = x + 'px'; el.style.top = y + 'px';
        layer.appendChild(el);
        jellies.push({ el, x, y, dead: false });
      }
    }, 700);

    GameSession.loop(() => {
      if (!running) return;
      // pearl collision
      for (let i = pearls.length - 1; i >= 0; i--) {
        const p = pearls[i];
        if (p.dead) continue;
        if (Math.hypot(p.x - px, p.y - py) < 32) {
          p.dead = true;
          p.el.remove();
          pearls.splice(i, 1);
          GameSession.addScore(2);
          beep(1200, 0.06, 'sine');
          addFloat(px, py, '+2');
        }
      }
      // jelly collision
      for (const j of jellies) {
        if (j.dead) continue;
        if (Math.hypot(j.x - px, j.y - py) < 32) {
          j.dead = true;
          j.el.remove();
          GameSession.setScore(Math.max(0, GameSession.score - 2));
          beep(220, 0.2, 'sawtooth');
          addFloat(px, py, '-2', '#f87171');
          // respawn soon
          GameSession.setTimeout(() => {
            if (!running) return;
            const el = document.createElement('div');
            el.className = 'abyss-jelly';
            el.textContent = '🪼';
            const x = rnd(30, r.width - 30), y = rnd(30, r.height - 30);
            el.style.left = x + 'px'; el.style.top = y + 'px';
            layer.appendChild(el);
            jellies.push({ el, x, y, dead: false });
          }, 1000);
        }
      }
    });

    setGameKeyHandler((e) => {
      if (!running) return;
      const step = 18;
      let moved = false;
      if (e.key === 'ArrowLeft') { px = Math.max(20, px - step); moved = true; }
      if (e.key === 'ArrowRight') { px = Math.min(r.width - 20, px + step); moved = true; }
      if (e.key === 'ArrowUp') { py = Math.max(20, py - step); moved = true; }
      if (e.key === 'ArrowDown') { py = Math.min(r.height - 20, py + step); moved = true; }
      if (moved) {
        e.preventDefault();
        diver.style.left = px + 'px';
        diver.style.top = py + 'px';
      }
    });
    GameSession.onCleanup(stopGameKeyHandler);

    GameSession.setInterval(() => {
      if (!running) return;
      time--;
      GameSession.setStat('Tempo', time + 's');
      if (time <= 0) { running = false; setTimeout(() => GameSession.end(true, ''), 300); }
    }, 1000);
  }
};

/* =========================================================
   ENGINE 6: GHOST PROTOCOL (maze grid)
   ========================================================= */
ENGINES.ghost = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Nível', '1');

    const layer = layerEl();
    const wrap = document.createElement('div');
    wrap.className = 'ghost-wrap';
    const gridEl = document.createElement('div');
    gridEl.className = 'ghost-grid';
    wrap.appendChild(gridEl);
    layer.appendChild(wrap);

    const SIZE = 5;
    let level = 1;
    let running = true;
    let playerPos = { r: 0, c: 0 };
    let goal = { r: SIZE - 1, c: SIZE - 1 };
    let guards = [];
    let busy = false;

    GameSession.onCleanup(() => running = false);

    const isGuard = (r, c) => guards.some(g => g.r === r && g.c === c);
    const isWall = (r, c) => {
      // simple walls: middle column except passages
      if (level === 1) return (r === 2 && c === 2);
      if (level === 2) return (r === 1 && c === 2) || (r === 3 && c === 2);
      if (level === 3) return (r === 2 && c === 1) || (r === 2 && c === 3);
      return false;
    };

    const render = () => {
      gridEl.style.gridTemplateColumns = `repeat(${SIZE},1fr)`;
      gridEl.innerHTML = '';
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement('div');
          cell.className = 'ghost-cell';
          if (isWall(r, c)) cell.classList.add('wall');
          if (r === goal.r && c === goal.c) { cell.classList.add('goal'); cell.textContent = '🚪'; }
          else if (r === playerPos.r && c === playerPos.c) cell.textContent = '🥷';
          else if (isGuard(r, c)) cell.textContent = '👁️';
          gridEl.appendChild(cell);
        }
      }
    };

    const resetLevel = () => {
      playerPos = { r: 0, c: 0 };
      goal = { r: SIZE - 1, c: SIZE - 1 };
      guards = [];
      // place 1-2 guards depending on level
      const count = Math.min(3, level);
      for (let i = 0; i < count; i++) {
        let r, c, tries = 0;
        do {
          r = rndInt(1, SIZE - 1);
          c = rndInt(1, SIZE - 1);
          tries++;
        } while ((isWall(r, c) || (r === 0 && c === 0) || (r === goal.r && c === goal.c)) && tries < 20);
        guards.push({ r, c });
      }
      GameSession.setStat('Nível', level);
      render();
    };

    const moveGuard = (g) => {
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      const [dr, dc] = dirs[rndInt(0, 3)];
      const nr = g.r + dr, nc = g.c + dc;
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) return;
      if (isWall(nr, nc)) return;
      // no two guards in same cell
      if (guards.some(x => x !== g && x.r === nr && x.c === nc)) return;
      g.r = nr; g.c = nc;
    };

    const tryMove = (dr, dc) => {
      if (busy || !running) return;
      const nr = playerPos.r + dr, nc = playerPos.c + dc;
      if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) return;
      if (isWall(nr, nc)) return;
      playerPos = { r: nr, c: nc };
      beep(700, 0.03);

      if (playerPos.r === goal.r && playerPos.c === goal.c) {
        GameSession.addScore(10);
        beep(1200, 0.1, 'triangle');
        if (level >= 3) {
          running = false;
          render();
          setTimeout(() => GameSession.end(true, 'Você escapou! 🎉'), 300);
          return;
        }
        level++;
        setTimeout(() => resetLevel(), 500);
        render();
        return;
      }

      // guards move after player
      busy = true;
      GameSession.setTimeout(() => {
        guards.forEach(moveGuard);
        if (isGuard(playerPos.r, playerPos.c)) {
          running = false;
          render();
          setTimeout(() => GameSession.end(false, 'Você foi pego! 👁️'), 400);
          return;
        }
        render();
        busy = false;
      }, 300);
    };

    setGameKeyHandler((e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); tryMove(0, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); tryMove(0, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); tryMove(-1, 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); tryMove(1, 0); }
    });
    GameSession.onCleanup(stopGameKeyHandler);

    resetLevel();
  }
};

/* =========================================================
   ENGINE 7: ORBIT WARS (defend base)
   ========================================================= */
ENGINES.orbit = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Tempo', '30s');
    GameSession.setExtra(`Base: <strong id="base-hp">5</strong>❤️`);

    const r = fieldRect();
    const layer = layerEl();
    const base = document.createElement('div');
    base.className = 'orbit-base';
    base.textContent = '🛡️';
    layer.appendChild(base);

    let baseHp = 5, running = true, time = 30;
    GameSession.onCleanup(() => running = false);

    const enemies = [];
    const updateBase = () => { const el = $('#base-hp'); if (el) el.textContent = baseHp; };

    GameSession.setInterval(() => {
      if (!running) return;
      const el = document.createElement('div');
      el.className = 'alien' + (Math.random() < 0.25 ? ' tank' : '');
      el.textContent = ['🛸','👾','🚀'][rndInt(0, 2)];
      const x = rnd(30, r.width - 30);
      el.style.left = x + 'px';
      el.style.top = '-40px';
      layer.appendChild(el);
      const obj = { el, x, y: -40, hp: el.classList.contains('tank') ? 2 : 1, dead: false };
      enemies.push(obj);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (obj.dead || !running) return;
        obj.hp--;
        if (obj.hp <= 0) {
          obj.dead = true;
          el.remove();
          GameSession.addScore(2);
          beep(1100, 0.06, 'triangle');
          addFloat(x, obj.y, '+2');
          const idx = enemies.indexOf(obj);
          if (idx >= 0) enemies.splice(idx, 1);
        } else {
          el.style.transform = 'scale(0.85)';
          setTimeout(() => { if (!obj.dead) el.style.transform = ''; }, 100);
          beep(600, 0.05);
        }
      });
    }, 850);

    GameSession.loop(() => {
      if (!running) return;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.dead) continue;
        e.y += 1.8;
        e.el.style.top = e.y + 'px';
        if (e.y > r.height - 80) {
          e.dead = true;
          e.el.remove();
          enemies.splice(i, 1);
          baseHp--;
          updateBase();
          beep(280, 0.2, 'sawtooth');
          if (baseHp <= 0) { running = false; setTimeout(() => GameSession.end(false, 'Base destruída! 💥'), 300); return; }
        }
      }
    });

    GameSession.setInterval(() => {
      if (!running) return;
      time--;
      GameSession.setStat('Tempo', time + 's');
      if (time <= 0) { running = false; setTimeout(() => GameSession.end(true, ''), 300); }
    }, 1000);
  }
};

/* =========================================================
   ENGINE 8: RUNE LEGACY (memory)
   ========================================================= */
ENGINES.rune = {
  start() {
    GameSession.reset();
    $('#game-intro').classList.add('hide');
    GameSession.setScore(0);
    GameSession.setStat('Tempo', '30s');

    const layer = layerEl();
    const wrap = document.createElement('div');
    wrap.className = 'rune-wrap';
    const grid = document.createElement('div');
    grid.className = 'rune-grid';
    wrap.appendChild(grid);
    layer.appendChild(wrap);

    const runes = ['🔮','⚗️','🗝️','📜'];
    const deck = [...runes, ...runes].sort(() => Math.random() - 0.5);
    let firstCard = null, secondCard = null, lock = false;
    let matches = 0, running = true, time = 30;
    GameSession.onCleanup(() => running = false);

    deck.forEach((r, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'rune-card';
      card.textContent = r;
      card.dataset.rune = r;
      card.addEventListener('click', () => {
        if (!running || lock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped');
        beep(800, 0.05, 'triangle');

        if (!firstCard) { firstCard = card; return; }
        secondCard = card;
        lock = true;
        if (firstCard.dataset.rune === secondCard.dataset.rune) {
          firstCard.classList.add('matched');
          secondCard.classList.add('matched');
          GameSession.addScore(5);
          matches++;
          beep(1300, 0.1, 'sine');
          firstCard = null; secondCard = null; lock = false;
          if (matches === runes.length) {
            running = false;
            setTimeout(() => GameSession.end(true, 'Todos os pares encontrados! 🎉'), 400);
          }
        } else {
          GameSession.setTimeout(() => {
            firstCard.classList.remove('flipped');
            secondCard.classList.remove('flipped');
            firstCard = null; secondCard = null; lock = false;
            beep(400, 0.1);
          }, 700);
        }
      });
      grid.appendChild(card);
    });

    GameSession.setInterval(() => {
      if (!running) return;
      time--;
      GameSession.setStat('Tempo', time + 's');
      if (time <= 0) { running = false; setTimeout(() => GameSession.end(true, ''), 300); }
    }, 1000);
  }
};

/* =========================================================
   SETTINGS
   ========================================================= */
function openSettings() {
  showScreen('screen-settings');
  applyTheme();
  beep(620);
}
$('#btn-settings-back').addEventListener('click', () => { beep(520); backToMenu(); });

$('#theme-switch').addEventListener('click', e => {
  const b = e.target.closest('[data-theme]');
  if (!b) return;
  settings.theme = b.dataset.theme;
  saveSettings();
  applyTheme();
  beep(760, 0.08, 'triangle');
  toast(settings.theme === 'dark' ? 'Tema escuro ativado 🌙' : 'Tema claro ativado ☀️');
});

$('#sound-toggle').addEventListener('click', () => {
  settings.sound = !settings.sound;
  saveSettings();
  applyTheme();
  if (settings.sound) beep(880, 0.1, 'triangle');
  toast(settings.sound ? 'Som ativado 🔊' : 'Som desativado 🔇');
});

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Apagar TODOS os perfis, troféus e recordes? Isso não pode ser desfeito.')) return;
  profiles = []; currentProfile = null; profileIndex = 0;
  saveProfiles();
  toast('Todos os dados foram apagados.');
  beep(240, 0.2, 'sawtooth');
  setTimeout(() => { showScreen('screen-profiles'); renderProfiles(); }, 300);
});

/* =========================================================
   TROPHIES
   ========================================================= */
function openTrophies() {
  if (!currentProfile) return;
  $('#trophies-owner').textContent = currentProfile.name;
  renderTrophies();
  showScreen('screen-trophies');
  beep(620);
}
$('#btn-trophies-back').addEventListener('click', () => { beep(520); backToMenu(); });

function renderTrophies() {
  const body = $('#trophies-body');
  body.innerHTML = '';
  GAMES.forEach(g => {
    if (!g.trophies || !g.trophies.length) return;
    const earned = currentProfile.trophies?.[g.id] || [];
    const wrap = document.createElement('div');
    wrap.className = 'trophy-game';
    wrap.innerHTML = `
      <div class="trophy-game-header">
        <div class="trophy-game-icon" style="background:linear-gradient(145deg,${g.c1},${g.c2})">${g.emoji}</div>
        <div>
          <div class="trophy-game-name">${esc(g.title)}</div>
          <div class="trophy-game-progress">${earned.length}/${g.trophies.length} troféus conquistados</div>
        </div>
      </div>
      <div class="trophy-list">
        ${g.trophies.map(t => `
          <div class="trophy-item ${t.tier} ${earned.includes(t.id) ? 'earned' : ''}">
            <span class="trophy-icon">${TIERS[t.tier].icon}</span>
            <span>${TIERS[t.tier].name} <small style="opacity:.7">· ${t.req}</small></span>
          </div>
        `).join('')}
      </div>
    `;
    body.appendChild(wrap);
  });
}

/* =========================================================
   POWER
   ========================================================= */
$('#btn-power-cancel').addEventListener('click', () => { $('#modal-power').classList.remove('open'); beep(400); });
$('#btn-power-confirm').addEventListener('click', () => {
  $('#modal-power').classList.remove('open');
  beep(300, 0.3, 'sawtooth');
  document.body.style.transition = 'opacity .6s';
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.opacity = '1';
    GameSession.reset();
    logout();
    showScreen('screen-boot');
    startBoot();
  }, 700);
});

/* =========================================================
   BOOT
   ========================================================= */
let bootTimer = null;
function startBoot() {
  const fill = $('.boot-progress-fill');
  if (fill) { fill.style.width = '0%'; requestAnimationFrame(() => { fill.style.width = '100%'; }); }
  clearTimeout(bootTimer);
  bootTimer = setTimeout(finishBoot, 4000);
}
function finishBoot() {
  clearTimeout(bootTimer);
  if (currentScreen !== 'screen-boot') return;
  startupChime();
  renderProfiles();
  showScreen('screen-profiles');
}
$('#screen-boot').addEventListener('click', () => { initAudio(); finishBoot(); });

/* =========================================================
   TECLADO GLOBAL
   ========================================================= */
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if ($('#modal-create').classList.contains('open')) {
    if (k === 'Escape') closeModal();
    if (k === 'Enter' && document.activeElement === $('#input-name')) { e.preventDefault(); $('#btn-confirm').click(); }
    return;
  }
  if ($('#modal-power').classList.contains('open')) {
    if (k === 'Escape') $('#btn-power-cancel').click();
    return;
  }
  switch (currentScreen) {
    case 'screen-boot':
      if (k === 'Enter' || k === ' ') finishBoot();
      break;
    case 'screen-profiles': {
      const total = profiles.length + 1;
      if (k === 'ArrowRight') { e.preventDefault(); profileIndex = (profileIndex + 1) % total; beep(560); renderProfiles(); }
      if (k === 'ArrowLeft')  { e.preventDefault(); profileIndex = (profileIndex - 1 + total) % total; beep(560); renderProfiles(); }
      if (k === 'Enter') { profileIndex === profiles.length ? openModal() : loginAs(profileIndex); }
      break;
    }
    case 'screen-menu':
      if (k === 'ArrowRight') { e.preventDefault(); selectGame(gameIndex + 1); beep(560); }
      if (k === 'ArrowLeft')  { e.preventDefault(); selectGame(gameIndex - 1); beep(560); }
      if (k === 'Enter')      { e.preventDefault(); launchGame(gameIndex); }
      if (k === 'Escape')     logout();
      break;
    case 'screen-settings':
    case 'screen-trophies':
      if (k === 'Escape') { e.preventDefault(); backToMenu(); }
      break;
    case 'screen-game':
      if (k === 'Escape') { GameSession.reset(); stopGameKeyHandler(); backToMenu(); }
      break;
    case 'screen-launch':
      if (k === 'Escape') backToMenu();
      break;
  }
});

/* =========================================================
   RELÓGIO / TOAST
   ========================================================= */
function tickClock() {
  const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $$('[data-clock]').forEach(el => el.textContent = t);
}
setInterval(tickClock, 1000);
tickClock();

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* =========================================================
   INIT
   ========================================================= */
applyTheme();
startBoot();
