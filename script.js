// ==========================================
// 1. GERENCIAMENTO DE JANELAS DO SO
// ==========================================
function openWindow(id) {
    const win = document.getElementById(id);
    if (win) {
        win.classList.add('active');
        // Trás a janela para frente
        document.querySelectorAll('.window').forEach(w => w.style.zIndex = 10);
        win.style.zIndex = 20;
    }
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.classList.remove('active');
}

function toggleWindow(id) {
    const win = document.getElementById(id);
    if (win.classList.contains('active')) {
        closeWindow(id);
    } else {
        openWindow(id);
    }
}

// Relógio do SO
function updateClock() {
    const now = new Date();
    document.getElementById('os-clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

// ==========================================
// 2. FIREBASE & ECONOMIA GLOBAL
// ==========================================
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


let database = null;
try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        document.getElementById('firebase-status').innerText = "🟢 Conectado Globalmente";
    } else {
        document.getElementById('firebase-status').innerText = "🟡 Modo Off-line (Local)";
    }
} catch (e) {
    document.getElementById('firebase-status').innerText = "🔴 Erro de Conexão";
}

let userBalance = parseFloat(localStorage.getItem('vortex_balance')) || 50.00;

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    localStorage.setItem('vortex_balance', userBalance);
}

function claimDailyReward() {
    const lastClaim = localStorage.getItem('vortex_last_daily');
    const today = new Date().toDateString();

    if (lastClaim === today) {
        alert("⏳ Você já resgatou sua recompensa diária hoje!");
        return;
    }

    userBalance += 25.00;
    localStorage.setItem('vortex_last_daily', today);
    updateBalanceUI();
    alert("🎁 Você recebeu R$ 25.00 de recompensa diária!");
}

function simulateIncomingPix() {
    const senders = ["Carlos Silva", "Mano King", "Lucas Dev"];
    const sender = senders[Math.floor(Math.random() * senders.length)];
    const amount = (Math.random() * 40 + 10).toFixed(2);

    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido de ${sender}!\nValor: R$ ${amount}`);
}

// ==========================================
// 3. VORTEX ENGINE 2D (DENTRO DO SO)
// ==========================================
let hierarchyData = [];
let selectedItem = null;
let currentTileMode = 'block';

function addHierarchyItem(type) {
    const nameMap = { folder: "📁 Pasta", square: "🟦 Quadrado", circle: "🔴 Círculo", button: "🔘 Botão", script: "📜 Script.js" };
    const newItem = { id: Date.now(), type: type, name: `${nameMap[type]}_${hierarchyData.length + 1}` };
    hierarchyData.push(newItem);
    renderHierarchy();
}

function renderHierarchy() {
    const tree = document.getElementById('hierarchy-tree');
    tree.innerHTML = '';
    hierarchyData.forEach(item => {
        const li = document.createElement('li');
        li.className = `tree-item ${selectedItem && selectedItem.id === item.id ? 'selected' : ''}`;
        li.innerText = item.name;
        li.onclick = () => selectHierarchyItem(item);
        tree.appendChild(li);
    });
}

function selectHierarchyItem(item) {
    selectedItem = item;
    renderHierarchy();
    document.getElementById('inspector-content').innerHTML = `
        <label>Nome:</label>
        <input type="text" value="${item.name}" onchange="updateItemName(this.value)" style="width:100%; padding:4px; margin-top:4px; background:#0f172a; color:#fff; border:1px solid #334155;">
    `;
}

function updateItemName(val) {
    if (selectedItem) { selectedItem.name = val; renderHierarchy(); }
}

function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    canvas.innerHTML = '';
    for (let i = 0; i < 150; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => {
            tile.className = 'tile';
            if (currentTileMode !== 'erase') tile.classList.add(currentTileMode);
        };
        canvas.appendChild(tile);
    }
}

function setTileMode(mode) { currentTileMode = mode; }

// ==========================================
// 4. LOJA GLOBAL DE APPS DENTRO DO SO
// ==========================================
function openPublishModal() { document.getElementById('publish-modal').style.display = 'flex'; }
function closePublishModal() { document.getElementById('publish-modal').style.display = 'none'; }

function publishAppToGlobalStore() {
    const title = document.getElementById('app-title-input').value.trim();
    const price = parseFloat(document.getElementById('app-price-input').value) || 0;

    if (!title) return alert("Digite um nome!");

    const newApp = { title, price, author: "Dev_Vortex" };

    if (database) {
        database.ref('global_apps').push(newApp).then(() => {
            alert("🚀 Publicado na Nuvem Firebase!");
            closePublishModal();
            loadGlobalStore();
        });
    } else {
        let localApps = JSON.parse(localStorage.getItem('vortex_apps')) || [];
        localApps.push(newApp);
        localStorage.setItem('vortex_apps', JSON.stringify(localApps));
        alert("Publicado localmente!");
        closePublishModal();
        loadGlobalStore();
    }
}

function loadGlobalStore() {
    const container = document.getElementById('global-apps-list');
    container.innerHTML = '';

    if (database) {
        database.ref('global_apps').once('value', (snapshot) => {
            container.innerHTML = '';
            const data = snapshot.val();
            if (!data) return container.innerHTML = '<p>Nenhum app global ainda.</p>';
            Object.keys(data).forEach(key => renderAppCard(container, data[key]));
        });
    } else {
        let localApps = JSON.parse(localStorage.getItem('vortex_apps')) || [{ title: "Vortex Platformer", price: 15.00, author: "King" }];
        localApps.forEach(app => renderAppCard(container, app));
    }
}

function renderAppCard(container, app) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <h4>${app.title}</h4>
        <p><small>Por: ${app.author}</small></p>
        <p><strong>R$ ${app.price.toFixed(2)}</strong></p>
        <button class="btn btn-primary" onclick="buyApp('${app.title}', ${app.price})">🛒 Comprar</button>
    `;
    container.appendChild(card);
}

function buyApp(title, price) {
    if (userBalance >= price) {
        userBalance -= price;
        updateBalanceUI();
        alert(`🎉 Comprou "${title}" com sucesso!`);
    } else {
        alert("❌ Saldo insuficiente!");
    }
}

function resetOS() {
    localStorage.clear();
    location.reload();
}

// INICIALIZAÇÃO
window.onload = () => {
    updateBalanceUI();
    updateClock();
    initMapCanvas();
    loadGlobalStore();
};
