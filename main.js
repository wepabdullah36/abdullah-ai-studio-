const API_URL = window.location.origin;
let currentChatId = null;
let token = localStorage.getItem('token');

// Redirect protection check
if (!token && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html')) {
    // Standard secure fallbacks can navigate here seamlessly
}

// System Theme Handlers
function toggleTheme() {
    const htmlElement = document.documentElement;
    const currentTheme = htmlElement.getAttribute('data-theme');
    const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', targetTheme);
}

// Load System Conversational State
async function loadConversations() {
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/api/chats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const chats = await res.json();
        const historyContainer = document.getElementById('chatHistory');
        historyContainer.innerHTML = '';

        chats.forEach(chat => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <span><i class="fa-regular fa-message"></i> ${chat.title}</span>
                <i class="fa-solid fa-trash-can" style="color:var(--text-muted); font-size:12px;" onclick="deleteChat(event, '${chat._id}')"></i>
            `;
            el.onclick = () => switchChat(chat._id, chat.messages, chat.title);
            historyContainer.appendChild(el);
        });
    } catch (err) {
        console.error('Error fetching conversations:', err);
    }
}

// Initializing New Clean Sessions
async function createNewChat() {
    try {
        const res = await fetch(`${API_URL}/api/chats/new`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const newChat = await res.json();
        currentChatId = newChat._id;
        document.getElementById('chatArea').innerHTML = '';
        document.getElementById('currentChatTitle').innerText = "New Studio Session";
        loadConversations();
    } catch (err) {
        console.error(err);
    }
}

function switchChat(id, messages, title) {
    currentChatId = id;
    document.getElementById('currentChatTitle').innerText = title;
    const chatArea = document.getElementById('chatArea');
    chatArea.innerHTML = '';
    
    messages.forEach(msg => {
        appendMessageElement(msg.sender, msg.text);
    });
}

// Process user outbound message sequences
async function sendMessage() {
    const inputField = document.getElementById('userInput');
    const text = inputField.value.trim();
    if (!text) return;

    if (!currentChatId) {
        await createNewChat();
    }

    appendMessageElement('user', text);
    inputField.value = '';

    // Show Custom Animated Processing View
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message ai glass typing-indicator-active';
    typingIndicator.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
    document.getElementById('chatArea').appendChild(typingIndicator);

    try {
        const res = await fetch(`${API_URL}/api/chats/${currentChatId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        const update = await res.json();
        
        // Clear typing visual
        typingIndicator.remove();
        
        // Append last returned dynamic item
        const systemReply = update.messages[update.messages.length - 1];
        appendMessageElement('ai', systemReply.text);
    } catch (err) {
        typingIndicator.remove();
        console.error(err);
    }
}

function appendMessageElement(sender, text) {
    const chatArea = document.getElementById('chatArea');
    const container = document.createElement('div');
    container.className = `message ${sender} ${sender === 'ai' ? 'glass' : ''}`;
    
    container.innerText = text;

    // Standard Utility Actions attached onto items safely
    if(sender === 'ai') {
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
        copyBtn.style = "position:absolute; bottom:2px; right:5px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:11px;";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
            setTimeout(() => copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`, 2000);
        };
        container.appendChild(copyBtn);
    }

    chatArea.appendChild(container);
    chatArea.scrollTop = chatArea.scrollHeight;
}

async function deleteChat(event, id) {
    event.stopPropagation();
    try {
        await fetch(`${API_URL}/api/chats/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (currentChatId === id) {
            currentChatId = null;
            document.getElementById('chatArea').innerHTML = '';
        }
        loadConversations();
    } catch (err) {
        console.error(err);
    }
}

// Bootstrap Application Startup Sequence
window.onload = () => {
    loadConversations();
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser) {
        document.getElementById('userInfo').innerHTML = `<i class="fa-solid fa-user-shield"></i> ${localUser.username} (${localUser.tier})`;
    }
};