// ==========================================
// 🌀 VORTEX OS - VERSÃO 9.5 (CORREÇÃO FINAL)
// ==========================================
const OS_VERSION = "9.5";

// 1. FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// 2. ESTILOS V9.5
(function initV95Styles() {
    document.title = `Vortex OS ${OS_VERSION}`;
    const style = document.createElement('style');
    style.innerHTML = `
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body, html { width: 100vw; height: 100vh; overflow: hidden; font-family: 'Segoe UI', sans-serif; background: #0b001a; color: #fff; }
        #login-screen { position: absolute; top:0; left:0; width:100vw; height:100vh; background: linear-gradient(135deg, #0d001a 0%, #1f0038 100%); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .login-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15); padding: 30px; border-radius: 12px; width: 320px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .login-card h2 { margin-bottom: 20px; color: #a78bfa; font-weight: 600; }
        .login-card input { width: 100%; padding: 10px; margin-bottom: 12px; background: rgba(0,0,0,0.4); border: 1px solid #4c1d95; border-radius: 6px; color: #fff; outline: none; }
        .login-card button { width: 100%; padding: 10px; background: #7c3aed; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer; }
        .login-card button:hover { background: #6d28d9; }
        #desktop { width: 100vw; height: calc(100vh - 45px); padding: 20px; display: flex; flex-direction: column; gap: 20px; align-content: flex-start; flex-wrap: wrap;}
        .desktop-icon { width: 75px; text-align: center; cursor: pointer; font-size: 0.8rem; }
        .desktop-icon .icon-img { width: 50px; height: 50px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 5px auto; }
        #taskbar { position: absolute; bottom: 0; left: 0; width: 100vw; height: 45px; background: rgba(15, 10, 30, 0.85); display: flex; align-items: center; padding: 0 10px; border-top: 1px solid rgba(255,255,255,0.1); }
        .start-btn { background: #7c3aed; border: none; padding: 6px 14px; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer; }
    `;
    document.head.appendChild(style);
})();

// 3. GERAR INTERFACE DO ZERO
document.addEventListener("DOMContentLoaded", () => {
    // ISSO AQUI DESTRÓI A INTERFACE ANTIGA!
    document.body.innerHTML = ''; 

    // Cria Login
    const loginDiv = document.createElement("div");
    loginDiv.id = "login-screen";
    loginDiv.innerHTML = `
        <div class="login-card">
            <h2>🌀 Vortex OS ${OS_VERSION}</h2>
            <input type="email" id="login-email" placeholder="Seu E-mail">
            <input type="password" id="login-password" placeholder="Sua Senha">
            <button onclick="handleLogin()">ENTRAR / CADASTRAR</button>
            <p id="login-msg" style="color: #f87171; margin-top: 10px; font-size: 0.8rem; min-height: 1.2em;"></p>
        </div>
    `;
    document.body.appendChild(loginDiv);

    // Cria Desktop
    const desktopDiv = document.createElement("div");
    desktopDiv.id = "desktop";
    desktopDiv.innerHTML = `
        <div class="desktop-icon" onclick="alert('Engine V9.5 em breve no próximo clique!')">
            <div class="icon-img">⚡</div>
            <span>Engine</span>
        </div>
    `;
    document.body.appendChild(desktopDiv);

    // Cria Barra de Tarefas
    const taskbarDiv = document.createElement("div");
    taskbarDiv.id = "taskbar";
    taskbarDiv.innerHTML = `<button class="start-btn">🌀 Vortex v${OS_VERSION}</button>`;
    document.body.appendChild(taskbarDiv);
});

// 4. LÓGICA DO BOTÃO DE LOGIN
window.handleLogin = function() {
    const email = document.getElementById("login-email").value.trim();
    const pass = document.getElementById("login-password").value.trim();
    const msg = document.getElementById("login-msg");

    if (!email || !pass) {
        msg.innerText = "Preencha e-mail e senha!";
        return;
    }

    msg.style.color = "#a78bfa";
    msg.innerText = "Carregando...";

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => unlockSystem())
        .catch(error => {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                msg.innerText = "Criando conta...";
                auth.createUserWithEmailAndPassword(email, pass)
                    .then(() => unlockSystem())
                    .catch(err => { msg.style.color = "#f87171"; msg.innerText = "Erro ao criar: " + err.message; });
            } else {
                msg.style.color = "#f87171";
                msg.innerText = error.message;
            }
        });
};

function unlockSystem() {
    document.getElementById("login-screen").style.display = "none";
}
