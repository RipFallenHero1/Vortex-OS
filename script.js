// ==========================================
// 🌀 VORTEX OS - SCRIPT PRINCIPAL v11.03
// ==========================================

const OS_VERSION = "11.03";

// ---- FIREBASE CONFIG ----
const firebaseConfig = {
    apiKey: "AIzaSyCAC6tnKdPC6X2SwYWiMGZQI0GxwDq5SeA",
    authDomain: "vortex-os-971fc.firebaseapp.com",
    databaseURL: "https://vortex-os-971fc-default-rtdb.firebaseio.com",
    projectId: "vortex-os-971fc"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ESTADO GLOBAL DO SISTEMA
let currentUser = null;
let highestZIndex = 100;
let openApps = new Set();
let clockInterval = null;

// ESTADO DO VORTEX MESSAGER
let activeDiscordTab = 'dms'; // 'dms' ou 'server'
let activeChatTarget = null;  // friendKey ou { serverId, channelId }
let pendingAttachment = null; // { type: 'image'|'video'|'file', dataUrl, name }

// ==========================================
// NOTIFICAÇÕES & UTILITÁRIOS
// ==========================================
function vortexNotify(message, kind = 'info', duration = 3600) {
    const host = document.getElementById('vortex-notifications') || (() => {
        const el = document.createElement('div');
        el.id = 'vortex-notifications';
        document.body.appendChild(el);
        return el;
    })();
    const item = document.createElement('div');
    item.className = 'vortex-toast ' + kind;
    const title = kind === 'error' ? 'Vortex Error' : kind === 'success' ? 'Concluído' : 'Vortex OS';
    item.innerHTML = `<div class="vortex-toast-title">${escapeHTML(title)}</div><div class="vortex-toast-text">${escapeHTML(message)}</div>`;
    host.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 220); }, duration);
}

function escapeHTML(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==========================================
// 1. AUTENTICAÇÃO E PERFIL
// ==========================================
function isVortexAdmin() {
    if (!currentUser) return false;
    // Permite admin se o flag isAdmin for true, se a role for admin ou se for o usuário principal
    return currentUser.isAdmin === true || currentUser.role === 'admin' || currentUser.key === 'admin' || currentUser.key === 'vortex';
}

function loginUser() {
    const usernameInput = document.getElementById('auth-username');
    const pinInput = document.getElementById('auth-pin');
    const emailInput = document.getElementById('auth-email');

    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    const email = emailInput.value.trim();

    if (!username) { vortexNotify('⚠️ Digite um nome de usuário.'); return; }
    if (!/^\d{4}$/.test(pin)) { vortexNotify('⚠️ O PIN deve ter exatamente 4 dígitos numéricos.'); return; }

    const userKey = username.toLowerCase().replace(/[.#$/\[\]]/g, '_');
    const userRef = database.ref('users/' + userKey);

    userRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.pin === pin) {
                startSession(userKey, data);
            } else {
                vortexNotify('❌ PIN incorreto para o usuário "' + username + '".', 'error');
            }
        } else {
            const newUser = {
                displayName: username,
                pin: pin,
                email: email || '',
                balance: 100,
                isAdmin: userKey === 'admin' || userKey === 'vortex',
                createdAt: Date.now()
            };
            userRef.set(newUser).then(() => {
                startSession(userKey, newUser);
                vortexNotify('✅ Conta criada com sucesso! Bem-vindo, ' + username + '.', 'success');
            });
        }
    });
}

function startSession(userKey, data) {
    currentUser = Object.assign({ key: userKey }, data);
    localStorage.setItem('vortex_current_user', userKey);

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('shutdown-screen').style.display = 'none';

    const displayName = data.displayName || userKey;
    document.getElementById('start-username').innerText = displayName;
    document.getElementById('start-email').innerText = data.email || 'online';
    document.getElementById('settings-user').innerText = displayName;
    document.getElementById('settings-email').innerText = data.email || '-';

    // Atualiza dados no Messager
    const msgUser = document.getElementById('msg-user-name');
    if (msgUser) msgUser.innerText = displayName;
    const msgAvatar = document.getElementById('msg-user-avatar');
    if (msgAvatar) msgAvatar.innerText = displayName.charAt(0).toUpperCase();

    startClock();
    
    // Verificação e Exibição do Admin Panel
    if (isVortexAdmin()) {
        const adminDesktop = document.getElementById('desktop-admin-icon');
        if (adminDesktop) adminDesktop.style.display = 'flex';
        const adminStart = document.getElementById('start-admin-btn');
        if (adminStart) adminStart.style.display = 'block';
        loadAdminUsersList();
    }

    // Inicializa o Messager
    initVortexMessager();
}

function tryAutoLogin() {
    const savedKey = localStorage.getItem('vortex_current_user');
    if (!savedKey) return;

    database.ref('users/' + savedKey).once('value').then(snapshot => {
        if (snapshot.exists()) {
            startSession(savedKey, snapshot.val());
        } else {
            localStorage.removeItem('vortex_current_user');
        }
    });
}

window.addEventListener('DOMContentLoaded', tryAutoLogin);

// ==========================================
// 2. PAINEL DE ADMIN CORRIGIDO
// ==========================================
function loadAdminUsersList() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    database.ref('users').on('value', snapshot => {
        container.innerHTML = '';
        if (!snapshot.exists()) return;

        snapshot.forEach(child => {
            const userKey = child.key;
            const u = child.val();
            const row = document.createElement('div');
            row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#1e1b26; padding:10px 14px; border-radius:8px; margin-bottom:8px;";
            
            const isAdmin = u.isAdmin === true || u.role === 'admin';
            
            row.innerHTML = `
                <div>
                    <strong>${escapeHTML(u.displayName || userKey)}</strong>
                    <small style="display:block; color:#a78bfa;">${u.email || 'sem e-mail'}</small>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <label style="font-size:12px; cursor:pointer;">
                        <input type="checkbox" ${isAdmin ? 'checked' : ''} onchange="toggleUserAdminStatus('${userKey}', this.checked)"> Admin
                    </label>
                </div>
            `;
            container.appendChild(row);
        });
    });
}

function toggleUserAdminStatus(userKey, grantAdmin) {
    database.ref('users/' + userKey + '/isAdmin').set(grantAdmin).then(() => {
        vortexNotify(`Status de Admin de ${userKey} atualizado para: ${grantAdmin}`, 'success');
    });
}

// ==========================================
// 3. GERENCIADOR DE JANELAS E SISTEMA
// ==========================================
function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'flex';
    bringToFront(win);
    openApps.add(id);

    if (id === 'win-messenger') {
        initVortexMessager();
    }
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (win) win.style.display = 'none';
    openApps.delete(id);
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

function dragWindow(e, winId) {
    const win = document.getElementById(winId);
    bringToFront(win);
    let pos3 = e.clientX, pos4 = e.clientY;
    document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
    document.onmousemove = (ev) => {
        ev.preventDefault();
        const pos1 = pos3 - ev.clientX;
        const pos2 = pos4 - ev.clientY;
        pos3 = ev.clientX; pos4 = ev.clientY;
        win.style.top = (win.offsetTop - pos2) + "px";
        win.style.left = (win.offsetLeft - pos1) + "px";
    };
}

function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    const update = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const clockEl = document.getElementById('os-clock');
        if (clockEl) clockEl.innerText = `${h}:${m}`;
    };
    update();
    clockInterval = setInterval(update, 30000);
}

function toggleStartMenu() {
    const menu = document.getElementById('start-menu');
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function closeStartMenuIfOpen() {
    const menu = document.getElementById('start-menu');
    if (menu) menu.style.display = 'none';
}

function shutdownPC() {
    document.getElementById('shutdown-screen').style.display = 'flex';
}

function powerOn() {
    document.getElementById('shutdown-screen').style.display = 'none';
}

function setTheme(theme) {
    const bgMap = {
        'purple': 'linear-gradient(135deg, #2e0854, #12002b, #4a154b)',
        'dark-purple': 'linear-gradient(135deg, #0f172a, #1e1b4b, #311042)',
        'cyber-blue': 'linear-gradient(135deg, #0284c7, #0f172a, #1e1b4b)',
        'sunset': 'linear-gradient(135deg, #831843, #312e81, #0f172a)'
    };
    document.body.style.background = bgMap[theme] || bgMap['purple'];
}

// ==========================================
// 4. VORTEX MESSAGER (DISCORD ENGINE)
// ==========================================
function initVortexMessager() {
    if (!currentUser) return;
    loadFriendsList();
    loadServersList();
}

function switchDiscordTab(tab) {
    activeDiscordTab = tab;
    const dmsPanel = document.getElementById('discord-dms-panel');
    const channelsPanel = document.getElementById('discord-channels-panel');
    const sidebarTitle = document.getElementById('discord-sidebar-title');

    document.querySelectorAll('.guild-btn').forEach(b => b.classList.remove('active'));

    if (tab === 'dms') {
        document.getElementById('btn-dm-home').classList.add('active');
        dmsPanel.style.display = 'block';
        channelsPanel.style.display = 'none';
        sidebarTitle.innerHTML = '<span>Mensagens Diretas</span>';
    } else {
        dmsPanel.style.display = 'none';
        channelsPanel.style.display = 'block';
    }
}

// --- SISTEMA DE AMIGOS ---
function addFriendAction() {
    const input = document.getElementById('add-friend-input');
    const targetNick = input.value.trim();
    if (!targetNick) return;

    const targetKey = targetNick.toLowerCase().replace(/[.#$/\[\]]/g, '_');
    if (targetKey === currentUser.key) {
        vortexNotify('Você não pode adicionar a si mesmo!', 'error');
        return;
    }

    database.ref('users/' + targetKey).once('value').then(snap => {
        if (snap.exists()) {
            database.ref(`users/${currentUser.key}/friends/${targetKey}`).set(true);
            database.ref(`users/${targetKey}/friends/${currentUser.key}`).set(true);
            vortexNotify(`Amigo ${snap.val().displayName || targetNick} adicionado!`, 'success');
            input.value = '';
        } else {
            vortexNotify('Usuário não encontrado no Vortex OS.', 'error');
        }
    });
}

function loadFriendsList() {
    const listEl = document.getElementById('discord-friends-list');
    if (!listEl) return;

    database.ref(`users/${currentUser.key}/friends`).on('value', snap => {
        listEl.innerHTML = '';
        if (!snap.exists()) {
            listEl.innerHTML = '<small style="color:#80848e; padding:6px;">Nenhum amigo adicionado.</small>';
            return;
        }

        snap.forEach(child => {
            const friendKey = child.key;
            database.ref('users/' + friendKey).once('value').then(uSnap => {
                if (!uSnap.exists()) return;
                const u = uSnap.val();
                const item = document.createElement('div');
                item.className = 'discord-list-item';
                item.onclick = () => openDirectMessage(friendKey, u.displayName || friendKey);
                item.innerHTML = `
                    <div class="avatar-sm">${(u.displayName || friendKey).charAt(0).toUpperCase()}</div>
                    <span>${escapeHTML(u.displayName || friendKey)}</span>
                `;
                listEl.appendChild(item);
            });
        });
    });
}

function openDirectMessage(friendKey, friendName) {
    switchDiscordTab('dms');
    activeChatTarget = { type: 'dm', friendKey, friendName };

    document.getElementById('chat-target-symbol').innerText = '@';
    document.getElementById('chat-target-name').innerText = friendName;
    document.getElementById('chat-target-desc').innerText = 'Conversa Direta';

    const chatId = [currentUser.key, friendKey].sort().join('_chat_');
    listenToChatMessages(`messenger/dms/${chatId}/messages`);
}

// --- SISTEMA DE SERVIDORES ---
function openCreateServerModal() {
    document.getElementById('modal-server').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function createNewServerAction() {
    const nameInput = document.getElementById('server-name-input');
    const serverName = nameInput.value.trim();
    if (!serverName) return;

    const newServerRef = database.ref('messenger/servers').push();
    const serverData = {
        id: newServerRef.key,
        name: serverName,
        owner: currentUser.key,
        members: { [currentUser.key]: true },
        channels: {
            geral: { name: 'geral' },
            midia: { name: 'mídia' }
        }
    };

    newServerRef.set(serverData).then(() => {
        closeModal('modal-server');
        nameInput.value = '';
        vortexNotify('Servidor criado com sucesso!', 'success');
    });
}

function joinServerAction() {
    const idInput = document.getElementById('server-id-input');
    const serverId = idInput.value.trim();
    if (!serverId) return;

    database.ref('messenger/servers/' + serverId).once('value').then(snap => {
        if (snap.exists()) {
            database.ref(`messenger/servers/${serverId}/members/${currentUser.key}`).set(true);
            closeModal('modal-server');
            idInput.value = '';
            vortexNotify('Você entrou no servidor!', 'success');
        } else {
            vortexNotify('Servidor não encontrado!', 'error');
        }
    });
}

function loadServersList() {
    const container = document.getElementById('discord-servers-list');
    if (!container) return;

    database.ref('messenger/servers').on('value', snap => {
        container.innerHTML = '';
        if (!snap.exists()) return;

        snap.forEach(child => {
            const server = child.val();
            if (server.members && server.members[currentUser.key]) {
                const btn = document.createElement('button');
                btn.className = 'guild-btn';
                btn.title = server.name;
                btn.innerHTML = `<span style="font-weight:bold;">${server.name.substring(0, 2).toUpperCase()}</span>`;
                btn.onclick = () => selectServer(server);
                container.appendChild(btn);
            }
        });
    });
}

function selectServer(server) {
    switchDiscordTab('server');
    document.getElementById('discord-sidebar-title').innerHTML = `<span>${escapeHTML(server.name)}</span>`;

    const channelsList = document.getElementById('discord-channels-list');
    channelsList.innerHTML = '';

    const channels = server.channels || {};
    Object.keys(channels).forEach(cId => {
        const channel = channels[cId];
        const item = document.createElement('div');
        item.className = 'discord-list-item';
        item.innerHTML = `# ${escapeHTML(channel.name || cId)}`;
        item.onclick = () => openChannelChat(server, cId, channel.name || cId);
        channelsList.appendChild(item);
    });

    // Abre o primeiro canal por padrão
    const firstChan = Object.keys(channels)[0];
    if (firstChan) openChannelChat(server, firstChan, channels[firstChan].name || firstChan);
}

function openChannelChat(server, channelId, channelName) {
    activeChatTarget = { type: 'server', serverId: server.id, channelId, channelName };

    document.getElementById('chat-target-symbol').innerText = '#';
    document.getElementById('chat-target-name').innerText = channelName;
    document.getElementById('chat-target-desc').innerText = `ID Servidor: ${server.id}`;

    listenToChatMessages(`messenger/servers/${server.id}/channels/${channelId}/messages`);
}

function promptCreateChannel() {
    if (!activeChatTarget || activeChatTarget.type !== 'server') return;
    const name = prompt('Nome do novo canal:');
    if (!name) return;

    const chanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    database.ref(`messenger/servers/${activeChatTarget.serverId}/channels/${chanKey}`).set({ name });
}

// --- MENSAGENS E ANEXOS DE MÍDIA ---
function listenToChatMessages(dbPath) {
    const container = document.getElementById('discord-messages-container');
    container.innerHTML = '';

    database.ref(dbPath).off();
    database.ref(dbPath).limitToLast(50).on('value', snap => {
        container.innerHTML = '';
        if (!snap.exists()) {
            container.innerHTML = '<div class="discord-welcome-msg"><p>Nenhuma mensagem aqui ainda. Comece a conversar!</p></div>';
            return;
        }

        snap.forEach(child => {
            const msg = child.val();
            const row = document.createElement('div');
            row.className = 'discord-msg-row';

            let mediaHTML = '';
            if (msg.attachment) {
                if (msg.attachment.type === 'image') {
                    mediaHTML = `<br><img src="${msg.attachment.dataUrl}" class="chat-attachment-img">`;
                } else if (msg.attachment.type === 'video') {
                    mediaHTML = `<br><video src="${msg.attachment.dataUrl}" controls class="chat-attachment-video"></video>`;
                } else {
                    mediaHTML = `<br><a href="${msg.attachment.dataUrl}" download="${msg.attachment.name}" class="chat-attachment-file">📎 Baixar ${escapeHTML(msg.attachment.name)}</a>`;
                }
            }

            const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            row.innerHTML = `
                <div class="avatar">${escapeHTML(msg.authorName || 'U').charAt(0).toUpperCase()}</div>
                <div class="msg-content-box">
                    <div class="msg-author-header">
                        <strong>${escapeHTML(msg.authorName || 'Usuário')}</strong>
                        <small>${timeStr}</small>
                    </div>
                    <div class="msg-text">${escapeHTML(msg.text || '')} ${mediaHTML}</div>
                </div>
            `;
            container.appendChild(row);
        });
        container.scrollTop = container.scrollHeight;
    });
}

function handleFileAttachment(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        let type = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';

        pendingAttachment = { type, dataUrl, name: file.name };
        vortexNotify(`Anexo "${file.name}" pronto para envio.`, 'info');
    };
    reader.readAsDataURL(file);
}

function handleDiscordKeyDown(event) {
    if (event.key === 'Enter') sendDiscordMessage();
}

function sendDiscordMessage() {
    const input = document.getElementById('discord-msg-input');
    const text = input.value.trim();

    if (!text && !pendingAttachment) return;
    if (!activeChatTarget) {
        vortexNotify('Selecione uma conversa para enviar mensagem.', 'error');
        return;
    }

    let targetPath = '';
    if (activeChatTarget.type === 'dm') {
        const chatId = [currentUser.key, activeChatTarget.friendKey].sort().join('_chat_');
        targetPath = `messenger/dms/${chatId}/messages`;
    } else {
        targetPath = `messenger/servers/${activeChatTarget.serverId}/channels/${activeChatTarget.channelId}/messages`;
    }

    const newMsg = {
        authorKey: currentUser.key,
        authorName: currentUser.displayName || currentUser.key,
        text: text,
        attachment: pendingAttachment || null,
        timestamp: Date.now()
    };

    database.ref(targetPath).push().then(() => {
        input.value = '';
        pendingAttachment = null;
        document.getElementById('msg-file-input').value = '';
    });
}

// ==========================================
// 5. CALCULADORA & TERMINAL
// ==========================================
function handleTerminal(event) {
    if (event.key !== 'Enter') return;
    const input = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    const cmd = input.value.trim();
    input.value = '';

    output.innerHTML += `<br>&gt; ${escapeHTML(cmd)}`;
    if (cmd === 'help') output.innerHTML += '<br>Comandos: help, clear, whoami, shutdown';
    else if (cmd === 'clear') output.innerHTML = '';
    else if (cmd === 'whoami') output.innerHTML += `<br>${currentUser ? currentUser.displayName : 'Deslogado'}`;
    else if (cmd === 'shutdown') shutdownPC();
    else output.innerHTML += `<br>Comando não reconhecido: ${escapeHTML(cmd)}`;

    output.scrollTop = output.scrollHeight;
}

function calcInput(val) { document.getElementById('calc-display').value += val; }
function calcClear() { document.getElementById('calc-display').value = ''; }
function calcEval() {
    try {
        document.getElementById('calc-display').value = eval(document.getElementById('calc-display').value);
    } catch (e) {
        document.getElementById('calc-display').value = 'Erro';
    }
}
