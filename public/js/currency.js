// Currency Support
const currencies = {
    USD: { symbol: '$', rate: 1, name: 'USD' },
    EUR: { symbol: '€', rate: 0.92, name: 'EUR' },
    GBP: { symbol: '£', rate: 0.79, name: 'GBP' },
    JPY: { symbol: '¥', rate: 150, name: 'JPY' },
    CAD: { symbol: 'C$', rate: 1.35, name: 'CAD' },
    AUD: { symbol: 'A$', rate: 1.52, name: 'AUD' },
    CHF: { symbol: 'Fr', rate: 0.88, name: 'CHF' },
    CNY: { symbol: '¥', rate: 7.2, name: 'CNY' },
    INR: { symbol: '₹', rate: 83, name: 'INR' },
    BRL: { symbol: 'R$', rate: 4.95, name: 'BRL' }
};

let currentCurrency = localStorage.getItem('currency') || 'USD';

function setCurrency(code) {
    currentCurrency = code;
    localStorage.setItem('currency', code);
    updateCurrencyDisplay();
    calculate(); // Recalculate with new currency
}

function updateCurrencyDisplay() {
    const selector = document.getElementById('currencySelector');
    if (selector) selector.value = currentCurrency;
}

function formatPrice(usd) {
    const curr = currencies[currentCurrency];
    const converted = usd * curr.rate;
    return `${curr.symbol}${converted.toFixed(2)}`;
}

// Add currency selector to UI
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    if (header) {
        const selector = document.createElement('select');
        selector.id = 'currencySelector';
        selector.className = 'currency-selector';
        selector.style.cssText = 'position:absolute;top:20px;right:20px;padding:8px 12px;background:var(--bg-card);border:1px solid rgba(0,240,255,0.3);border-radius:6px;color:var(--primary);font-family:Orbitron,sans-serif;cursor:pointer;';
        
        Object.keys(currencies).forEach(code => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${code} (${currencies[code].symbol})`;
            if (code === currentCurrency) opt.selected = true;
            selector.appendChild(opt);
        });
        
        selector.onchange = (e) => setCurrency(e.target.value);
        header.appendChild(selector);
    }
});
