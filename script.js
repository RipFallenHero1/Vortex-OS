// Configuração do Firebase fornecida
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

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// CLASSE PRINCIPAL DO SISTEMA OPERACIONAL
class VortexOS {
    constructor() {
        this.highestZIndex = 100;
        this.openWindows = {};
        this.currentUser = null;

        this.initUI();
        this.initAuth();
        this.startClock();
    }

    // Gerenciador de Inicialização da Interface
    initUI() {
        // Renderizar ícones do Lucide
        lucide.createIcons();

        // Botão Ligar
        document.getElementById('power-btn').addEventListener('click', () => {
            this.switchScreen('auth-screen');
        });

        // Alternadores Login/Cadastro
        document.getElementById('to-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('auth-title').innerText = "Criar Conta - Vortex";
        });

        document.getElementById('to-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('auth-title').innerText = "Vortex OS";
        });

        // Menu Iniciar
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-menu').classList.toggle('hidden');
        });
    }

    // Controle de Telas (Boot -> Auth -> Desktop)
    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Relógio do Sistema
    startClock() {
        const update = () => {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('clock').innerText = time;
        };
        update();
        setInterval(update, 10000);
    }

    // Autenticação Realtime com Firebase
    initAuth() {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const errorMsg = document.getElementById('auth-error');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;

            auth.signInWithEmailAndPassword(email, pass)
                .then(userCred => {
                    this.onLoginSuccess(userCred.user);
                })
                .catch(err => errorMsg.innerText = "Erro ao entrar: " + err.message);
        });

        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;

            auth.createUserWithEmailAndPassword(email, pass)
                .then(userCred => {
                    database.ref('users/' + userCred.user.uid).set({
                        username: name,
                        email: email,
                        created_at: Date.now()
                    });
                    this.onLoginSuccess(userCred.user, name);
                })
                .catch(err => errorMsg.innerText = "Erro ao cadastrar: " + err.message);
        });
    }

    onLoginSuccess(user, fallbackName = "Usuário") {
        this.currentUser = user;
        database.ref('users/' + user.uid).once('value').then(snapshot => {
            const val = snapshot.val();
            const name = val ? val.username : fallbackName;
            document.getElementById('system-user-name').innerText = name;
        });
        this.switchScreen('desktop-screen');
    }

    // SISTEMA DE GERENCIAMENTO DE JANELAS
    openApp(appId) {
        document.getElementById('start-menu').classList.add('hidden');

        if (this.openWindows[appId]) {
            this.bringToFront(this.openWindows[appId]);
            return;
        }

        const win = document.createElement('div');
        win.className = 'window';
        win.id = `win-${appId}`;
        win.style.zIndex = ++this.highestZIndex;

        let title = "Aplicativo";
        let content = "";

        // Template de Apps
        if (appId === 'calculator') {
            title = "Calculadora";
            content = `
                <div class="calc-display" id="calc-screen">0</div>
                <div class="calc-grid">
                    <button class="calc-btn" onclick="vortexOS.calcInput('C')">C</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('/')">/</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('*')">*</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('-')">-</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('7')">7</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('8')">8</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('9')">9</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('+')">+</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('4')">4</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('5')">5</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('6')">6</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('=')">=</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('1')">1</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('2')">2</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('3')">3</button>
                    <button class="calc-btn" onclick="vortexOS.calcInput('0')">0</button>
                </div>`;
        } else if (appId === 'notepad') {
            title = "Bloco de Notas";
            content = `<textarea class="notepad-text" placeholder="Digite seu texto aqui..."></textarea>`;
        } else if (appId === 'files') {
            title = "Gerenciador de Arquivos";
            content = `
                <div class="file-list">
                    <div class="file-item"><i data-lucide="folder"></i><span>Documentos</span></div>
                    <div class="file-item"><i data-lucide="folder"></i><span>Imagens</span></div>
                    <div class="file-item"><i data-lucide="file"></i><span>notas.txt</span></div>
                </div>`;
        } else if (appId === 'settings') {
            title = "Configurações";
            content = `
                <div class="settings-group">
                    <h4>Plano de Fundo (Wallpaper)</h4>
                    <div class="wallpaper-options">
                        <div class="wp-thumb" style="background: linear-gradient(135deg, #1e112a, #3b136f);" onclick="vortexOS.setWallpaper('default')"></div>
                        <div class="wp-thumb" style="background: linear-gradient(135deg, #09090b, #27272a);" onclick="vortexOS.setWallpaper('dark')"></div>
                        <div class="wp-thumb" style="background: linear-gradient(135deg, #4c1d95, #c084fc);" onclick="vortexOS.setWallpaper('neon')"></div>
                    </div>
                </div>
                <div class="settings-group">
                    <h4>Sobre o Sistema</h4>
                    <p style="font-size:12px; color:#aaa;">Vortex OS Version 1.0 (Build 2026)</p>
                </div>`;
        }

        win.innerHTML = `
            <div class="window-header">
                <div class="window-title"><i data-lucide="app-window"></i> ${title}</div>
                <div class="window-controls">
                    <button class="win-btn win-min" onclick="vortexOS.minimizeWindow('${appId}')"></button>
                    <button class="win-btn win-close" onclick="vortexOS.closeWindow('${appId}')"></button>
                </div>
            </div>
            <div class="window-body">${content}</div>
        `;

        document.getElementById('window-container').appendChild(win);
        this.openWindows[appId] = win;
        this.makeDraggable(win);

        win.addEventListener('mousedown', () => this.bringToFront(win));

        this.addTaskbarItem(appId, title);
        lucide.createIcons();
    }

    // Funcionalidades de Arrastar Janela
    makeDraggable(win) {
        const header = win.querySelector('.window-header');
        let isDragging = false, offsetXR = 0, offsetYR = 0;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetXR = e.clientX - win.offsetLeft;
            offsetYR = e.clientY - win.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${e.clientX - offsetXR}px`;
            win.style.top = `${e.clientY - offsetYR}px`;
        });

        document.addEventListener('mouseup', () => isDragging = false);
    }

    bringToFront(win) {
        win.style.zIndex = ++this.highestZIndex;
    }

    closeWindow(appId) {
        if (this.openWindows[appId]) {
            this.openWindows[appId].remove();
            delete this.openWindows[appId];
            const tbItem = document.getElementById(`tb-${appId}`);
            if (tbItem) tbItem.remove();
        }
    }

    minimizeWindow(appId) {
        if (this.openWindows[appId]) {
            this.openWindows[appId].style.display = 
                this.openWindows[appId].style.display === 'none' ? 'flex' : 'none';
        }
    }

    addTaskbarItem(appId, title) {
        const tb = document.getElementById('taskbar-apps');
        const item = document.createElement('div');
        item.className = 'taskbar-item active';
        item.id = `tb-${appId}`;
        item.innerText = title;
        item.onclick = () => this.minimizeWindow(appId);
        tb.appendChild(item);
    }

    // Lógica dos Aplicativos
    calcInput(val) {
        const screen = document.getElementById('calc-screen');
        if (!screen) return;

        if (val === 'C') {
            screen.innerText = '0';
        } else if (val === '=') {
            try {
                screen.innerText = eval(screen.innerText.replace(/[^0-9+\-*/.]/g, ''));
            } catch {
                screen.innerText = 'Erro';
            }
        } else {
            if (screen.innerText === '0' || screen.innerText === 'Erro') {
                screen.innerText = val;
            } else {
                screen.innerText += val;
            }
        }
    }

    setWallpaper(theme) {
        const desktop = document.getElementById('desktop-screen');
        if (theme === 'dark') {
            desktop.style.background = 'linear-gradient(135deg, #09090b 0%, #27272a 100%)';
        } else if (theme === 'neon') {
            desktop.style.background = 'linear-gradient(135deg, #4c1d95 0%, #c084fc 100%)';
        } else {
            desktop.style.background = 'linear-gradient(135deg, #1e112a 0%, #3b136f 50%, #110726 100%)';
        }
    }

    // Opções de Energia
    shutdownSystem() {
        auth.signOut();
        Object.keys(this.openWindows).forEach(appId => this.closeWindow(appId));
        document.getElementById('start-menu').classList.add('hidden');
        this.switchScreen('boot-screen');
    }

    restartSystem() {
        this.shutdownSystem();
        setTimeout(() => {
            this.switchScreen('auth-screen');
        }, 1200);
    }
}

// Inicializar o Sistema
const vortexOS = new VortexOS();
