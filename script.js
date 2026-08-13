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

// Inicializa Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// === LÓGICA DE BOOT E INICIALIZAÇÃO ===
window.addEventListener('load', () => {
  // Simula o carregamento do boot por 2.5 segundos
  setTimeout(() => {
    document.getElementById('boot-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    checkUserRegistrationStatus();
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

// === GERENCIAMENTO DE AUTENTICAÇÃO ===
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const switchAccountBtn = document.getElementById('switch-account-btn');

function checkUserRegistrationStatus() {
  const savedUser = localStorage.getItem('vortex_username');
  
  if (savedUser) {
    // Se já existe cadastro, exibe tela de login apenas com Username e PIN
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    document.getElementById('welcome-user').textContent = `Olá, ${savedUser}!`;
    document.getElementById('login-username').value = savedUser;
  } else {
    // Se nunca logou, exibe tela de cadastro completo
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

// Criar Conta
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  const pin = document.getElementById('reg-pin').value;

  localStorage.setItem('vortex_username', username);
  localStorage.setItem('vortex_pin', pin);

  enterSystem(username);
});

// Login com PIN
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value;
  const pinInput = document.getElementById('login-pin').value;
  
  const savedUser = localStorage.getItem('vortex_username');
  const savedPin = localStorage.getItem('vortex_pin');

  if (usernameInput === savedUser && pinInput === savedPin) {
    enterSystem(savedUser);
  } else {
    alert('Usuário ou PIN incorretos!');
  }
});

// Login Google via Firebase
document.getElementById('google-btn').addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const displayName = user.displayName || 'Usuário Google';
      
      localStorage.setItem('vortex_username', displayName);
      localStorage.setItem('vortex_pin', '1234'); // PIN padrão Google
      
      enterSystem(displayName);
    })
    .catch((error) => {
      console.warn('Fallback local ativado:', error.message);
      // Fallback caso pop-up de auth falhe em ambiente local
      const mockUser = 'Usuário Google';
      localStorage.setItem('vortex_username', mockUser);
      localStorage.setItem('vortex_pin', '1234');
      enterSystem(mockUser);
    });
});

// Trocar ou Criar Nova Conta
switchAccountBtn.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

function enterSystem(username) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('desktop').classList.remove('hidden');
  document.getElementById('taskbar').classList.remove('hidden');
  
  document.getElementById('current-user-display').textContent = username;
  document.getElementById('start-user-name').textContent = username;
}

function lockSystem() {
  document.getElementById('desktop').classList.add('hidden');
  document.getElementById('taskbar').classList.add('hidden');
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  checkUserRegistrationStatus();
}

// === SISTEMA DE JANELAS E INTERFACE ===
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
  if (win) {
    win.style.display = 'none';
  }
}

function minimizeWindow(appId) {
  closeWindow(appId);
}

function maximizeWindow(appId) {
  const win = document.getElementById(`window-${appId}`);
  if (win) {
    win.classList.toggle('maximized');
  }
}

function bringToFront(win) {
  highestZIndex++;
  win.style.zIndex = highestZIndex;
}

function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  menu.classList.toggle('hidden');
}

// === ARRASTAR JANELAS (DRAG & DROP) ===
let activeWin = null;
let offsetX = 0;
let offsetY = 0;

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
