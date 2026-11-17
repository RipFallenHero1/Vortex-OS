/* =========================================================
   VORTEX 4 — vortexOS 4.02 (demo de console)
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
));

/* ================= SETTINGS ================= */
let settings = loadSettings();
function loadSettings() {
  try { return { theme: 'dark', sound: true, ...(JSON.parse(localStorage.getItem('vortex4.settings')) || {}) }; }
  catch { return { theme: 'dark', sound: true }; }
}
function saveSettings() {
  localStorage.setItem('vortex4.settings', JSON.stringify(settings));
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  $$('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === settings.theme));
  const st = $('#sound-toggle');
  if (st) {
    st.textContent = settings.sound ? 'Ativado' : 'Desativado';
    st.classList.toggle('off', !settings.sound);
  }
}

/* ================= ÁUDIO ================= */
let actx = null;
function initAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(freq = 520, dur = 0.07, type = 'sine', vol = 0.035) {
  if (!settings.sound || !actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
  o.connect(g).connect(actx.destination);
  o.start();
  o.stop(actx.currentTime + dur);
}
function startupChime() {
  if (!settings.sound) return;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    setTimeout(() => beep(f, 0.5, 'sine', 0.05), i * 180);
  });
}
window.addEventListener('pointerdown', initAudio, { once: true });

/* ================= TELAS ================= */
let currentScreen = 'screen-boot';
function showScreen(id) {
  if (currentScreen === 'screen-game' && id !== 'screen-game') stopGame(true);
  if (currentScreen === 'screen-launch' && id !== 'screen-launch') clearInterval(launchTimer);

  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  currentScreen = id;

  if (id === 'screen-menu') requestAnimationFrame(updateCarousel);
}

/* ================= DADOS ================= */
const AVATARS = ['🎮','😎','👾','🐉','🦊','🤖','🐺','🦄','🔥','⭐','🌙','🍕'];
const COLORS = [
  ['#a855f7','#6d28d9'],
  ['#ec4899','#7c3aed'],
  ['#f97316','#dc2626'],
  ['#06b6d4','#3b82f6'],
  ['#10b981','#0891b2'],
  ['#f43f5e','#a21caf'],
];

const TROPHY_TIERS = {
  bronze: { name: 'Bronze', icon: '🥉' },
  silver: { name: 'Prata',  icon: '🥈' },
  gold:   { name: 'Ouro',   icon: '🥇' },
};

const GAMES = [
  {
    id: 'reflex', title: 'Vortex Reflex', genre: 'Arcade',
    emoji: '⚡', c1: '#a855f7', c2: '#ec4899',
    desc: 'Teste seus reflexos clicando nos alvos antes que desapareçam. Trinta segundos para fazer a maior pontuação!',
    playable: true,
    trophies: [
      { id: 'bronze', tier: 'bronze', req: '10 pts', score: 10 },
      { id: 'silver', tier: 'silver', req: '20 pts', score: 20 },
      { id: 'gold',   tier: 'gold',   req: '30 pts', score: 30 },
    ],
  },
  { id:'neon',    title:'Neon Drift',     genre:'Corrida',    emoji:'🏎️', c1:'#06b6d4', c2:'#3b82f6', desc:'Corra por uma metrópole cyberpunk em altíssima velocidade. Reflexos, música alta e derrapagens impossíveis.', playable:false },
  { id:'void',    title:'Void Hunter',    genre:'Ação',       emoji:'🚀', c1:'#ec4899', c2:'#7c3aed', desc:'Caça recompensas em setores abandonados do espaço. Cada nave inimiga esconde um segredo do Vazio.', playable:false },
  { id:'pixel',   title:'Pixel Kingdoms', genre:'RPG',        emoji:'⚔️', c1:'#f59e0b', c2:'#dc2626', desc:'Reconstrua um reino em 8 bits, recrute heróis e derrote o Lorde das Sombras em turnos clássicos.', playable:false },
  { id:'abyss',   title:'Abyss Dive',     genre:'Aventura',   emoji:'🌊', c1:'#10b981', c2:'#0891b2', desc:'Mergulhe em fossas oceânicas, gerencie oxigênio e descubra ruínas de uma civilização submersa.', playable:false },
  { id:'ghost',   title:'Ghost Protocol', genre:'Stealth',    emoji:'👻', c1:'#94a3b8', c2:'#4c1d95', desc:'Você é o fantasma que ninguém vê. Hackeie, infiltre e desapareça antes do alarme tocar.', playable:false },
  { id:'storm',   title:'Storm Riders',   genre:'Esporte',    emoji:'🏂', c1:'#f97316', c2:'#dc2626', desc:'Desça montanhas em tempestades absurdas. Truques impossíveis, física duvidosa e muita adrenalina.', playable:false },
  { id:'orbit',   title:'Orbit Wars',     genre:'Estratégia', emoji:'🛸', c1:'#7cf5ff', c2:'#2563eb', desc:'Comande frotas orbitais, negocie com colônias e domine o sistema em batalhas por turnos.', playable:false },
  { id:'rune',    title:'Rune Legacy',    genre:'RPG',        emoji:'🔮', c1:'#c084fc', c2:'#6d28d9', desc:'Desvende runas ancestrais, combine magias e escreva sua própria lenda num mundo aberto gigantesco.', playable:false },
];

/* ================= PERFIS ================= */
let profiles = loadProfiles();
let profileIndex = 0;
let currentProfile = null;

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('vortex4.profiles')) || []; }
  catch { return []; }
}
function saveProfiles() {
  localStorage.setItem('vortex4.profiles', JSON.stringify(profiles));
}
function trophiesCount(p) {
  if (!p.trophies) return 0;
  return Object.values(p.trophies).reduce((n, arr) => n + arr.length, 0);
}

function renderProfiles() {
  const row = $('#profiles-row');
  row.innerHTML = '';

  profiles.forEach((p, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'profile-card' + (i === profileIndex ? ' selected' : '');
    const count = trophiesCount(p);
    card.innerHTML = `
      <div class="profile-avatar" style="background:linear-gradient(145deg, ${p.color[0]}, ${p.color[1]})">${p.avatar}</div>
      <span class="profile-name">${esc(p.name)}</span>
      <span class="profile-trophies">${count > 0 ? '🏆 ' + count : ''}</span>
      <button class="profile-del" title="Excluir perfil">✕</button>
    `;
    card.addEventListener('click', () => {
      profileIndex = i; beep(620); renderProfiles();
    });
    card.addEventListener('dblclick', () => loginAs(i));
    card.querySelector('.profile-del').addEventListener('click', e => {
      e.stopPropagation();
      profiles.splice(i, 1);
      saveProfiles();
      profileIndex = Math.max(0, Math.min(profileIndex, profiles.length));
      beep(240, 0.13, 'sawtooth');
      renderProfiles();
    });
    row.appendChild(card);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'profile-card' + (profileIndex === profiles.length ? ' selected' : '');
  add.innerHTML = `
    <div class="profile-avatar add-avatar">+</div>
    <span class="profile-name">Novo Perfil</span>
    <span class="profile-trophies"></span>
  `;
  add.addEventListener('click', () => {
    profileIndex = profiles.length;
    renderProfiles();
    openModal();
  });
  row.appendChild(add);
}

function loginAs(i) {
  const p = profiles[i];
  if (!p) return;
  currentProfile = p;

  $('#user-name').textContent = p.name;
  const av = $('#user-avatar');
  av.textContent = p.avatar;
  av.style.background = `linear-gradient(145deg, ${p.color[0]}, ${p.color[1]})`;

  showScreen('screen-menu');
  gameIndex = 0;
  renderCarousel();
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
let newAvatar = AVATARS[0];
let newColor = COLORS[0];

function openModal() {
  if (profiles.length >= 8) { toast('Limite de 8 perfis 😅'); return; }
  newAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  $('#input-name').value = '';
  buildPickers();
  $('#modal-create').classList.add('open');
  setTimeout(() => $('#input-name').focus(), 130);
  beep(700, 0.08, 'triangle');
}
function closeModal() { $('#modal-create').classList.remove('open'); }
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
    b.style.background = `linear-gradient(145deg, ${c[0]}, ${c[1]})`;
    b.onclick = () => { newColor = c; beep(760); buildPickers(); };
    pc.appendChild(b);
  });
}
$('#btn-cancel').addEventListener('click', closeModal);
$('#modal-create').addEventListener('click', e => {
  if (e.target.id === 'modal-create') closeModal();
});
$('#btn-confirm').addEventListener('click', () => {
  if (profiles.length >= 8) { toast('Limite de 8 perfis 😅'); return; }
  const name = ($('#input-name').value || '').trim() || 'Jogador' + (profiles.length + 1);
  profiles.push({ id: Date.now(), name, avatar: newAvatar, color: newColor, trophies: {}, highScore: 0 });
  saveProfiles();
  closeModal();
  beep(900, 0.12, 'triangle');
  loginAs(profiles.length - 1);
});

/* ================= MENU / CARROSSEL ================= */
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
      if (gameIndex === i) launchGame(i);
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
  $('#hero-genre').textContent = g.genre;
  $('#hero-title').textContent = g.title;
  $('#hero-desc').textContent = g.desc;

  const bg = $('#home-bg');
  bg.style.background = `
    radial-gradient(circle at 75% 30%, ${g.c1}, transparent 55%),
    radial-gradient(circle at 20% 75%, ${g.c2}, transparent 55%)
  `;

  const meta = $('#hero-meta');
  const earned = currentProfile?.trophies?.[g.id]?.length || 0;
  const totalTrophies = g.trophies?.length || 0;
  const highScore = currentProfile?.highScore || 0;

  const items = [];
  if (totalTrophies > 0) items.push(`🏆 ${earned}/${totalTrophies} troféus`);
  if (g.playable) items.push(`⭐ Recorde: ${highScore}`);
  if (!g.playable) items.push('⏳ Em breve');

  meta.innerHTML = items.map(i => `<span>${i}</span>`).join('');
}

function updateCarousel() {
  const wrap = $('#home-carousel');
  const track = $('#carousel-track');
  if (!wrap || !track || !track.children.length) return;
  const cardW = track.children[0].offsetWidth;
  const gap = 20;
  const step = cardW + gap;
  const offset = (wrap.clientWidth - cardW) / 2 - gameIndex * step;
  track.style.transform = `translateX(${offset}px)`;
}
window.addEventListener('resize', () => {
  if (currentScreen === 'screen-menu') updateCarousel();
});

/* ================= BOTÕES HOME ================= */
$('#btn-play').addEventListener('click', () => launchGame(gameIndex));
$('#btn-trophies').addEventListener('click', () => openTrophies());
$('.home-topbar').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  beep(620);
  if (a === 'settings') openSettings();
  if (a === 'notifications') toast('Sem notificações novas 📭');
  if (a === 'power') $('#modal-power').classList.add('open');
});
$('.home-quickbar').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  beep(620);
  if (a === 'library') toast('Biblioteca em breve 📚');
  if (a === 'trophies') openTrophies();
  if (a === 'settings') openSettings();
  if (a === 'logout') logout();
});

/* ================= LAUNCH ================= */
let launchTimer = null;
let launchTarget = null;

function launchGame(i) {
  const g = GAMES[i];
  if (!g) return;
  launchTarget = g;

  const launch = $('#screen-launch');
  launch.querySelector('.launch-bg').style.background = `
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
  const msgs = ['Verificando licença…','Carregando texturas…','Compilando shaders…','Sincronizando save…','Quase lá…'];

  launchTimer = setInterval(() => {
    p += Math.random() * 14 + 6;
    if (p >= 100) {
      p = 100;
      clearInterval(launchTimer);
      $('#launch-fill').style.width = '100%';
      $('#launch-status').textContent = 'Pronto!';
      setTimeout(() => {
        if (g.playable) startGameScreen();
        else {
          toast('Em breve no Vortex 4 😅');
          backToMenu();
        }
      }, 500);
    } else {
      $('#launch-fill').style.width = p + '%';
      $('#launch-status').textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 22))];
    }
  }, 240);
}

function backToMenu() {
  clearInterval(launchTimer);
  showScreen('screen-menu');
  requestAnimationFrame(updateCarousel);
  beep(520, 0.1);
}

/* ================= GAME: VORTEX REFLEX ================= */
const gameState = {
  running: false,
  score: 0,
  time: 30,
  spawnTimer: null,
  countdownTimer: null,
  targetTimers: new Set(),
};

function startGameScreen() {
  showScreen('screen-game');
  $('#game-intro').classList.remove('hide');
  $('#game-over').classList.add('hide');
  $('#game-playfield').querySelectorAll('.game-target,.score-float').forEach(el => el.remove());
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '30';
  beep(1040, 0.12, 'triangle');
}

function beginGame() {
  gameState.running = true;
  gameState.score = 0;
  gameState.time = 30;
  gameState.targetTimers.clear();
  $('#game-intro').classList.add('hide');
  $('#game-over').classList.add('hide');
  $('#game-playfield').querySelectorAll('.game-target,.score-float').forEach(el => el.remove());
  $('#game-score').textContent = '0';
  $('#game-time').textContent = '30';
  beep(880, 0.1, 'triangle');

  gameState.spawnTimer = setInterval(spawnTarget, 400);

  gameState.countdownTimer = setInterval(() => {
    gameState.time--;
    $('#game-time').textContent = gameState.time;
    if (gameState.time <= 5 && gameState.time > 0) beep(1200, 0.05, 'square');
    if (gameState.time <= 0) endGame();
  }, 1000);
}

function spawnTarget() {
  if (!gameState.running) return;
  const field = $('#game-playfield');
  const existing = field.querySelectorAll('.game-target').length;
  if (existing >= 5) return;

  const rect = field.getBoundingClientRect();
  const size = 52 + Math.random() * 36;
  const target = document.createElement('button');
  target.type = 'button';
  target.className = 'game-target';
  target.style.left = (20 + Math.random() * (rect.width - size - 40)) + 'px';
  target.style.top = (20 + Math.random() * (rect.height - size - 40)) + 'px';
  target.style.width = size + 'px';
  target.style.height = size + 'px';

  let handled = false;
  const remove = (wasHit) => {
    if (handled) return;
    handled = true;
    target.classList.add(wasHit ? 'game-target-hit' : 'game-target-out');
    setTimeout(() => target.remove(), 350);
  };

  target.addEventListener('click', e => {
    e.stopPropagation();
    if (handled || !gameState.running) return;
    gameState.score++;
    $('#game-score').textContent = gameState.score;
    beep(900 + Math.random() * 400, 0.05, 'triangle');

    const float = document.createElement('div');
    float.className = 'score-float';
    float.textContent = '+1';
    float.style.left = target.style.left;
    float.style.top = target.style.top;
    field.appendChild(float);
    setTimeout(() => float.remove(), 800);

    remove(true);
  });

  const lifetime = 1000 + Math.random() * 800;
  const t = setTimeout(() => remove(false), lifetime);
  gameState.targetTimers.add(t);

  field.appendChild(target);
}

function stopGame(silent = false) {
  gameState.running = false;
  clearInterval(gameState.spawnTimer);
  clearInterval(gameState.countdownTimer);
  gameState.targetTimers.forEach(t => clearTimeout(t));
  gameState.targetTimers.clear();
  const field = $('#game-playfield');
  if (field) field.querySelectorAll('.game-target,.score-float').forEach(el => el.remove());
  if (!silent) beep(400, 0.1);
}

function endGame() {
  stopGame(true);
  const score = gameState.score;

  // aplica troféus + recorde
  const game = GAMES[0];
  if (currentProfile) {
    if (!currentProfile.trophies) currentProfile.trophies = {};
    if (!currentProfile.trophies[game.id]) currentProfile.trophies[game.id] = [];

    let newTrophies = [];
    for (const t of game.trophies) {
      if (score >= t.score && !currentProfile.trophies[game.id].includes(t.id)) {
        currentProfile.trophies[game.id].push(t.id);
        newTrophies.push(t);
      }
    }
    currentProfile.highScore = Math.max(currentProfile.highScore || 0, score);

    const idx = profiles.findIndex(p => p.id === currentProfile.id);
    if (idx >= 0) profiles[idx] = currentProfile;
    saveProfiles();

    $('#game-final-score').textContent = score;
    if (newTrophies.length) {
      const names = newTrophies.map(t => TROPHY_TIERS[t.tier].icon + ' ' + TROPHY_TIERS[t.tier].name).join(' · ');
      $('#game-reward').textContent = `Troféu conquistado: ${names}`;
      beep(1200, 0.15, 'sine');
      setTimeout(() => beep(1500, 0.2, 'sine'), 180);
    } else {
      $('#game-reward').textContent = score >= 30 ? 'Recorde pessoal! 🔥' : '';
    }
  }

  $('#game-over').classList.remove('hide');
}

$('#btn-game-start').addEventListener('click', beginGame);
$('#btn-game-again').addEventListener('click', beginGame);
$('#btn-game-back').addEventListener('click', backToMenu);
$('#btn-game-exit').addEventListener('click', () => {
  stopGame();
  backToMenu();
});

/* ================= SETTINGS SCREEN ================= */
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
  profiles = [];
  currentProfile = null;
  profileIndex = 0;
  saveProfiles();
  toast('Todos os dados foram apagados.');
  beep(240, 0.2, 'sawtooth');
  setTimeout(() => showScreen('screen-profiles'), 400);
  renderProfiles();
});

/* ================= TROPHIES SCREEN ================= */
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
  const profile = currentProfile;

  GAMES.forEach(g => {
    if (!g.trophies || !g.trophies.length) return;
    const earned = profile.trophies?.[g.id] || [];
    const wrap = document.createElement('div');
    wrap.className = 'trophy-game';
    wrap.innerHTML = `
      <div class="trophy-game-header">
        <div class="trophy-game-icon" style="background:linear-gradient(145deg, ${g.c1}, ${g.c2})">${g.emoji}</div>
        <div>
          <div class="trophy-game-name">${esc(g.title)}</div>
          <div class="trophy-game-progress">${earned.length}/${g.trophies.length} troféus conquistados</div>
        </div>
      </div>
      <div class="trophy-list">
        ${g.trophies.map(t => `
          <div class="trophy-item ${t.tier} ${earned.includes(t.id) ? 'earned' : ''}">
            <span class="trophy-icon">${TROPHY_TIERS[t.tier].icon}</span>
            <span>${TROPHY_TIERS[t.tier].name} <small style="opacity:.7">· ${t.req}</small></span>
          </div>
        `).join('')}
      </div>
    `;
    body.appendChild(wrap);
  });

  if (!body.children.length) {
    body.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px">Nenhum troféu disponível ainda.</p>';
  }
}

/* ================= POWER MODAL ================= */
$('#btn-power-cancel').addEventListener('click', () => {
  $('#modal-power').classList.remove('open');
  beep(400);
});
$('#btn-power-confirm').addEventListener('click', () => {
  $('#modal-power').classList.remove('open');
  beep(300, 0.3, 'sawtooth');
  document.body.style.transition = 'opacity .6s';
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.opacity = '1';
    logout();
    showScreen('screen-boot');
    startBoot();
  }, 700);
});

/* ================= BOOT ================= */
let bootTimer = null;
function startBoot() {
  requestAnimationFrame(() => { $('.boot-progress-fill').style.width = '100%'; });
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

/* ================= TECLADO ================= */
document.addEventListener('keydown', e => {
  initAudio();
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
      if (k === 'Enter') {
        profileIndex === profiles.length ? openModal() : loginAs(profileIndex);
      }
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
      if (k === 'Escape') { stopGame(); backToMenu(); }
      break;
    case 'screen-launch':
      if (k === 'Escape') backToMenu();
      break;
  }
});

/* ================= RELÓGIO + TOAST ================= */
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

/* ================= INIT ================= */
applyTheme();
startBoot();
