// Configuração do Firebase
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

// Inicialização
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

class VortexOS {
    constructor() {
        this.highestZIndex = 100;
        this.openWindows = {};
        this.currentUser = null;

        this.initUI();
        this.initAuth();
        this.startClock();
    }

    initUI() {
        lucide.createIcons();

        // Botão Ligar
        document.getElementById('power-btn').addEventListener('click', () => {
            this.switchScreen('auth-screen');
        });

        // Troca de Abas no Login (E-mail vs PIN)
        const tabEmail = document.getElementById('tab-email');
        const tabPin = document.getElementById('tab-pin');
        const loginForm = document.getElementById('login-form');
        const pinForm = document.getElementById('pin-form');
        const regForm = document.getElementById('register-form');
        const errorMsg = document.getElementById('auth-error');

        tabEmail.addEventListener('click', () => {
            tabEmail.classList.add('active');
            tabPin.classList.remove('active');
            loginForm.classList.remove('hidden');
            pinForm.classList.add('hidden');
            regForm.classList.add('hidden');
            errorMsg.innerText = "";
        });

        tabPin.addEventListener('click', () => {
            tabPin.classList.add('active');
            tabEmail.classList.remove('active');
            pinForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            regForm.classList.add('hidden');
            errorMsg.innerText = "";
        });

        // Alternadores Cadastro/Login
        document.getElementById('to-register').addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            pinForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            document.getElementById('auth-title').innerText = "Criar Conta - Vortex";
            errorMsg.innerText = "";
        });

        document.getElementById('to-login').addEventListener('click', (e) => {
            e.preventDefault();
            regForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            tabEmail.click();
            document.getElementById('auth-title').innerText = "Vortex OS";
            errorMsg.innerText = "";
        });

        // Menu Iniciar
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-menu').classList.toggle('hidden');
        });
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    startClock() {
        const update = () => {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('clock').innerText = time;
        };
        update();
        setInterval(update, 10000);
    }

    // SISTEMA DE AUTENTICAÇÃO (Email, Google, PIN)
    initAuth() {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const pinForm = document.getElementById('pin-form');
        const googleBtn = document.getElementById('google-btn');
        const errorMsg = document.getElementById('auth-error');

        // 1. Login por E-mail e Senha
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;

            auth.signInWithEmailAndPassword(email, pass)
                .then(userCred => this.onLoginSuccess(userCred.user))
                .catch(err => errorMsg.innerText = "Erro ao entrar: " + err.message);
        });

        // 2. Login por Google
        googleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(result => {
                    // Salvar usuário no banco se for primeiro acesso
                    database.ref('users/' + result.user.uid).update({
                        username: result.user.displayName,
                        email: result.user.email,
                        photo: result.user.photoURL
                    });
                    this.onLoginSuccess(result.user, result.user.displayName, result.user.photoURL);
                })
                .catch(err => errorMsg.innerText = "Erro no Google: " + err.message);
        });

        // 3. Login por PIN
        pinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('pin-email').value;
            const pinEntered = document.getElementById('pin-input').value;

            // Busca no Realtime Database pelo usuário correspondente
            database.ref('users').orderByChild('email').equalTo(email).once('value')
                .then(snapshot => {
                    if (!snapshot.exists()) {
                        errorMsg.innerText = "E-mail não encontrado!";
                        return;
                    }

                    let userData = null;
                    let uid = null;
                    snapshot.forEach(child => {
                        uid = child.key;
                        userData = child.val();
                    });

                    if (userData && userData.pin === pinEntered) {
                        this.onLoginSuccess({ uid: uid, email: userData.email }, userData.username, userData.photo);
                    } else {
                        errorMsg.innerText = "PIN incorreto ou não configurado!";
                    }
                })
                .catch(err => errorMsg.innerText = "Erro de validação PIN: " + err.message);
        });

        // 4. Cadastro de E-mail
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

    onLoginSuccess(user, fallbackName = "Usuário", photoUrl = null) {
        this.currentUser = user;
        database.ref('users/' + user.uid).once('value').then(snapshot => {
            const val = snapshot.val();
            const name = val ? val.username : fallbackName;
            const photo = val && val.photo ? val.photo : photoUrl;

            document.getElementById('system-user-name').innerText = name;

            if (photo) {
                document.getElementById('desktop-avatar').innerHTML = `<img src="${photo}">`;
                document.getElementById('auth-avatar').innerHTML = `<img src="${photo}">`;
            }
        });
        this.switchScreen('desktop-screen');
    }

    // Configurar / Salvar PIN no Perfil do Usuário
    saveUserPin(newPin) {
        if (!this.currentUser) return;
        if (newPin.length !== 4 || isNaN(newPin)) {
            alert("O PIN deve ter exatamente 4 números!");
            return;
        }

        database.ref('users/' + this.currentUser.uid).update({ pin: newPin })
            .then(() => alert("PIN salvo com sucesso! Agora você pode usar o PIN na tela inicial."))
            .catch(err => alert("Erro ao salvar PIN: " + err.message));
    }

    // JANELAS
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
                    <h4>Segurança e PIN</h4>
                    <p style="font-size:12px; color:#aaa;">Cadastre um PIN de 4 dígitos para login rápido:</p>
                    <div class="pin-config-box">
                        <input type="password" id="new-pin-input" maxlength="4" placeholder="Ex: 1234">
                        <button class="btn-primary" onclick="vortexOS.saveUserPin(document.getElementById('new-pin-input').value)">Salvar PIN</button>
                    </div>
                </div>
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

const vortexOS = new VortexOS();
