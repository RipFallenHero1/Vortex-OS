// Configuração Firebase
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

        // Ligar PC
        document.getElementById('power-btn').addEventListener('click', () => {
            this.switchScreen('auth-screen');
        });

        // Alternadores Cadastro/Login por PIN
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

        // Menu Iniciar (ABRE APENAS AO CLICAR NO ÍCONE)
        const startBtn = document.getElementById('start-btn');
        const startMenu = document.getElementById('start-menu');

        startBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique de propagar pro documento
            startMenu.classList.toggle('hidden');
        });

        // Fechar Menu Iniciar ao clicar fora dele
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
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('clock').innerText = time;
        };
        update();
        setInterval(update, 5000);
    }

    // AUTENTICAÇÃO
    initAuth() {
        const loginForm = document.getElementById('pin-login-form');
        const regForm = document.getElementById('pin-register-form');
        const googleBtn = document.getElementById('google-btn');
        const errorMsg = document.getElementById('auth-error');

        // Login PIN
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.toLowerCase().trim();
            const pin = document.getElementById('login-pin').value;

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
                        this.loadAndApplyUserData(data);
                    } else {
                        errorMsg.innerText = "PIN incorreto!";
                    }
                })
                .catch(err => errorMsg.innerText = "Erro ao validar PIN: " + err.message);
        });

        // Cadastro PIN
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const username = document.getElementById('reg-username').value.replace('@', '');
            const email = document.getElementById('reg-email').value.toLowerCase().trim();
            const pin = document.getElementById('reg-pin').value;

            if (pin.length < 4) {
                errorMsg.innerText = "O PIN precisa ter no mínimo 4 dígitos!";
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
                this.loadAndApplyUserData(initialData);
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
                        this.loadAndApplyUserData(data);
                    });
                })
                .catch(err => {
                    if (err.code === 'auth/unauthorized-domain') {
                        errorMsg.innerText = "Erro: Adicione seu domínio no Firebase Console (Authorized Domains).";
                    } else {
                        errorMsg.innerText = "Erro Google: " + err.message;
                    }
                });
        });
    }

    loadAndApplyUserData(data) {
        this.userData = {
            displayName: data.displayName || data.username || "Usuário",
            username: data.username || "usuario",
            recoveryEmail: data.recoveryEmail || "",
            photoUrl: data.photoUrl || "",
            email: data.email || ""
        };

        this.updateSystemUserUI();
        this.switchScreen('desktop-screen');
    }

    updateSystemUserUI() {
        document.getElementById('system-user-name').innerText = this.userData.displayName;
        document.getElementById('system-user-handle').innerText = `@${this.userData.username}`;

        const avatarContainers = [
            document.getElementById('desktop-avatar'),
            document.getElementById('auth-avatar')
        ];

        avatarContainers.forEach(container => {
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

    // SALVAR CONFIGURAÇÕES DO PERFIL (V1.1)
    saveUserSettings(e) {
        e.preventDefault();
        if (!this.currentUserUid) return;

        const photoUrl = document.getElementById('set-photo').value.trim();
        const displayName = document.getElementById('set-displayname').value.trim();
        const username = document.getElementById('set-username').value.trim().replace('@', '');
        const recoveryEmail = document.getElementById('set-rec-email').value.trim();
        const statusMsg = document.getElementById('save-status-msg');

        const updatedData = {
            photoUrl: photoUrl,
            displayName: displayName,
            username: username,
            recoveryEmail: recoveryEmail
        };

        database.ref('users/' + this.currentUserUid).update(updatedData)
            .then(() => {
                this.userData.photoUrl = photoUrl;
                this.userData.displayName = displayName;
                this.userData.username = username;
                this.userData.recoveryEmail = recoveryEmail;

                this.updateSystemUserUI();

                statusMsg.style.display = 'block';
                setTimeout(() => { statusMsg.style.display = 'none'; }, 3000);
            })
            .catch(err => alert("Erro ao salvar: " + err.message));
    }

    // GERENCIADOR DE JANELAS
    openApp(appId) {
        document.getElementById('start-menu').classList.add('hidden');

        if (this.openWindows[appId]) {
            this.bringToFront(this.openWindows[appId]);
            if (this.openWindows[appId].style.display === 'none') {
                this.openWindows[appId].style.display = 'flex';
            }
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
                        <button type="submit" class="btn-primary" style="margin-top: 14px; width: 100%;">Salvar Alterações</button>
                        <p id="save-status-msg" class="save-status">✓ Perfil atualizado com sucesso!</p>
                    </form>

                    <div class="settings-card">
                        <h4><i data-lucide="palette"></i> Aparência</h4>
                        <div class="wallpaper-options">
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #0e0720, #260e42);" onclick="vortexOS.setWallpaper('default')"></div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #09090b, #27272a);" onclick="vortexOS.setWallpaper('dark')"></div>
                            <div class="wp-thumb" style="background: linear-gradient(135deg, #4c1d95, #c084fc);" onclick="vortexOS.setWallpaper('neon')"></div>
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
                    <div class="file-item"><i data-lucide="file-text"></i><span>vortex_log.txt</span></div>
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
        let isDragging = false;
        let startX, startY, initialX, initialY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = win.offsetLeft;
            initialY = win.offsetTop;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            win.style.left = `${initialX + dx}px`;
            win.style.top = `${initialY + dy}px`;
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
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
            const win = this.openWindows[appId];
            win.style.display = win.style.display === 'none' ? 'flex' : 'none';
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
            desktop.style.background = 'linear-gradient(135deg, #0e0720 0%, #260e42 50%, #080314 100%)';
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
        }, 1000);
    }
}

const vortexOS = new VortexOS();
