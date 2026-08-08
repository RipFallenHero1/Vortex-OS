// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE (NUVEM GLOBAL)
// ==========================================
// Substitua pelas credenciais do seu projeto Firebase Console
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Inicializa Firebase se configurado, senão usa modo fallback local
let database = null;
try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        console.log("⚡ Firebase Global Conectado com sucesso!");
    } else {
        console.warn("⚠️ Firebase não configurado. Usando armazenamento em memória local.");
    }
} catch (e) {
    console.error("Erro Firebase:", e);
}

// ==========================================
// 2. SISTEMA DE ECONOMIA
// ==========================================
let userBalance = parseFloat(localStorage.getItem('vortex_balance')) || 50.00;

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    localStorage.setItem('vortex_balance', userBalance);
}

function claimDailyReward() {
    const lastClaim = localStorage.getItem('vortex_last_daily');
    const today = new Date().toDateString();

    if (lastClaim === today) {
        alert("⏳ Você já resgatou sua recompensa diária hoje! Volte amanhã.");
        return;
    }

    const reward = 25.00;
    userBalance += reward;
    localStorage.setItem('vortex_last_daily', today);
    updateBalanceUI();
    alert(`🎁 Recompensa Diária Resgatada! Você ganhou R$ ${reward.toFixed(2)}`);
}

function simulateIncomingPix() {
    const senders = ["Carlos Silva", "Lucas Dev", "Ana Souza", "Mano King"];
    const randomSender = senders[Math.floor(Math.random() * senders.length)];
    const amount = (Math.random() * 50 + 5).toFixed(2);

    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido!\nRemetente: ${randomSender}\nValor: R$ ${amount}`);
}

// ==========================================
// 3. VORTEX ENGINE 2D (HIERARQUIA & MAPA)
// ==========================================
let hierarchyData = [];
let selectedItem = null;
let currentTileMode = 'block';

function addHierarchyItem(type) {
    const nameMap = {
        folder: "📁 Nova_Pasta",
        square: "🟦 Quadrado_2D",
        circle: "🔴 Círculo_2D",
        button: "🔘 Botão_UI",
        script: "📜 Script_Behavior.js"
    };

    const newItem = {
        id: Date.now(),
        type: type,
        name: `${nameMap[type]}_${hierarchyData.length + 1}`,
        code: type === 'script' ? '// Escreva o código aqui\nfunction update() {\n  // loop\n}' : ''
    };

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

    const inspector = document.getElementById('inspector-content');
    inspector.innerHTML = `
        <label>Nome:</label>
        <input type="text" value="${item.name}" onchange="updateItemName(this.value)" style="width:100%; padding:4px; margin-bottom:8px;">
        <p><strong>Tipo:</strong> ${item.type.toUpperCase()}</p>
        ${item.type === 'script' ? `
            <label>Código JS:</label>
            <textarea style="width:100%; height:120px; background:#111; color:#0f0; padding:4px;" onchange="updateScriptCode(this.value)">${item.code}</textarea>
        ` : ''}
        <button onclick="deleteSelectedItem()" style="margin-top:10px; background:#c0392b; color:#fff; border:none; padding:6px; width:100%; cursor:pointer;">Deletar Objeto</button>
    `;
}

function updateItemName(val) {
    if (selectedItem) {
        selectedItem.name = val;
        renderHierarchy();
    }
}

function updateScriptCode(val) {
    if (selectedItem && selectedItem.type === 'script') {
        selectedItem.code = val;
    }
}

function deleteSelectedItem() {
    if (!selectedItem) return;
    hierarchyData = hierarchyData.filter(i => i.id !== selectedItem.id);
    selectedItem = null;
    document.getElementById('inspector-content').innerHTML = '<p class="placeholder-text">Selecione um elemento.</p>';
    renderHierarchy();
}

// ---------------- MAP BUILDER 2D ----------------
function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    canvas.innerHTML = '';

    for (let i = 0; i < 300; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => {
            tile.className = 'tile';
            if (currentTileMode !== 'erase') {
                tile.classList.add(currentTileMode);
            }
        };
        canvas.appendChild(tile);
    }
}

function setTileMode(mode) {
    currentTileMode = mode;
}

// ==========================================
// 4. LOJA GLOBAL (FIREBASE INTEGRATION)
// ==========================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');

    if (tabName === 'store') {
        loadGlobalStore();
    }
}

function openPublishModal() { document.getElementById('publish-modal').style.display = 'flex'; }
function closePublishModal() { document.getElementById('publish-modal').style.display = 'none'; }

function publishAppToGlobalStore() {
    const title = document.getElementById('app-title-input').value.trim();
    const price = parseFloat(document.getElementById('app-price-input').value) || 0;

    if (!title) return alert("Digite um nome válido para o seu jogo!");

    const newApp = {
        title: title,
        price: price,
        author: "Dev_Vortex",
        downloads: 0
    };

    if (database) {
        // Envia para o Firebase Realtime Database
        database.ref('global_apps').push(newApp).then(() => {
            alert("🚀 Seu jogo foi publicado GLOBALMENTE no Firebase!");
            closePublishModal();
            loadGlobalStore();
        });
    } else {
        // Fallback Local
        let localApps = JSON.parse(localStorage.getItem('vortex_apps')) || [];
        localApps.push(newApp);
        localStorage.setItem('vortex_apps', JSON.stringify(localApps));
        alert("Seu jogo foi publicado localmente! (Configure o Firebase para publicar globalmente)");
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
            if (!data) {
                container.innerHTML = '<p>Nenhum jogo postado globalmente ainda. Seja o primeiro!</p>';
                return;
            }
            Object.keys(data).forEach(key => {
                renderAppCard(container, data[key], key);
            });
        });
    } else {
        let localApps = JSON.parse(localStorage.getItem('vortex_apps')) || [
            { title: "Vortex Platformer 2D", price: 15.00, author: "King", downloads: 42 }
        ];
        localApps.forEach((app, index) => renderAppCard(container, app, index));
    }
}

function renderAppCard(container, app, id) {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
        <h4>${app.title}</h4>
        <p><small>Criador: ${app.author}</small></p>
        <p><strong>Preço:</strong> R$ ${app.price.toFixed(2)}</p>
        <button class="btn btn-primary" onclick="buyApp('${app.title}', ${app.price})">🛒 Comprar Jogo</button>
    `;
    container.appendChild(card);
}

function buyApp(title, price) {
    if (userBalance >= price) {
        userBalance -= price;
        updateBalanceUI();
        alert(`🎉 Você comprou o jogo "${title}" com sucesso!`);
    } else {
        alert("❌ Saldo insuficiente! Resgate a recompensa diária ou receba um Pix para acumular dinheiro.");
    }
}

// INICIALIZAÇÃO
window.onload = () => {
    updateBalanceUI();
    initMapCanvas();
};
