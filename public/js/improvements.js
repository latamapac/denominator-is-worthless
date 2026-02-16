// ============================================
// IMPROVEMENTS - Top 10 Critical Features
// ============================================

// 1. Loading State
function showLoading() {
    document.getElementById('calculating').style.display = 'block';
    document.getElementById('resultPanel').style.display = 'none';
    document.getElementById('calculateBtn').disabled = true;
    document.getElementById('calculateBtn').textContent = '🧠 Analyzing...';
}

function hideLoading() {
    document.getElementById('calculating').style.display = 'none';
    document.getElementById('calculateBtn').disabled = false;
    document.getElementById('calculateBtn').textContent = '⚡ CALCULATE EXCHANGE';
}

// 2. Input Validation
function validateInputs(have, want) {
    if (!have || !want) {
        showError('Please enter both items to compare');
        return false;
    }
    if (have.length > 100 || want.length > 100) {
        showError('Item names too long (max 100 characters)');
        return false;
    }
    if (/[<>\"'%;()&+]/.test(have + want)) {
        showError('Invalid characters detected');
        return false;
    }
    return true;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
}

// 3. Copy Result
function copyResult() {
    const have = document.getElementById('haveItem').value;
    const want = document.getElementById('wantItem').value;
    const amount = document.getElementById('resultAmount').textContent;
    
    const text = `1 ${have} = ${amount} ${want} (via denominator-is-worthless.onrender.com)`;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
}

// 4. Share URL
function generateShareUrl() {
    const have = encodeURIComponent(document.getElementById('haveItem').value);
    const want = encodeURIComponent(document.getElementById('wantItem').value);
    const url = `${window.location.origin}/?have=${have}&want=${want}`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert('Share link copied to clipboard!');
    });
}

// 5. Swap Items
function swapItems() {
    const have = document.getElementById('haveItem');
    const want = document.getElementById('wantItem');
    const temp = have.value;
    have.value = want.value;
    want.value = temp;
    calculate();
}

// 6. Clear Inputs
function clearInputs() {
    document.getElementById('haveItem').value = '';
    document.getElementById('wantItem').value = '';
    document.getElementById('resultPanel').style.display = 'none';
    document.getElementById('haveItem').focus();
}

// 7. Recent Trades (Local Storage)
function saveRecentTrade(have, want, amount) {
    let recent = JSON.parse(localStorage.getItem('recentTrades') || '[]');
    recent.unshift({ have, want, amount, time: Date.now() });
    recent = recent.slice(0, 5);
    localStorage.setItem('recentTrades', JSON.stringify(recent));
    displayRecentTrades();
}

function displayRecentTrades() {
    const recent = JSON.parse(localStorage.getItem('recentTrades') || '[]');
    const container = document.getElementById('recentTrades');
    
    if (recent.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<div class="recent-title">Recent:</div>' + 
        recent.map(t => `
            <div class="recent-item" onclick="loadTrade('${t.have.replace(/'/g, "\\'")}', '${t.want.replace(/'/g, "\\'")}')">
                ${t.have.length > 15 ? t.have.substring(0,15)+'...' : t.have} → ${t.want.length > 15 ? t.want.substring(0,15)+'...' : t.want}
            </div>
        `).join('');
}

function loadTrade(have, want) {
    document.getElementById('haveItem').value = have;
    document.getElementById('wantItem').value = want;
    calculate();
}

// 8. Auto-complete suggestions
const suggestions = [
    'Bitcoin', 'Ethereum', 'Tesla Model 3', 'iPhone 15', 'Rolex',
    '1h code in USA', '1h code in India', 'pizza', 'coffee',
    'laptop', 'car', 'house', 'gold', 'diamond', 'camel'
];

function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    const list = document.createElement('div');
    list.className = 'autocomplete-list';
    list.id = inputId + '-autocomplete';
    input.parentNode.appendChild(list);
    
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        list.innerHTML = '';
        
        if (val.length < 2) return;
        
        const matches = suggestions.filter(s => 
            s.toLowerCase().includes(val) && s.toLowerCase() !== val
        ).slice(0, 5);
        
        matches.forEach(match => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.textContent = match;
            div.onclick = () => {
                input.value = match;
                list.innerHTML = '';
                calculate();
            };
            list.appendChild(div);
        });
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== input) list.innerHTML = '';
    });
}

// 9. Parse URL Params
function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const have = params.get('have');
    const want = params.get('want');
    
    if (have) document.getElementById('haveItem').value = decodeURIComponent(have);
    if (want) document.getElementById('wantItem').value = decodeURIComponent(want);
    
    if (have && want) calculate();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    displayRecentTrades();
    setupAutocomplete('haveItem');
    setupAutocomplete('wantItem');
    loadFromUrl();
});
