// === CONFIGURAÇÃO FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyCdivWo9znhaRLQyK01ZXvOQMe1jUB98w4",
  authDomain: "vortex-os-3f1d8.firebaseapp.com",
  databaseURL: "https://vortex-os-3f1d8-default-rtdb.firebaseio.com",
  projectId: "vortex-os-3f1d8",
  storageBucket: "vortex-os-3f1d8.firebasestorage.app",
  messagingSenderId: "203433581297",
  appId: "1:203433581297:web:62bebe9a7bf1e46c276750",
  measurementId: "G-317ZP7P907"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// === BOOT E INICIALIZAÇÃO ===
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('boot-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    checkUserRegistrationStatus();
    initSystemApps();
  }, 2500);
});

// === RELÓGIOS ===
function updateClocks() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const shortTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  document.getElementById('clock').textContent = timeStr;
  document.getElementById('auth-clock').textContent = shortTimeStr;
}
setInterval(updateClocks, 1000);
updateClocks();

// === GERENCIAMENTO DE PERFIL E AUTENTICAÇÃO ===
let currentUser = {
  username: 'usuario',
  displayName: 'Usuário',
  avatar: '🌀'
};

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const switchAccountBtn = document.getElementById('switch-account-btn');

function checkUserRegistrationStatus() {
  const savedUser = localStorage.getItem('vortex_username');
  const savedDisplay = localStorage.getItem('vortex_displayname') || savedUser;
  const savedAvatar = localStorage.getItem('vortex_avatar') || '🌀';
  
  if (savedUser) {
    currentUser = { username: savedUser, displayName: savedDisplay, avatar: savedAvatar };
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    document.getElementById('welcome-user').textContent = `Olá, ${savedDisplay}!`;
    document.getElementById('login-username').value = savedUser;
    document.getElementById('login-avatar-display').textContent = savedAvatar;
  } else {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const pin = document.getElementById('reg-pin').value;

  localStorage.setItem('vortex_username', username);
  localStorage.setItem('vortex_displayname', username);
  localStorage.setItem('vortex_avatar', '🌀');
  localStorage.setItem('vortex_pin', pin);

  currentUser = { username, displayName: username, avatar: '🌀' };
  enterSystem();
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value;
  const pinInput = document.getElementById('login-pin').value;
  
  const savedUser = localStorage.getItem('vortex_username');
  const savedPin = localStorage.getItem('vortex_pin');

  if (usernameInput === savedUser && pinInput === savedPin) {
    enterSystem();
  } else {
    alert('Usuário ou PIN incorretos!');
  }
});

document.getElementById('google-btn').addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const name = result.user.displayName || 'Usuário Google';
      localStorage.setItem('vortex_username', 'google_user');
      localStorage.setItem('vortex_displayname', name);
      localStorage.setItem('vortex_avatar', '🌐');
      localStorage.setItem('vortex_pin', '1234');
      currentUser = { username: 'google_user', displayName: name, avatar: '🌐' };
      enterSystem();
    })
    .catch(() => {
      localStorage.setItem('vortex_username', 'google_user');
      localStorage.setItem('vortex_displayname', 'Usuário Google');
      localStorage.setItem('vortex_avatar', '🌐');
      localStorage.setItem('vortex_pin', '1234');
      currentUser = { username: 'google_user', displayName: 'Usuário Google', avatar: '🌐' };
      enterSystem();
    });
});

switchAccountBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

function enterSystem() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('desktop').classList.remove('hidden');
  document.getElementById('taskbar').classList.remove('hidden');
  
  updateProfileUI();
}

function updateProfileUI() {
  document.getElementById('current-user-display').textContent = `${currentUser.displayName} (@${currentUser.username})`;
  document.getElementById('start-user-name').textContent = currentUser.displayName;
  
  // App Chrome Badge
  document.getElementById('chrome-user-name').textContent = currentUser.displayName;
  document.getElementById('chrome-user-avatar').textContent = currentUser.avatar;

  // App Messenger Badge
  document.getElementById('msgr-self-avatar').textContent = currentUser.avatar;
  document.getElementById('msgr-self-display').textContent = currentUser.displayName;
  document.getElementById('msgr-self-username').textContent = `@${currentUser.username}`;

  // Inputs de Configurações
  document.getElementById('settings-avatar').value = currentUser.avatar;
  document.getElementById('settings-displayname').value = currentUser.displayName;
  document.getElementById('settings-username').value = currentUser.username;
}

function saveProfileSettings() {
  const newAvatar = document.getElementById('settings-avatar').value || '🌀';
  const newDisplay = document.getElementById('settings-displayname').value || currentUser.username;
  const newUsername = document.getElementById('settings-username').value || currentUser.username;

  currentUser = { username: newUsername, displayName: newDisplay, avatar: newAvatar };
  
  localStorage.setItem('vortex_avatar', newAvatar);
  localStorage.setItem('vortex_displayname', newDisplay);
  localStorage.setItem('vortex_username', newUsername);

  updateProfileUI();
  alert('Perfil atualizado com sucesso!');
}

function lockSystem() {
  document.getElementById('desktop').classList.add('hidden');
  document.getElementById('taskbar').classList.add('hidden');
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  checkUserRegistrationStatus();
}

// === APLICATIVOS VORTEX (CHROME, SITE BUILDER, MESSENGER) ===

// 1. VORTEX CHROME & DOMÍNIOS .VORT
let publishedSites = JSON.parse(localStorage.getItem('vortex_sites') || '{}');

function navigateChrome() {
  const urlInput = document.getElementById('chrome-url').value.trim().toLowerCase();
  const frame = document.getElementById('chrome-frame');
  const tabTitle = document.getElementById('chrome-tab-title');

  if (!urlInput) return;

  let domain = urlInput;
  if (!domain.endsWith('.vort')) domain += '.vort';

  if (publishedSites[domain]) {
    const site = publishedSites[domain];
    tabTitle.textContent = domain;
    frame.srcdoc = `
      <html>
        <head><style>${site.css}</style></head>
        <body>
          ${site.html}
          <script>${site.js}<\/script>
        </body>
      </html>
    `;
  } else {
    tabTitle.textContent = 'Pesquisa Vortex';
    frame.srcdoc = `
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f071a; color: white; height: 100vh;">
        <h1>🌀 Vortex Search</h1>
        <p style="color: #a855f7;">O site <strong>${domain}</strong> não foi encontrado na rede .vort.</p>
        <p style="font-size: 12px; color: #aaa;">Crie este site usando o <strong>Criador de Sites</strong>!</p>
      </div>
    `;
  }
}

function reloadChrome() {
  navigateChrome();
}

// 2. CRIADOR DE SITES
function publishSite() {
  const domainInput = document.getElementById('builder-domain').value.trim().toLowerCase();
  const html = document.getElementById('builder-html').value;
  const css = document.getElementById('builder-css').value;
  const js = document.getElementById('builder-js').value;

  if (!domainInput) {
    alert('Digite um nome para o seu domínio!');
    return;
  }

  const fullDomain = domainInput.endsWith('.vort') ? domainInput : `${domainInput}.vort`;

  publishedSites[fullDomain] = { html, css, js, author: currentUser.username };
  localStorage.setItem('vortex_sites', JSON.stringify(publishedSites));

  alert(`Site publicado com sucesso! Acesse "${fullDomain}" no Vortex Chrome.`);
}

// 3. VORTEX MESSENGER
let msgrCurrentView = 'dm'; // 'dm' ou serverId
let msgrMessages = JSON.parse(localStorage.getItem('vortex_msgr_chats') || '{"geral": []}');
let msgrServers = JSON.parse(localStorage.getItem('vortex_msgr_servers') || '[{"id":"geral","name":"Comunidade Vortex","code":"VTX-COMM"}]');

function initSystemApps() {
  renderMsgrServers();
  renderMsgrChannels();
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e){}
}

function renderMsgrServers() {
  const list = document.getElementById('msgr-servers-list');
  const addBtn = list.querySelector('.add-server');
  list.querySelectorAll('.server-dynamic').forEach(e => e.remove());

  msgrServers.forEach(s => {
    const el = document.createElement('div');
    el.className = `server-icon server-dynamic ${msgrCurrentView === s.id ? 'active' : ''}`;
    el.textContent = s.name.charAt(0).toUpperCase();
    el.title = `${s.name} (${s.code})`;
    el.onclick = () => {
      msgrCurrentView = s.id;
      renderMsgrServers();
      renderMsgrChannels();
    };
    list.insertBefore(el, addBtn);
  });
}

function renderMsgrChannels() {
  const title = document.getElementById('msgr-sidebar-title');
  const list = document.getElementById('msgr-channels-list');
  const chatTitle = document.getElementById('msgr-chat-title');
  list.innerHTML = '';

  if (msgrCurrentView === 'dm') {
    title.textContent = 'Mensagens Diretas';
    chatTitle.textContent = '💬 Amigos & DMs';
    
    const friend = document.createElement('div');
    friend.className = 'msgr-item active';
    friend.textContent = '🤖 Bot Vortex';
    list.appendChild(friend);
  } else {
    const server = msgrServers.find(s => s.id === msgrCurrentView);
    title.textContent = server ? server.name : 'Servidor';
    chatTitle.textContent = `# geral (${server ? server.code : ''})`;

    const chan = document.createElement('div');
    chan.className = 'msgr-item active';
    chan.textContent = '# geral';
    list.appendChild(chan);
  }

  loadMsgrMessages();
}

function loadMsgrMessages() {
  const box = document.getElementById('msgr-messages-box');
  box.innerHTML = '';
  const msgs = msgrMessages[msgrCurrentView] || [];

  msgs.forEach(m => {
    const el = document.createElement('div');
    el.className = 'msgr-msg';
    el.innerHTML = `
      <span class="msgr-msg-author">${m.avatar || '🌀'} ${m.author}:</span>
      <span class="msgr-msg-text">${m.text}</span>
    `;
    box.appendChild(el);
  });

  box.scrollTop = box.scrollHeight;
}

function sendMsgrMessage() {
  const input = document.getElementById('msgr-input');
  const text = input.value.trim();
  if (!text) return;

  if (!msgrMessages[msgrCurrentView]) msgrMessages[msgrCurrentView] = [];

  msgrMessages[msgrCurrentView].push({
    author: currentUser.displayName,
    avatar: currentUser.avatar,
    text: text
  });

  localStorage.setItem('vortex_msgr_chats', JSON.stringify(msgrMessages));
  input.value = '';
  loadMsgrMessages();

  // Resposta automática do Bot se estiver em DMs
  if (msgrCurrentView === 'dm') {
    setTimeout(() => {
      msgrMessages['dm'].push({
        author: 'Bot Vortex',
        avatar: '🤖',
        text: `Olá ${currentUser.displayName}! Recebi sua mensagem: "${text}"`
      });
      localStorage.setItem('vortex_msgr_chats', JSON.stringify(msgrMessages));
      loadMsgrMessages();
      playNotificationSound();
    }, 1200);
  }
}

function promptCreateServer() {
  const code = prompt('Digite um Código de Convite para entrar ou um Nome para criar um novo Servidor:');
  if (!code) return;

  const existing = msgrServers.find(s => s.code.toLowerCase() === code.toLowerCase());
  if (existing) {
    msgrCurrentView = existing.id;
  } else {
    const newServer = {
      id: 'srv_' + Date.now(),
      name: code,
      code: 'VTX-' + Math.floor(1000 + Math.random() * 9000)
    };
    msgrServers.push(newServer);
    localStorage.setItem('vortex_msgr_servers', JSON.stringify(msgrServers));
    msgrCurrentView = newServer.id;
  }

  renderMsgrServers();
  renderMsgrChannels();
}

function switchMsgrView(view) {
  msgrCurrentView = view;
  renderMsgrServers();
  renderMsgrChannels();
}

// === JANELAS E ARRASTE (MANTIDO) ===
let highestZIndex = 10;

function openWindow(appId) {
  const win = document.getElementById(`window-${appId}`);
  if (win) {
    win.style.display = 'flex';
    bringToFront(win);
  }
}

function closeWindow(appId) {
  const win = document.getElementById(`window-${appId}`);
  if (win) win.style.display = 'none';
}

function minimizeWindow(appId) { closeWindow(appId); }

function maximizeWindow(appId) {
  const win = document.getElementById(`window-${appId}`);
  if (win) win.classList.toggle('maximized');
}

function bringToFront(win) {
  highestZIndex++;
  win.style.zIndex = highestZIndex;
}

function toggleStartMenu() {
  document.getElementById('start-menu').classList.toggle('hidden');
}

let activeWin = null;
let offsetX = 0, offsetY = 0;

function startDrag(e, winId) {
  const win = document.getElementById(winId);
  if (win.classList.contains('maximized')) return;

  activeWin = win;
  bringToFront(activeWin);
  
  offsetX = e.clientX - activeWin.offsetLeft;
  offsetY = e.clientY - activeWin.offsetTop;

  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
  if (!activeWin) return;
  activeWin.style.left = `${e.clientX - offsetX}px`;
  activeWin.style.top = `${e.clientY - offsetY}px`;
}

function stopDrag() {
  activeWin = null;
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
}
