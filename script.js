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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

class VortexOS {
    constructor() {
        this.highestZIndex = 100;
        this.openWindows = {};
        this.currentUserUid = null;
        this.userData = {
            displayName: "Usuário",
            username: "usuario",
            recoveryEmail: "",
            photoUrl: "",
            email: ""
        };

        this.initUI();
        this.initAuth();
        this.startClock();
    }

    initUI() {
        lucide.createIcons();

        // Tentar Auto-Login ao Ligar
        document.getElementById('power-btn').addEventListener('click', () => {
            if (!this.checkSavedSession()) {
                this.switchScreen('auth-screen');
            }
        });

        // Alternadores Cadastro/Login
        const loginForm = document.getElementById('pin-login-form');
        const regForm = document.getElementById('pin-register-form');
        const subtitle = document.getElementById('auth-subtitle');
        const errorMsg = document.getElementById('auth-error');

        document.getElementById('to-register').addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            subtitle.innerText = "Cadastre seu perfil e PIN único";
            errorMsg.innerText = "";
        });

        document.getElementById('to-login').addEventListener('click', (e) => {
            e.preventDefault();
            regForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            subtitle.innerText = "Digite seu PIN de acesso";
            errorMsg.innerText = "";
        });

        // FIX MENU INICIAR BLINDADO (ABRE APENAS AO CLICAR NO ÍCONE)
        const startBtn = document.getElementById('start-btn');
        const startMenu = document.getElementById('start-menu');

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Bloqueia propagação do clique
            startMenu.classList.toggle('hidden');
        });

        // Clique em qualquer outro lugar do sistema fecha o menu iniciar
        document.addEventListener('click', (e) => {
            if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
                startMenu.classList.add('hidden');
            }
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
            document.getElementById('clock-time').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('clock-date').innerText = now.toLocaleDateString('pt-BR');
        };
        update();
        setInterval(update, 1000);
    }

    // AUTO-LOGIN (SESSÃO SALVA)
    checkSavedSession() {
        const saved = localStorage.getItem('vortex_user_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.currentUserUid = parsed.uid;
                this.userData = parsed.userData;
                this.updateSystemUserUI();
                this.switchScreen('desktop-screen');
                return true;
            } catch (e) {
                localStorage.removeItem('vortex_user_session');
            }
        }
        return false;
    }

    saveSession() {
        localStorage.setItem('vortex_user_session', JSON.stringify({
            uid: this.currentUserUid,
            userData: this.userData
        }));
    }

    clearSession() {
        localStorage.removeItem('vortex_user_session');
    }

    // AUTENTICAÇÃO
    initAuth() {
        const loginForm = document.getElementById('pin-login-form');
        const regForm = document.getElementById('pin-register-form');
        const googleBtn = document.getElementById('google-btn');
        const errorMsg = document.getElementById('auth-error');

        // Login por PIN
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.toLowerCase().trim();
            const pin = document.getElementById('login-pin').value;
            const remember = document.getElementById('remember-session').checked;

            database.ref('users').orderByChild('email').equalTo(email).once('value')
                .then(snapshot => {
                    if (!snapshot.exists()) {
                        errorMsg.innerText = "Usuário não encontrado!";
                        return;
                    }

                    let uid = null;
                    let data = null;
                    snapshot.forEach(child => {
                        uid = child.key;
                        data = child.val();
                    });

                    if (data && data.pin === pin) {
                        this.currentUserUid = uid;
                        this.loadAndApplyUserData(data, remember);
                    } else {
                        errorMsg.innerText = "PIN incorreto!";
                    }
                })
                .catch(err => errorMsg.innerText = "Erro ao validar: " + err.message);
        });

        // Cadastro PIN
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const username = document.getElementById('reg-username').value.replace('@', '');
            const email = document.getElementById('reg-email').value.toLowerCase().trim();
            const pin = document.getElementById('reg-pin').value;

            if (pin.length < 4) {
                errorMsg.innerText = "O PIN precisa ter pelo menos 4 dígitos!";
                return;
            }

            const newUserRef = database.ref('users').push();
            const initialData = {
                username: username,
                displayName: name,
                email: email,
                recoveryEmail: "",
                photoUrl: "",
                pin: pin,
                created_at: Date.now()
            };

            newUserRef.set(initialData).then(() => {
                this.currentUserUid = newUserRef.key;
                this.loadAndApplyUserData(initialData, true);
            }).catch(err => errorMsg.innerText = "Erro ao cadastrar: " + err.message);
        });

        // Login Google
        googleBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(result => {
                    this.currentUserUid = result.user.uid;
                    const userRef = database.ref('users/' + result.user.uid);

                    userRef.once('value').then(snapshot => {
                        let data = snapshot.val();
                        if (!data) {
                            data = {
                                username: result.user.email.split('@')[0],
                                displayName: result.user.displayName,
                                email: result.user.email,
                                recoveryEmail: "",
                                photoUrl: result.user.photoURL || ""
                            };
                            userRef.set(data);
                        }
                        this.loadAndApplyUserData(data, true);
                    });
                })
                .catch(err => errorMsg.innerText = "Erro Google: " + err.message);
        });
    }

    loadAndApplyUserData(data, shouldSave = true) {
        this.userData = {
            displayName: data.displayName || data.username || "Usuário",
            username: data.username || "usuario",
            recoveryEmail: data.recoveryEmail || "",
            photoUrl: data.photoUrl || "",
            email: data.email || ""
        };

        if (shouldSave) this.saveSession();

        this.updateSystemUserUI();
        this.switchScreen('desktop-screen');
    }

    updateSystemUserUI() {
        document.getElementById('system-user-name').innerText = this.userData.displayName;
        document.getElementById('system-user-handle').innerText = `@${this.userData.username}`;

        const avatars = [document.getElementById('desktop-avatar'), document.getElementById('auth-avatar')];
        avatars.forEach(container => {
            if (container) {
                if (this.userData.photoUrl) {
                    container.innerHTML = `<img src="${this.userData.photoUrl}" alt="Avatar">`;
                } else {
                    container.innerHTML = `<i data-lucide="user"></i>`;
                }
            }
        });
        lucide.createIcons();
    }

    saveUserSettings(e) {
        e.preventDefault();
        if (!this.currentUserUid) return;

        const photoUrl = document.getElementById('set-photo').value.trim();
        const displayName = document.getElementById('set-displayname').value.trim();
        const username = document.getElementById('set-username').value.trim().replace('@', '');
        const recoveryEmail = document.getElementById('set-rec-email').value.trim();
        const statusMsg = document.getElementById('save-status-msg');

        const updatedData = { photoUrl, displayName, username, recoveryEmail };

        database.ref('users/' + this.currentUserUid).update(updatedData)
            .then(() => {
                this.userData.photoUrl = photoUrl;
                this.userData.displayName = displayName;
                this.userData.username = username;
                this.userData.recoveryEmail = recoveryEmail;

                this.saveSession();
                this.updateSystemUserUI();

                statusMsg.style.display = 'block';
                setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
            })
            .catch(err => alert("Erro ao salvar: " + err.message));
    }

    // GERENCIADOR DE JANELAS WINDOWS
    openApp(appId) {
        document.getElementById('start-menu').classList.add('hidden');

        if (this.openWindows[appId]) {
            this.bringToFront(this.openWindows[appId]);
            this.openWindows[appId].style.display = 'flex';
            return;
        }

        const win = document.createElement('div');
        win.className = 'window';
        win.id = `win-${appId}`;
        win.style.zIndex = ++this.highestZIndex;

        let title = "Aplicativo";
        let content = "";

        if (appId === 'settings') {
            title = "Configurações do Sistema";
            content = `
                <div class="settings-container">
                    <form class="settings-card" onsubmit="vortexOS.saveUserSettings(event)">
                        <h4><i data-lucide="user-check"></i> Perfil do Usuário</h4>
                        <div class="form-grid">
                            <div class="form-group full">
                                <label>URL da Foto de Perfil</label>
                                <input type="url" id="set-photo" value="${this.userData.photoUrl}" placeholder="https://exemplo.com/sua-foto.jpg">
                            </div>
                            <div class="form-group">
                                <label>Nome de Exibição</label>
                                <input type="text" id="set-displayname" value="${this.userData.displayName}" required>
                            </div>
                            <div class="form-group">
                                <label>Username (@)</label>
                                <input type="text" id="set-username" value="${this.userData.username}" required>
                            </div>
                            <div class="form-group full">
                                <label>E-mail de Recuperação</label>
                                <input type="email" id="set-rec-email" value="${this.userData.recoveryEmail}" placeholder="seuemail@backup.com">
                            </div>
                        </div>
                        <button type="submit" class="btn-primary" style="margin-top: 14px; width: 100%;">Salvar Perfil</button>
                        <p id="save-status-msg" class="save-status">✓ Alterações salvas com sucesso!</p>
                    </form>

                    <div class="settings-card">
                        <h4><i data-lucide="image"></i> Papel de Parede (Wallpapers)</h4>
                        
                        <div class="wp-category">TEMAS CLAROS (LIGHT)</div>
                        <div class="wallpaper-grid">
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #e0f2fe, #38bdf8);" onclick="vortexOS.setWallpaper('aero-light')">Aero Light</div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #fbcfe8, #f472b6);" onclick="vortexOS.setWallpaper('soft-pink')">Soft Pastels</div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #f1f5f9, #94a3b8);" onclick="vortexOS.setWallpaper('cloud-white')">Minimal Cloud</div>
                        </div>

                        <div class="wp-category">TEMAS ESCUROS (DARK)</div>
                        <div class="wallpaper-grid">
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #0e0720, #260e42);" onclick="vortexOS.setWallpaper('vortex-purple')">Vortex Neon</div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #0f172a, #1e293b);" onclick="vortexOS.setWallpaper('cyber-dark')">Cyber Dark</div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #022c22, #065f46);" onclick="vortexOS.setWallpaper('emerald-night')">Midnight Ocean</div>
                        </div>
                    </div>
                </div>`;
        } else if (appId === 'calculator') {
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
            content = `<textarea class="notepad-text" placeholder="Escreva suas anotações aqui..."></textarea>`;
        } else if (appId === 'files') {
            title = "Gerenciador de Arquivos";
            content = `
                <div class="file-list">
                    <div class="file-item"><i data-lucide="folder"></i><span>Documentos</span></div>
                    <div class="file-item"><i data-lucide="folder"></i><span>Imagens</span></div>
                    <div class="file-item"><i data-lucide="file-text"></i><span>vortex.log</span></div>
                </div>`;
        }

        win.innerHTML = `
            <div class="window-header">
                <div class="window-title"><i data-lucide="app-window"></i> ${title}</div>
                <div class="window-controls">
                    <button class="win-btn win-min" title="Minimizar" onclick="vortexOS.minimizeWindow('${appId}')"></button>
                    <button class="win-btn win-max" title="Maximizar" onclick="vortexOS.maximizeWindow('${appId}')"></button>
                    <button class="win-btn win-close" title="Fechar" onclick="vortexOS.closeWindow('${appId}')"></button>
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
        let isDragging = false, startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            if (win.classList.contains('maximized')) return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initialX = win.offsetLeft; initialY = win.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            win.style.left = `${initialX + (e.clientX - startX)}px`;
            win.style.top = `${initialY + (e.clientY - startY)}px`;
        });

        document.addEventListener('mouseup', () => isDragging = false);
    }

    bringToFront(win) { win.style.zIndex = ++this.highestZIndex; }

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
            const win = this.openWindows[appId];
            win.style.display = win.style.display === 'none' ? 'flex' : 'none';
        }
    }

    maximizeWindow(appId) {
        if (this.openWindows[appId]) {
            this.openWindows[appId].classList.toggle('maximized');
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
        if (val === 'C') screen.innerText = '0';
        else if (val === '=') {
            try { screen.innerText = eval(screen.innerText.replace(/[^0-9+\-*/.]/g, '')); }
            catch { screen.innerText = 'Erro'; }
        } else {
            screen.innerText = (screen.innerText === '0' || screen.innerText === 'Erro') ? val : screen.innerText + val;
        }
    }

    setWallpaper(theme) {
        const desktop = document.getElementById('desktop-screen');
        const wallpapers = {
            'aero-light': 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 100%)',
            'soft-pink': 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 100%)',
            'cloud-white': 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
            'vortex-purple': 'linear-gradient(135deg, #0e0720 0%, #260e42 50%, #080314 100%)',
            'cyber-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            'emerald-night': 'linear-gradient(135deg, #022c22 0%, #065f46 100%)'
        };

        if (wallpapers[theme]) {
            desktop.style.background = wallpapers[theme];
        }
    }

    shutdownSystem() {
        this.clearSession(); // Limpa login ao desligar/sair
        auth.signOut();
        Object.keys(this.openWindows).forEach(appId => this.closeWindow(appId));
        document.getElementById('start-menu').classList.add('hidden');
        this.switchScreen('boot-screen');
    }

    restartSystem() {
        Object.keys(this.openWindows).forEach(appId => this.closeWindow(appId));
        document.getElementById('start-menu').classList.add('hidden');
        this.switchScreen('boot-screen');
        setTimeout(() => {
            if (!this.checkSavedSession()) {
                this.switchScreen('auth-screen');
            }
        }, 1000);
    }
}

const vortexOS = new VortexOS();
