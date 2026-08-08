// ==========================================
// 🌀 VORTEX OS 9.5 - SISTEMA DE AUTENTICAÇÃO
// ==========================================

// COPIE AQUI O SEU CONFIG EXATO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
  authDomain: "vortex-os-971fc.firebaseapp.com",
  databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
  projectId: "vortex-os-971fc",
  storageBucket: "vortex-os-971fc.firebasestorage.app",
  messagingSenderId: "128698321803",
  appId: "1:128698321803:web:fa6ad595d268980019bd8e",
  measurementId: "G-387R68F77S"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let isLoginMode = true; // Alterna entre Login e Cadastro

// UI GERADA VIA JS
document.body.innerHTML = `
    <div id="auth-box" style="width: 320px; background: #1a0b2e; padding: 30px; border-radius: 15px; color: #fff; text-align: center; border: 1px solid #7c3aed;">
        <h2 id="auth-title">Vortex OS 9.5</h2>
        <input type="email" id="email" placeholder="E-mail" style="width:100%; padding:10px; margin:5px 0; background:#000; color:#fff; border:1px solid #444;">
        <input type="text" id="username" placeholder="Nome de Usuário" style="width:100%; padding:10px; margin:5px 0; background:#000; color:#fff; border:1px solid #444; display:none;">
        <input type="password" id="pin" placeholder="PIN (Senha)" style="width:100%; padding:10px; margin:5px 0; background:#000; color:#fff; border:1px solid #444;">
        
        <button onclick="processAuth()" id="btn-main" style="width:100%; padding:10px; background:#7c3aed; color:#fff; border:none; cursor:pointer; margin-top:10px;">ENTRAR</button>
        <p onclick="toggleMode()" id="btn-toggle" style="margin-top:15px; cursor:pointer; font-size:0.8rem; color:#a78bfa;">Não tem conta? Cadastrar-se</p>
        <p onclick="recoverAccount()" style="margin-top:5px; cursor:pointer; font-size:0.7rem; color:#666;">Esqueci minha senha</p>
        <p id="msg" style="margin-top:15px; font-size:0.8rem;"></p>
    </div>
`;

function toggleMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? "Vortex OS 9.5" : "Novo Usuário";
    document.getElementById('btn-main').innerText = isLoginMode ? "ENTRAR" : "CADASTRAR";
    document.getElementById('btn-toggle').innerText = isLoginMode ? "Não tem conta? Cadastrar-se" : "Já tem conta? Entrar";
    document.getElementById('username').style.display = isLoginMode ? "none" : "block";
    document.getElementById('msg').innerText = "";
}

function processAuth() {
    const email = document.getElementById('email').value;
    const pin = document.getElementById('pin').value;
    const username = document.getElementById('username').value;
    const msg = document.getElementById('msg');

    if (isLoginMode) {
        // LOGIN
        auth.signInWithEmailAndPassword(email, pin)
            .then(() => alert("Bem-vindo de volta!"))
            .catch(e => msg.innerText = e.message);
    } else {
        // CADASTRO
        if (!username) return msg.innerText = "Digite um Username!";
        auth.createUserWithEmailAndPassword(email, pin)
            .then(userCredential => {
                // Salva o username no banco de dados
                db.ref('users/' + userCredential.user.uid).set({ username: username });
                alert("Cadastro feito com sucesso!");
            })
            .catch(e => msg.innerText = e.message);
    }
}

function recoverAccount() {
    const email = document.getElementById('email').value;
    if(!email) return alert("Digite seu e-mail para recuperar");
    auth.sendPasswordResetEmail(email)
        .then(() => alert("E-mail de recuperação enviado!"))
        .catch(e => alert(e.message));
}
