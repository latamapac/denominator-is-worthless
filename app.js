// ===== DENOMINATOR IS WORTHLESS v3.0 - Full Stack Barter Platform =====

const API_URL = window.location.origin;
let socket = null;
let currentUser = null;
let state = {
    haveItem: '',
    haveAmount: 1,
    wantItem: '',
    wantAmount: 0,
    isCalculating: false,
    aiAnalysis: null
};

// DOM Elements
const elements = {};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    initSocket();
    checkAuth();
    initCanvas();
    setupEventListeners();
    loadInitialData();
});

function cacheElements() {
    elements.authModal = document.getElementById('authModal');
    elements.authTabs = document.querySelectorAll('.auth-tab');
    elements.authForms = document.querySelectorAll('.auth-form');
    elements.userMenu = document.getElementById('userMenu');
    elements.loginBtn = document.getElementById('loginBtn');
    elements.userDropdown = document.getElementById('userDropdown');
    elements.username = document.getElementById('username');
    elements.barterModal = document.getElementById('barterModal');
    elements.feed = document.getElementById('barterFeed');
    elements.createBarterBtn = document.getElementById('createBarterBtn');
    elements.closeBarterModal = document.getElementById('closeBarterModal');
    elements.submitBarter = document.getElementById('submitBarter');
    elements.haveInput = document.getElementById('haveInput');
    elements.wantInput = document.getElementById('wantInput');
    elements.haveAmount = document.getElementById('haveAmount');
    elements.wantAmount = document.getElementById('wantAmount');
    elements.aiConfidence = document.getElementById('aiConfidence');
    elements.calculationStatus = document.getElementById('calculationStatus');
    elements.resultPanel = document.getElementById('resultPanel');
    elements.leaderboard = document.getElementById('leaderboard');
    elements.notificationArea = document.getElementById('notificationArea');
}

// ===== SOCKET.IO =====
function initSocket() {
    const token = localStorage.getItem('token');
    
    socket = io({
        auth: token ? { token } : {},
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✓ Socket connected');
        showNotification('Connected to live feed', 'success');
    });

    socket.on('disconnect', () => {
        console.log('✗ Socket disconnected');
        showNotification('Disconnected from live feed', 'warning');
    });

    socket.on('new_barter', (barter) => {
        addBarterToFeed(barter, true);
        showNotification(`New barter: ${barter.offer.item} → ${barter.request.item}`, 'info');
        incrementStat('activeBarters');
    });

    socket.on('barter_completed', ({ barter }) => {
        updateBarterStatus(barter._id, 'completed');
        showNotification(`Barter completed: ${barter.offer.item} ↔ ${barter.request.item}`, 'success');
    });

    socket.on('barter_negotiation', ({ barterId, negotiation }) => {
        if (state.currentBarterId === barterId) {
            addNegotiationMessage(negotiation);
        }
        showNotification('New negotiation message', 'info');
    });

    socket.on('user_online', ({ username }) => {
        console.log(`${username} is online`);
    });

    socket.on('user_typing', ({ username }) => {
        showTypingIndicator(username);
    });
}

// ===== AUTHENTICATION =====
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        updateAuthUI(null);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.user) {
            currentUser = data.user;
            updateAuthUI(currentUser);
            socket.auth = { token };
            socket.connect();
        } else {
            localStorage.removeItem('token');
            updateAuthUI(null);
        }
    } catch (error) {
        console.error('Auth check error:', error);
        updateAuthUI(null);
    }
}

function updateAuthUI(user) {
    if (user) {
        elements.loginBtn.style.display = 'none';
        elements.userMenu.style.display = 'flex';
        elements.username.textContent = user.username;
        elements.createBarterBtn.style.display = 'flex';
        
        // Update stats
        if (user.stats) {
            document.getElementById('userBarters').textContent = user.stats.totalBarters || 0;
            document.getElementById('userRep').textContent = user.stats.reputation || 100;
        }
    } else {
        elements.loginBtn.style.display = 'flex';
        elements.userMenu.style.display = 'none';
        elements.createBarterBtn.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const username = form.querySelector('[name="username"]').value;
    const password = form.querySelector('[name="password"]').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(currentUser);
            closeAuthModal();
            showNotification(`Welcome back, ${data.user.username}!`, 'success');
            
            // Reconnect socket with new token
            socket.auth = { token: data.token };
            socket.disconnect().connect();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Login error', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const form = e.target;
    const username = form.querySelector('[name="username"]').value;
    const email = form.querySelector('[name="email"]').value;
    const password = form.querySelector('[name="password"]').value;
    const confirmPassword = form.querySelector('[name="confirmPassword"]').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI(currentUser);
            closeAuthModal();
            showNotification('Welcome to the revolution!', 'success');
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showNotification('Registration error', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI(null);
    socket.disconnect();
    showNotification('Logged out', 'info');
}

// ===== BARTER CREATION =====
async function calculateBarter() {
    const haveItem = elements.haveInput.value.trim();
    const wantItem = elements.wantInput.value.trim();
    const haveAmount = parseFloat(elements.haveAmount.value) || 1;

    if (!haveItem || !wantItem) {
        elements.calculationStatus.textContent = 'Enter both items to calculate';
        return;
    }

    state.isCalculating = true;
    elements.calculationStatus.innerHTML = '<span class="pulse">⚡</span> AI analyzing value vectors...';
    elements.resultPanel.classList.add('calculating');

    try {
        const response = await fetch(`${API_URL}/api/valuate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ haveItem, haveAmount, wantItem })
        });

        const data = await response.json();

        if (data.success) {
            state.wantAmount = data.amount;
            state.aiAnalysis = data;
            
            // Update UI
            animateNumber(elements.wantAmount, data.amount);
            elements.aiConfidence.textContent = `${Math.round(data.confidence)}% confidence`;
            elements.aiConfidence.className = `confidence-badge ${data.confidence > 80 ? 'high' : data.confidence > 60 ? 'medium' : 'low'}`;
            
            elements.calculationStatus.innerHTML = `
                <div class="analysis-result">
                    <p>${data.analysis}</p>
                    <div class="fairness-meter">
                        <span>Fairness:</span>
                        <div class="meter">
                            <div class="meter-fill" style="width: ${data.fairness}%; background: ${getFairnessColor(data.fairness)}"></div>
                        </div>
                        <span>${Math.round(data.fairness)}%</span>
                    </div>
                </div>
            `;
            
            elements.resultPanel.classList.remove('calculating');
            elements.resultPanel.classList.add('has-result');
        }
    } catch (error) {
        elements.calculationStatus.textContent = 'Calculation failed. Try again.';
        elements.resultPanel.classList.remove('calculating');
    }

    state.isCalculating = false;
}

function getFairnessColor(fairness) {
    if (fairness >= 70) return '#00ff88';
    if (fairness >= 40) return '#ffbe0b';
    return '#ff006e';
}

async function submitBarter() {
    if (!currentUser) {
        openAuthModal();
        return;
    }

    const token = localStorage.getItem('token');
    
    const barterData = {
        offer: {
            item: elements.haveInput.value,
            amount: parseFloat(elements.haveAmount.value) || 1,
            estimatedValue: state.aiAnalysis?.factors?.utility * 10 || 100
        },
        request: {
            item: elements.wantInput.value,
            amount: parseFloat(elements.wantAmount.value) || 1,
            estimatedValue: state.aiAnalysis?.factors?.scarcity * 10 || 100
        },
        aiAnalysis: state.aiAnalysis
    };

    try {
        const response = await fetch(`${API_URL}/api/barters/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(barterData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Barter created successfully!', 'success');
            closeBarterModal();
            addBarterToFeed(data.barter, true);
            resetBarterForm();
        } else {
            showNotification(data.error || 'Failed to create barter', 'error');
        }
    } catch (error) {
        showNotification('Error creating barter', 'error');
    }
}

// ===== FEED =====
async function loadFeed() {
    try {
        const response = await fetch(`${API_URL}/api/barters/feed`);
        const data = await response.json();

        if (data.success) {
            elements.feed.innerHTML = '';
            data.barters.forEach(barter => addBarterToFeed(barter));
        }
    } catch (error) {
        console.error('Feed load error:', error);
    }
}

function addBarterToFeed(barter, prepend = false) {
    const card = document.createElement('div');
    card.className = 'barter-card';
    card.dataset.id = barter._id;
    
    const isFair = barter.aiAnalysis?.fairness > 60;
    const timeAgo = getTimeAgo(barter.createdAt);
    
    card.innerHTML = `
        <div class="barter-header">
            <div class="trader">
                <div class="trader-avatar">${(barter.initiator?.username || 'A')[0].toUpperCase()}</div>
                <span class="trader-name">${barter.initiator?.username || 'Anonymous'}</span>
                <span class="reputation">★ ${barter.initiator?.stats?.reputation || 100}</span>
            </div>
            <span class="time">${timeAgo}</span>
        </div>
        
        <div class="barter-exchange">
            <div class="offer">
                <div class="item-image" style="background-image: url('${generateItemImage(barter.offer.item)}')"></div>
                <div class="item-details">
                    <span class="amount">${formatNumber(barter.offer.amount)}</span>
                    <span class="item-name">${barter.offer.item}</span>
                </div>
            </div>
            
            <div class="exchange-arrow">
                <span>→</span>
                <div class="fairness-badge ${isFair ? 'fair' : 'unfair'}">${Math.round(barter.aiAnalysis?.fairness || 50)}%</div>
            </div>
            
            <div class="request">
                <div class="item-image" style="background-image: url('${generateItemImage(barter.request.item)}')"></div>
                <div class="item-details">
                    <span class="amount">${formatNumber(barter.request.amount)}</span>
                    <span class="item-name">${barter.request.item}</span>
                </div>
            </div>
        </div>
        
        <div class="barter-footer">
            <div class="ai-analysis">
                <span class="ai-icon">🧠</span>
                <span>${Math.round(barter.aiAnalysis?.confidence || 80)}% confidence</span>
            </div>
            <button class="btn-action" onclick="openBarterDetail('${barter._id}')">
                View Details
            </button>
        </div>
    `;

    if (prepend) {
        elements.feed.insertBefore(card, elements.feed.firstChild);
    } else {
        elements.feed.appendChild(card);
    }
}

function generateItemImage(item) {
    const prompt = encodeURIComponent(`product photo ${item} cyberpunk style dark background`);
    return `https://image.pollinations.ai/prompt/${prompt}?width=200&height=200&nologo=true`;
}

// ===== LEADERBOARD =====
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/api/users/leaderboard`);
        const data = await response.json();

        if (data.success) {
            elements.leaderboard.innerHTML = data.leaderboard.map((user, index) => `
                <div class="leaderboard-item">
                    <span class="rank">${index + 1}</span>
                    <div class="user">
                        <div class="avatar">${user.username[0].toUpperCase()}</div>
                        <span class="name">${user.username}</span>
                    </div>
                    <span class="value">${formatNumber(user.stats?.totalValueTraded || 0)} pts</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Leaderboard error:', error);
    }
}

// ===== STATS =====
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('totalBarters').textContent = data.stats.totalBarters.toLocaleString();
            document.getElementById('totalTrades').textContent = data.stats.totalTrades.toLocaleString();
            document.getElementById('totalUsers').textContent = data.stats.totalUsers.toLocaleString();
            document.getElementById('activeBarters').textContent = data.stats.activeBarters.toLocaleString();
        }
    } catch (error) {
        console.error('Stats error:', error);
    }
}

function incrementStat(id) {
    const el = document.getElementById(id);
    if (el) {
        const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
        el.textContent = (current + 1).toLocaleString();
    }
}

// ===== UI HELPERS =====
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    elements.notificationArea.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function animateNumber(element, target) {
    const start = parseFloat(element.value) || 0;
    const duration = 600;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * easeOut;
        
        element.value = Number.isInteger(target) ? Math.round(current) : current.toFixed(2);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Number.isInteger(num) ? num : num.toFixed(1);
}

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Auth
    elements.loginBtn?.addEventListener('click', openAuthModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Auth tabs
    elements.authTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            elements.authTabs.forEach(t => t.classList.remove('active'));
            elements.authForms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${target}Form`).classList.add('active');
        });
    });
    
    // Auth forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    
    // Barter modal
    elements.createBarterBtn?.addEventListener('click', openBarterModal);
    elements.closeBarterModal?.addEventListener('click', closeBarterModal);
    elements.submitBarter?.addEventListener('click', submitBarter);
    
    // Calculation
    let calcTimeout;
    elements.haveInput?.addEventListener('input', () => {
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(calculateBarter, 500);
    });
    elements.wantInput?.addEventListener('input', () => {
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(calculateBarter, 500);
    });
    elements.haveAmount?.addEventListener('input', () => {
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(calculateBarter, 500);
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) closeAuthModal();
        if (e.target === elements.barterModal) closeBarterModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            closeBarterModal();
        }
        if (e.key === 'n' && e.ctrlKey && currentUser) {
            e.preventDefault();
            openBarterModal();
        }
    });
}

function openAuthModal() {
    elements.authModal.style.display = 'flex';
    setTimeout(() => elements.authModal.classList.add('show'), 10);
}

function closeAuthModal() {
    elements.authModal.classList.remove('show');
    setTimeout(() => elements.authModal.style.display = 'none', 300);
}

function openBarterModal() {
    if (!currentUser) {
        openAuthModal();
        return;
    }
    elements.barterModal.style.display = 'flex';
    setTimeout(() => elements.barterModal.classList.add('show'), 10);
    elements.haveInput?.focus();
}

function closeBarterModal() {
    elements.barterModal.classList.remove('show');
    setTimeout(() => elements.barterModal.style.display = 'none', 300);
}

function resetBarterForm() {
    elements.haveInput.value = '';
    elements.wantInput.value = '';
    elements.haveAmount.value = 1;
    elements.wantAmount.value = '';
    elements.calculationStatus.textContent = 'Enter items to calculate exchange rate';
    elements.resultPanel.classList.remove('has-result');
}

function loadInitialData() {
    loadFeed();
    loadLeaderboard();
    loadStats();
}

// ===== CANVAS BACKGROUND =====
function initCanvas() {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    const particleCount = 60;
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    
    function createParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 0.5;
        
        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 200) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.globalAlpha = (1 - dist / 200) * 0.3;
                    ctx.stroke();
                }
            }
        }
        
        // Draw particles
        for (const p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha})`;
            ctx.globalAlpha = 1;
            ctx.fill();
            
            p.x += p.vx;
            p.y += p.vy;
            
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        }
        
        requestAnimationFrame(draw);
    }
    
    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
    
    resize();
    createParticles();
    draw();
}

// Global functions for HTML onclick handlers
window.openBarterDetail = function(id) {
    console.log('Open barter detail:', id);
    // Implement detail view
};

window.openAuthModal = openAuthModal;
window.logout = logout;
