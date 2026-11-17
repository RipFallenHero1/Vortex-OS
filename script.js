/* =========================================================
   VORTEX 4 — vortexOS 4.02 (demo de interface)
   ========================================================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
));

/* ---------------- áudio (bipes de interface) ---------------- */
let actx = null;
function initAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep(freq = 520, dur = 0.07, type = 'sine', vol = 0.03) {
  if (!actx) return;
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
window.addEventListener('pointerdown', initAudio, { once: true });

/* ---------------- estado / telas ---------------- */
let currentScreen = 'screen-boot';

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  currentScreen = id;
  if (id === 'screen-menu') requestAnimationFrame(updateCarousel);
}

/* ---------------- dados ---------------- */
const AVATARS = ['🎮','😎','👾','🐉','🦊','🤖','🐺','🦄','🔥','⭐','🌙','🍕'];
const COLORS = [
  ['#00e5ff','#0047ff'],
  ['#ff2e88','#6a00ff'],
  ['#ffcc00','#ff5e00'],
  ['#00ffa3','#00b3ff'],
  ['#c86bff','#3a00a0'],
  ['#ff6b6b','#a80000'],
];

const GAMES = [
  { title:'Neon Drift',     genre:'Corrida',   emoji:'🏎️', c1:'#00e5ff', c2:'#0047ff',
    desc:'Corra por uma metrópole cyberpunk em alta velocidade. Reflexos rápidos, música alta e derrapagens impossíveis.' },
  { title:'Void Hunter',    genre:'Ação',      emoji:'🚀', c1:'#ff2e88', c2:'#6a00ff',
    desc:'Caça recompensas em setores abandonados do espaço. Cada nave inimiga esconde um segredo do Vazio.' },
  { title:'Pixel Kingdoms', genre:'RPG',       emoji:'⚔️', c1:'#ffcc00', c2:'#ff5e00',
    desc:'Reconstrua um reino em 8 bits, recrute heróis e derrote o Lorde das Sombras — tudo em turnos clássicos.' },
  { title:'Abyss Dive',     genre:'Aventura',  emoji:'🌊', c1:'#00ffa3', c2:'#0066ff',
    desc:'Mergulhe em fossas oceânicas desconhecidas, gerencie oxigênio e descubra ruínas de uma civilização submersa.' },
  { title:'Ghost Protocol', genre:'Stealth',   emoji:'👻', c1:'#b0b8ff', c2:'#3a2a7a',
    desc:'Você é o fantasma que ninguém vê. Hackeie, infiltre e desapareça antes que o alarme toque.' },
  { title:'Storm Riders',   genre:'Esporte',   emoji:'🏂', c1:'#ff9a00', c2:'#ff2d00',
    desc:'Desça montanhas em tempestades absurdas. Truques impossíveis, física duvidosa e muita adrenalina.' },
  { title:'Orbit Wars',     genre:'Estratégia',emoji:'🛸', c1:'#7cf5ff', c2:'#0051ff',
    desc:'Comande frotas orbitais, negocie com colônias e domine o sistema em batalhas por turnos.' },
  { title:'Rune Legacy',    genre:'RPG',       emoji:'🔮', c1:'#c86bff', c2:'#4a00a0',
    desc:'Desvende runas ancestrais, combine magias e escreva sua própria lenda em um mundo aberto gigantesco.' },
];

/* ---------------- perfis ---------------- */
let profiles = loadProfiles();
let profileIndex = 0;
let currentProfile = null;

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem('vortex4.profiles')) || []; }
  catch (e) { return []; }
}
function saveProfiles() {
  localStorage.setItem('vortex4.profiles', JSON.stringify(profiles));
}

function renderProfiles() {
  const list = $('#profiles-list');
  list.innerHTML = '';

  profiles.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'profile-card' + (i === profileIndex ? ' selected' : '');
    card.innerHTML = `
      <div class="profile-avatar" style="background:linear-gradient(145deg, ${p.color[0]}, ${p.color[1]})">${p.avatar}</div>
      <span class="profile-name">${esc(p.name)}</span>
      <button class="profile-del" title="Excluir perfil">✕</button>
    `;
    card.addEventListener('click', () => {
      profileIndex = i;
      beep(620);
      renderProfiles();
    });
    card.addEventListener('dblclick', () => loginAs(i));
    card.querySelector('.profile-del').addEventListener('click', e => {
      e.stopPropagation();
      profiles.splice(i, 1);
      saveProfiles();
      profileIndex = Math.max(0, Math.min(profileIndex, profiles.length));
      beep(240, .13, 'sawtooth');
      renderProfiles();
    });
    list.appendChild(card);
  });

  // card "novo perfil"
  const add = document.createElement('div');
  add.className = 'profile-card' + (profileIndex === profiles.length ? ' selected' : '');
  add.innerHTML = `
    <div class="profile-avatar add-avatar">+</div>
    <span class="profile-name">Novo Perfil</span>
  `;
  add.addEventListener('click', () => {
    profileIndex = profiles.length;
    renderProfiles();
    openModal();
  });
  list.appendChild(add);
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
  beep(1040, .12, 'triangle');
}

function logout() {
  beep(400, .1, 'sine');
  profileIndex = Math.max(0, profiles.indexOf(currentProfile));
  renderProfiles();
  showScreen('screen-profiles');
}

/* ---------------- modal criar perfil ---------------- */
let newAvatar = AVATARS[0];
let newColor = COLORS[0];

function openModal() {
  if (profiles.length >= 8) { toast('Limite de 8 perfis atingido 😅'); return; }
  newAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  $('#input-name').value = '';
  buildPickers();
  $('#modal-create').classList.add('open');
  setTimeout(() => $('#input-name').focus(), 130);
  beep(700, .08, 'triangle');
}
function closeModal() {
  $('#modal-create').classList.remove('open');
}
function buildPickers() {
  const pa = $('#picker-avatar');
  pa.innerHTML = '';
  AVATARS.forEach(a => {
    const b = document.createElement('button');
    b.className = 'pick' + (a === newAvatar ? ' sel' : '');
    b.textContent = a;
    b.onclick = () => { newAvatar = a; beep(760); buildPickers(); };
    pa.appendChild(b);
  });

  const pc = $('#picker-color');
  pc.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
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
  profiles.push({ id: Date.now(), name, avatar: newAvatar, color: newColor });
  saveProfiles();
  closeModal();
  beep(900, .12, 'triangle');
  loginAs(profiles.length - 1);
});

/* ---------------- menu / carrossel ---------------- */
let gameIndex = 0;

function renderCarousel() {
  const track = $('#carousel-track');
  track.innerHTML = '';

  GAMES.forEach((g, i) => {
    const card = document.createElement('button');
    card.className = 'game-card';
    card.style.setProperty('--c1', g.c1);
    card.style.setProperty('--c2', g.c2);
    card.innerHTML = `
      <div class="game-art">${g.emoji}</div>
      <span class="game-genre">${g.genre}</span>
      <span class="game-name">${g.title}</span>
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

  const g = GAMES[gameIndex];
  $('#game-badge').textContent = g.genre;
  $('#game-title').textContent = g.title;
  $('#game-desc').textContent = g.desc;
  updateCarousel();
}

function updateCarousel() {
  const wrap = $('.carousel-wrap');
  const track = $('#carousel-track');
  if (!wrap || !track || !track.children.length) return;

  const cardW = track.children[0].offsetWidth;
  const gap = 24;
  const step = cardW + gap;
  const offset = wrap.clientWidth / 2 - cardW / 2 - gameIndex * step;
  track.style.transform = `translateX(${offset}px)`;
}

window.addEventListener('resize', () => {
  if (currentScreen === 'screen-menu') updateCarousel();
});

$('#btn-play').addEventListener('click', () => launchGame(gameIndex));
$('#btn-logout').addEventListener('click', logout);

$$('.tab').forEach(t => t.addEventListener('click', () => {
  if (t.classList.contains('active')) return;
  beep(480);
  toast('Em breve no Vortex 4 😅');
}));

/* ---------------- lançar "jogo" ---------------- */
let launchTimer = null;

function launchGame(i) {
  const g = GAMES[i];
  if (!g) return;

  const launch = $('#screen-launch');
  launch.style.setProperty('--lc1', g.c1);
  launch.style.setProperty('--lc2', g.c2);

  $('#launch-icon').textContent = g.emoji;
  $('#launch-title').textContent = g.title;
  $('#launch-fill').style.width = '0%';

  const bar = $('.launch-bar');
  const status = $('#launch-status');
  const play = $('#launch-play');

  bar.classList.remove('hide');
  status.classList.remove('hide');
  play.classList.remove('show');
  status.textContent = 'Verificando licença…';

  showScreen('screen-launch');
  beep(880, .1, 'triangle');

  clearInterval(launchTimer);
  let p = 0;
  const msgs = ['Verificando licença…', 'Carregando texturas…', 'Compilando shaders…', 'Sincronizando save…', 'Quase lá…'];

  launchTimer = setInterval(() => {
    p += Math.random() * 14 + 6;

    if (p >= 100) {
      p = 100;
      clearInterval(launchTimer);
      $('#launch-fill').style.width = '100%';
      status.textContent = 'Pronto!';

      setTimeout(() => {
        bar.classList.add('hide');
        status.classList.add('hide');
        play.classList.add('show');
        beep(1180, .16, 'sine');
      }, 480);
    } else {
      $('#launch-fill').style.width = p + '%';
      status.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 22))];
    }
  }, 260);
}

function backToMenu() {
  clearInterval(launchTimer);
  showScreen('screen-menu');
  requestAnimationFrame(updateCarousel);
  beep(520, .1);
}

$('#screen-launch').addEventListener('click', () => {
  if ($('#launch-play').classList.contains('show')) backToMenu();
});

/* ---------------- boot ---------------- */
let bootTimer = null;

function startBoot() {
  requestAnimationFrame(() => { $('.boot-bar-fill').style.width = '100%'; });
  bootTimer = setTimeout(finishBoot, 4000);
}
function finishBoot() {
  clearTimeout(bootTimer);
  if (currentScreen !== 'screen-boot') return;
  renderProfiles();
  showScreen('screen-profiles');
  beep(760, .12, 'triangle');
}
$('#screen-boot').addEventListener('click', () => { initAudio(); finishBoot(); });

/* ---------------- teclado ---------------- */
document.addEventListener('keydown', e => {
  initAudio();
  const k = e.key;

  // modal aberto tem prioridade
  if ($('#modal-create').classList.contains('open')) {
    if (k === 'Escape') closeModal();
    if (k === 'Enter' && document.activeElement === $('#input-name')) {
      e.preventDefault();
      $('#btn-confirm').click();
    }
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

    case 'screen-launch':
      if (k === 'Escape') backToMenu();
      break;
  }
});

/* ---------------- relógio + toast ---------------- */
function tickClock() {
  const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $$('.clock').forEach(el => el.textContent = t);
}
setInterval(tickClock, 1000);
tickClock();

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- go! ---------------- */
startBoot();
