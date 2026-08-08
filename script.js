// ==========================================
// 1. FIREBASE COM SUAS CONFIGURAÇÕES REAIS
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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("🟢 Firebase Conectado com Sucesso!");

// ==========================================
// 2. SISTEMA OPERACIONAL (JANELAS E TASKBAR)
// ==========================================
let highestZIndex = 100;
let openApps = new Set();

function toggleStartMenu() {
    document.getElementById('start-menu').classList.toggle('active');
}

function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    
    win.classList.add('active');
    bringToFront(win);
    
    if (!openApps.has(id)) {
        openApps.add(id);
        updateTaskbar();
    }
}

function closeWindow(id) {
    document.getElementById(id).classList.remove('active');
    openApps.delete(id);
    updateTaskbar();
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function updateTaskbar() {
    const taskbar = document.getElementById('taskbar-apps');
    taskbar.innerHTML = '';
    const names = {
        'win-engine': '⚡ Engine',
        'win-store': '🛒 Loja',
        'win-files': '📁 Arquivos',
        'win-terminal': '💻 Terminal',
        'win-calc': '🧮 Calc'
    };
    
    openApps.forEach(id => {
        const btn = document.createElement('button');
        btn.className = 'task-app active';
        btn.innerText = names[id];
        btn.onclick = () => {
            const win = document.getElementById(id);
            bringToFront(win);
        };
        taskbar.appendChild(btn);
    });
}

// SISTEMA DE ARRASTAR JANELAS (DRAG & DROP)
function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);
    
    let pos1 = 0, pos2 = 0, pos3 = e.clientX, pos4 = e.clientY;
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        win.style.top = (win.offsetTop - pos2) + "px";
        win.style.left = (win.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// RELÓGIO
setInterval(() => {
    document.getElementById('os-clock').innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

// ==========================================
// 3. SISTEMA DE ECONOMIA GLOBAL
// ==========================================
let userBalance = parseFloat(localStorage.getItem('vortex_balance')) || 0.00;

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = userBalance.toFixed(2);
    localStorage.setItem('vortex_balance', userBalance);
}

function claimDailyReward() {
    userBalance += 25.00;
    updateBalanceUI();
    alert("🎁 R$ 25,00 adicionados à sua carteira!");
}

function simulateIncomingPix() {
    // Simulando seu parceiro enviando dinheiro pro projeto!
    const senders = ["Mano King", "Jogador Anônimo", "Dev Parceiro"];
    const sender = senders[Math.floor(Math.random() * senders.length)];
    const amount = (Math.random() * 50 + 10).toFixed(2);
    
    userBalance += parseFloat(amount);
    updateBalanceUI();
    alert(`💸 Pix Recebido!\nDe: ${sender}\nValor: R$ ${amount}`);
}

// ==========================================
// 4. VORTEX ENGINE 2D
// ==========================================
let hierarchyData = [];
let currentTileMode = 'block';

function addHierarchyItem(type) {
    const nameMap = { folder: "📁 Pasta", square: "🟦 Quadrado", circle: "🔴 Círculo", script: "📜 Script" };
    hierarchyData.push({ id: Date.now(), name: `${nameMap[type]}_${hierarchyData.length + 1}` });
    renderHierarchy();
}

function renderHierarchy() {
    const tree = document.getElementById('hierarchy-tree');
    tree.innerHTML = '';
    hierarchyData.forEach(item => {
        const li = document.createElement('li');
        li.className = 'tree-item';
        li.innerText = item.name;
        tree.appendChild(li);
    });
}

function initMapCanvas() {
    const canvas = document.getElementById('canvas-2d');
    canvas.innerHTML = '';
    for (let i = 0; i < 240; i++) {
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
// 5. LOJA GLOBAL (FIREBASE REALTIME)
// ==========================================
function openPublishModal() { document.getElementById('publish-modal').style.display = 'flex'; }
function closePublishModal() { document.getElementById('publish-modal').style.display = 'none'; }

function publishAppToGlobalStore() {
    const title = document.getElementById('app-title-input').value;
    const price = parseFloat(document.getElementById('app-price-input').value) || 0;
    if (!title) return;

    database.ref('global_apps').push({ title, price, author: "Vortex Staff" }).then(() => {
        alert("🚀 Jogo salvo GLOBALMENTE no seu Firebase!");
        closePublishModal();
        loadGlobalStore();
    });
}

function loadGlobalStore() {
    const container = document.getElementById('global-apps-list');
    database.ref('global_apps').on('value', (snapshot) => {
        container.innerHTML = '';
        const data = snapshot.val();
        if (!data) return container.innerHTML = '<p>Loja vazia. Publique o primeiro jogo!</p>';
        
        Object.keys(data).forEach(key => {
            const app = data[key];
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h4>${app.title}</h4>
                <p><small>Por: ${app.author}</small></p>
                <p style="color:#22c55e;"><strong>R$ ${app.price.toFixed(2)}</strong></p>
                <button class="btn btn-primary" onclick="buyApp('${app.title}', ${app.price})">Comprar</button>
            `;
            container.appendChild(card);
        });
    });
}

function buyApp(title, price) {
    if (userBalance >= price) {
        userBalance -= price;
        updateBalanceUI();
        alert(`🎉 Você baixou "${title}"!`);
    } else {
        alert("❌ Saldo insuficiente!");
    }
}

// ==========================================
// 6. APPS EXTRAS (TERMINAL & CALC)
// ==========================================
function calcInput(val) {
    document.getElementById('calc-display').value += val;
}
function calcEval() {
    try {
        const res = eval(document.getElementById('calc-display').value);
        document.getElementById('calc-display').value = res;
    } catch(e) {
        document.getElementById('calc-display').value = "Erro";
    }
}

function handleTerminal(e) {
    if (e.key === 'Enter') {
        const input = e.target;
        const output = document.getElementById('terminal-output');
        output.innerHTML += `C:\\Users\\Admin> ${input.value}<br>`;
        if (input.value.toLowerCase() === 'clear') output.innerHTML = '';
        else output.innerHTML += `Comando não reconhecido.<br>`;
        input.value = '';
    }
}

// INIT
window.onload = () => {
    updateBalanceUI();
    initMapCanvas();
    loadGlobalStore();
};
