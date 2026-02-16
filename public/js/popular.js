// Popular/Trending Trades
const popularTrades = [
    { have: 'Bitcoin', want: 'Tesla Model 3', views: 15234 },
    { have: '1h code in USA', want: '1h code in India', views: 12890 },
    { have: 'iPhone 15', want: 'Samsung Galaxy', views: 9876 },
    { have: 'Rolex', want: 'Bitcoin', views: 8654 },
    { have: 'House', want: 'Bitcoin', views: 7654 },
    { have: 'Gold', want: 'Ethereum', views: 6543 },
    { have: 'Lamborghini', want: 'Bitcoin', views: 5432 },
    { have: 'Pizza', want: '1h code', views: 4321 }
];

function displayPopularTrades() {
    const container = document.getElementById('popularTrades');
    if (!container) return;
    
    container.innerHTML = `
        <div class="popular-title">🔥 Trending Now</div>
        <div class="popular-list">
            ${popularTrades.map((t, i) => `
                <div class="popular-item" onclick="loadTrade('${t.have}', '${t.want}')" style="animation-delay: ${i * 0.1}s">
                    <span class="popular-rank">#${i + 1}</span>
                    <span class="popular-trade">${t.have} → ${t.want}</span>
                    <span class="popular-views">${formatViews(t.views)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function formatViews(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
}

// Random trade generator
function randomTrade() {
    const items = [
        'Bitcoin', 'Ethereum', 'Tesla Model 3', 'iPhone 15', 'Rolex',
        '1h code in USA', '1h code in India', 'Pizza', 'Coffee',
        'Laptop', 'House', 'Gold', 'Diamond', 'Lamborghini',
        'Pasta', 'Sushi', 'Burger', 'Taco', 'Steak',
        'Netflix', 'Spotify', 'Gym membership', 'Massage', 'Haircut'
    ];
    
    const have = items[Math.floor(Math.random() * items.length)];
    let want = items[Math.floor(Math.random() * items.length)];
    while (want === have) want = items[Math.floor(Math.random() * items.length)];
    
    loadTrade(have, want);
}

document.addEventListener('DOMContentLoaded', () => {
    displayPopularTrades();
    
    // Add surprise me button
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = '🎲 Surprise Me';
    btn.onclick = randomTrade;
    btn.style.cssText = 'background: linear-gradient(135deg, var(--accent), var(--secondary)); color: var(--bg-dark); font-weight: bold;';
    
    const actionBtns = document.querySelector('.action-buttons');
    if (actionBtns) actionBtns.appendChild(btn);
});
