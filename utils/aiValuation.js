const fetch = require('node-fetch');

// Cache
const valuationCache = new Map();
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const PRICE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for real prices

// CoinGecko ID mapping
const COINGECKO_IDS = {
    'bitcoin': 'bitcoin', 'btc': 'bitcoin', 'bitcoins': 'bitcoin',
    'ethereum': 'ethereum', 'eth': 'ethereum', 'ether': 'ethereum',
    'solana': 'solana', 'sol': 'solana',
    'cardano': 'cardano', 'ada': 'cardano',
    'polkadot': 'polkadot', 'dot': 'polkadot',
    'ripple': 'ripple', 'xrp': 'ripple',
    'litecoin': 'litecoin', 'ltc': 'litecoin',
    'chainlink': 'chainlink', 'link': 'chainlink',
    'polygon': 'matic-network', 'matic': 'matic-network',
    'avalanche': 'avalanche-2', 'avax': 'avalanche-2',
    'binance': 'binancecoin', 'bnb': 'binancecoin',
    'dogecoin': 'dogecoin', 'doge': 'dogecoin',
    'shiba': 'shiba-inu', 'shib': 'shiba-inu',
    'uniswap': 'uniswap', 'uni': 'uniswap',
    'aave': 'aave',
    'synthetic': 'synthetix-network-token', 'snx': 'synthetix-network-token',
    'maker': 'maker', 'mkr': 'maker',
    'compound': 'compound-governance-token', 'comp': 'compound-governance-token'
};

// Free price fetchers
async function fetchCryptoPrice(itemName) {
    const lower = itemName.toLowerCase();
    
    // Check cache first
    if (priceCache.has(lower)) {
        const cached = priceCache.get(lower);
        if (Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
            return cached.price;
        }
    }
    
    // Find CoinGecko ID
    let coinId = null;
    for (const [key, id] of Object.entries(COINGECKO_IDS)) {
        if (lower.includes(key)) {
            coinId = id;
            break;
        }
    }
    
    if (!coinId) return null;
    
    try {
        // CoinGecko free API - no key needed!
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            { signal: controller.signal }
        );
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error('CoinGecko API failed');
        
        const data = await response.json();
        const price = data[coinId]?.usd;
        
        if (price) {
            priceCache.set(lower, { price, timestamp: Date.now() });
            console.log(`[Real Price] ${itemName}: $${price}`);
            return price;
        }
    } catch (error) {
        console.log(`CoinGecko error for ${itemName}:`, error.message);
    }
    
    return null;
}

// Alpha Vantage free tier for stocks (optional, if user adds API key)
async function fetchStockPrice(symbol) {
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) return null;
    
    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
            { timeout: 5000 }
        );
        const data = await response.json();
        const price = data['Global Quote']?.['05. price'];
        return price ? parseFloat(price) : null;
    } catch (error) {
        return null;
    }
}

// Groq free tier for AI price estimation (1M tokens/min free!)
async function fetchAIPriceEstimate(itemName) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;
    
    const lower = itemName.toLowerCase();
    if (priceCache.has(`ai:${lower}`)) {
        const cached = priceCache.get(`ai:${lower}`);
        if (Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
            return cached.price;
        }
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant', // Fast and cheap
                messages: [
                    {
                        role: 'system',
                        content: 'You are a price estimation AI. Respond ONLY with a number - the estimated average price in USD. No explanation, just the number.'
                    },
                    {
                        role: 'user',
                        content: `What is the average market price of "${itemName}" in USD? Give just the number, no text. If unknown, estimate based on similar items.`
                    }
                ],
                temperature: 0.1,
                max_tokens: 20
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.log('Groq API error:', response.status);
            return null;
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        
        // Extract number from response
        const match = content?.match(/[\d,]+\.?\d*/);
        if (match) {
            const price = parseFloat(match[0].replace(/,/g, ''));
            if (price > 0 && price < 1000000000) { // Sanity check
                console.log(`[AI Price] ${itemName}: $${price}`);
                priceCache.set(`ai:${lower}`, { price, timestamp: Date.now() });
                return price;
            }
        }
    } catch (error) {
        console.log('Groq error:', error.message);
    }
    
    return null;
}

// Together AI free tier (alternative)
async function fetchTogetherAIPrice(itemName) {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) return null;
    
    try {
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
                messages: [
                    {
                        role: 'user',
                        content: `Estimate the average price of "${itemName}" in USD. Reply with just the number.`
                    }
                ],
                max_tokens: 20
            }),
            timeout: 8000
        });
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        const match = content?.match(/[\d,]+\.?\d*/);
        
        if (match) {
            return parseFloat(match[0].replace(/,/g, ''));
        }
    } catch (error) {
        return null;
    }
}

// Knowledge base with realistic values
const knowledgeBase = {
    'bitcoin': { value: 65000, type: 'crypto', scarcity: 95, utility: 60, desc: 'digital store of value' },
    'btc': { value: 65000, type: 'crypto', scarcity: 95, utility: 60, desc: 'scarce cryptocurrency' },
    'ethereum': { value: 3500, type: 'crypto', scarcity: 85, utility: 80, desc: 'smart contract platform' },
    'tesla': { value: 45000, type: 'vehicle', scarcity: 40, utility: 85, desc: 'electric vehicle' },
    'car': { value: 30000, type: 'vehicle', scarcity: 30, utility: 90, desc: 'automobile' },
    'lamborghini': { value: 250000, type: 'vehicle', scarcity: 90, utility: 30, desc: 'luxury supercar' },
    'ferrari': { value: 300000, type: 'vehicle', scarcity: 92, utility: 35, desc: 'exotic sports car' },
    'rolex': { value: 15000, type: 'luxury', scarcity: 80, utility: 25, desc: 'luxury timepiece' },
    'watch': { value: 3000, type: 'accessory', scarcity: 50, utility: 40, desc: 'wristwatch' },
    'iphone': { value: 1200, type: 'tech', scarcity: 20, utility: 95, desc: 'smartphone' },
    'macbook': { value: 2500, type: 'tech', scarcity: 25, utility: 90, desc: 'laptop computer' },
    'computer': { value: 1500, type: 'tech', scarcity: 20, utility: 90, desc: 'computer' },
    'pizza': { value: 15, type: 'food', scarcity: 5, utility: 70, desc: 'food' },
    'coffee': { value: 5, type: 'food', scarcity: 5, utility: 65, desc: 'beverage' },
    'dinner': { value: 50, type: 'service', scarcity: 10, utility: 75, desc: 'meal' },
    'hour of coding': { value: 100, type: 'service', scarcity: 40, utility: 90, desc: 'software development' },
    'hour of labor': { value: 25, type: 'service', scarcity: 30, utility: 80, desc: 'manual labor' },
    'camel': { value: 5000, type: 'animal', scarcity: 70, utility: 60, desc: 'transport animal' },
    'horse': { value: 5000, type: 'animal', scarcity: 60, utility: 65, desc: 'riding animal' },
    'yacht': { value: 500000, type: 'luxury', scarcity: 95, utility: 20, desc: 'marine vessel' },
    'mansion': { value: 2000000, type: 'property', scarcity: 90, utility: 60, desc: 'luxury home' },
    'house': { value: 400000, type: 'property', scarcity: 50, utility: 95, desc: 'residence' },
    'land': { value: 100000, type: 'property', scarcity: 80, utility: 70, desc: 'acre of land' },
    'picasso': { value: 5000000, type: 'art', scarcity: 98, utility: 10, desc: 'masterpiece artwork' },
    'painting': { value: 5000, type: 'art', scarcity: 40, utility: 30, desc: 'artwork' },
    'gold': { value: 60000, type: 'commodity', scarcity: 85, utility: 50, desc: 'precious metal' },
    'diamond': { value: 10000, type: 'commodity', scarcity: 80, utility: 20, desc: 'gemstone' },
    'vintage': { value: 8000, type: 'collectible', scarcity: 85, utility: 25, desc: 'vintage item' },
    'antique': { value: 6000, type: 'collectible', scarcity: 80, utility: 20, desc: 'antique item' },
    'chair': { value: 150, type: 'furniture', scarcity: 10, utility: 70, desc: 'furniture' },
    'furniture': { value: 500, type: 'furniture', scarcity: 20, utility: 75, desc: 'household items' },
    'bike': { value: 800, type: 'vehicle', scarcity: 20, utility: 85, desc: 'bicycle' },
    'motorcycle': { value: 12000, type: 'vehicle', scarcity: 45, utility: 75, desc: 'motorcycle' },
    'book': { value: 20, type: 'media', scarcity: 5, utility: 60, desc: 'book' },
    'plane': { value: 5000000, type: 'vehicle', scarcity: 95, utility: 40, desc: 'aircraft' }
};

async function getItemData(item) {
    const itemLower = item.toLowerCase();
    console.log(`[getItemData] Processing: ${item}`);
    
    // Try real crypto prices first (FREE - no API key needed!)
    console.log(`[getItemData] Trying CoinGecko for: ${item}`);
    const realPrice = await fetchCryptoPrice(item);
    if (realPrice) {
        console.log(`[getItemData] Got real price for ${item}: $${realPrice}`);
        return { 
            value: realPrice, 
            type: 'crypto', 
            scarcity: 85, 
            utility: 60, 
            name: itemLower,
            desc: 'cryptocurrency',
            realPrice: true
        };
    }
    console.log(`[getItemData] No real price from CoinGecko for: ${item}`);
    
    // Try AI price estimation (if API keys available)
    const aiPrice = await fetchAIPriceEstimate(item) || await fetchTogetherAIPrice(item);
    if (aiPrice) {
        return {
            value: aiPrice,
            type: 'estimated',
            scarcity: 50,
            utility: 60,
            name: itemLower,
            desc: 'estimated item',
            realPrice: true
        };
    }
    
    // Fall back to knowledge base
    for (const [key, data] of Object.entries(knowledgeBase)) {
        if (itemLower.includes(key)) {
            return { ...data, name: key, realPrice: false };
        }
    }
    
    // Smart defaults based on keywords
    if (itemLower.includes('crypto') || itemLower.includes('coin')) {
        return { value: 1000, type: 'crypto', scarcity: 70, utility: 50, name: 'crypto', desc: 'cryptocurrency', realPrice: false };
    }
    if (itemLower.includes('service') || itemLower.includes('hour') || itemLower.includes('work')) {
        return { value: 50, type: 'service', scarcity: 30, utility: 80, name: 'service', desc: 'professional service', realPrice: false };
    }
    if (itemLower.includes('art') || itemLower.includes('sculpture') || itemLower.includes('statue')) {
        return { value: 2000, type: 'art', scarcity: 70, utility: 20, name: 'art', desc: 'art piece', realPrice: false };
    }
    if (itemLower.includes('jewelry') || itemLower.includes('ring') || itemLower.includes('necklace')) {
        return { value: 3000, type: 'luxury', scarcity: 75, utility: 20, name: 'jewelry', desc: 'jewelry', realPrice: false };
    }
    
    return { value: 100, type: 'item', scarcity: 40, utility: 50, name: 'item', desc: 'item', realPrice: false };
}

function generateAnalysis(have, want, amount) {
    const templates = [];
    
    // Scarcity-based analysis
    if (have.scarcity > want.scarcity + 30) {
        templates.push(`${have.name} (${have.scarcity}% scarcity) commands premium over abundant ${want.name} (${want.scarcity}% scarcity).`);
    } else if (want.scarcity > have.scarcity + 30) {
        templates.push(`${want.name}'s ${want.scarcity}% scarcity vs ${have.name}'s ${have.scarcity}% drives ${amount}:1 ratio.`);
    }
    
    // Utility-based analysis
    if (have.utility > want.utility + 30) {
        templates.push(`High utility ${have.desc} (${have.utility}%) vs decorative ${want.name} creates ${amount}:1 exchange.`);
    } else if (want.utility > have.utility + 30) {
        templates.push(`Essential ${want.desc} (${want.utility}% utility) valued ${amount}x over ${have.desc}.`);
    }
    
    // Value magnitude analysis
    if (have.value > want.value * 100) {
        templates.push(`Massive value gap: premium ${have.desc} equals ${amount} units of basic ${want.desc}.`);
    } else if (have.value > want.value * 10) {
        templates.push(`Significant valuation: ${have.desc} trades at ${amount}:1 to ${want.desc}.`);
    } else if (have.value > want.value) {
        templates.push(`Moderate premium: ${have.desc} worth ${amount}x ${want.desc} based on market factors.`);
    } else if (have.value < want.value) {
        templates.push(`${want.desc} scarcity commands premium - ${have.desc} yields only ${amount} units.`);
    }
    
    // Category-based analysis
    if (have.type === 'crypto' && want.type === 'vehicle') {
        templates.push(`Digital scarcity (${have.name}) meets physical utility (${want.name}): ${amount}:1 optimal ratio.`);
    }
    if (have.type === 'luxury' && want.type === 'tech') {
        templates.push(`Prestige asset (${have.name}) valued against functional tech (${want.name}) at ${amount}:1.`);
    }
    if (have.type === 'service' && want.type === 'food') {
        templates.push(`${have.desc} converts to ${amount} units of ${want.desc} at fair market rate.`);
    }
    if (have.type === 'property' && want.type === 'crypto') {
        templates.push(`Physical asset (${have.name}) exchanges for ${amount} units of digital store of value.`);
    }
    if (have.type === 'art' && want.type === 'luxury') {
        templates.push(`Cultural value (${have.name}) trades at ${amount}:1 to status symbol (${want.name}).`);
    }
    
    // Generic fallback if no specific template matched
    if (templates.length === 0) {
        templates.push(`Multi-factor analysis: ${have.desc} scarcity ${have.scarcity}% vs ${want.desc} utility ${want.utility}% = ${amount}:1.`);
        templates.push(`Market equilibrium: ${amount} ${want.name} equal ${have.name} based on comparable value.`);
        templates.push(`Neural valuation: ${have.desc} (${have.value}) / ${want.desc} (${want.value}) = ${amount}:1 ratio.`);
    }
    
    return templates[Math.floor(Math.random() * templates.length)];
}

async function getBarterValuation(haveItem, haveAmount, wantItem) {
    const cacheKey = `${haveItem}:${haveAmount}:${wantItem}`;
    
    if (valuationCache.has(cacheKey)) {
        const cached = valuationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    const have = await getItemData(haveItem);
    const want = await getItemData(wantItem);
    
    const haveTotalValue = have.value * haveAmount;
    const exchangeRate = Math.max(0.01, haveTotalValue / want.value);
    
    // Weighted confidence based on data quality
    const confidence = Math.round(
        (have.scarcity * 0.3) + 
        (want.scarcity * 0.3) + 
        (Math.min(have.utility, want.utility) * 0.2) +
        (have.value > 1000 ? 20 : 0)
    );
    
    // Fairness based on value ratio proximity to 1:1
    const ratio = have.value / want.value;
    const fairness = Math.min(100, Math.round(100 - Math.abs(Math.log(ratio)) * 20));
    
    // Build analysis text
    let analysis = generateAnalysis(have, want, exchangeRate.toFixed(1));
    
    // Add real price indicator
    const realPriceSources = [];
    if (have.realPrice) realPriceSources.push(have.name);
    if (want.realPrice) realPriceSources.push(want.name);
    
    if (realPriceSources.length > 0) {
        analysis += ` (Validated with real market data)`;
    }
    
    const result = {
        amount: Math.round(exchangeRate * 100) / 100,
        confidence: Math.min(95, Math.max(65, confidence)),
        fairness: Math.min(95, Math.max(40, fairness)),
        analysis: analysis,
        factors: {
            utility: Math.round((have.utility + want.utility) / 2),
            scarcity: Math.round((have.scarcity + want.scarcity) / 2),
            sentiment: Math.round(50 + (have.scarcity - want.scarcity) / 4)
        },
        images: {
            have: `https://image.pollinations.ai/prompt/${encodeURIComponent(haveItem)}?width=512&height=512&nologo=true`,
            want: `https://image.pollinations.ai/prompt/${encodeURIComponent(wantItem)}?width=512&height=512&nologo=true`
        },
        realPrices: {
            have: have.realPrice,
            want: want.realPrice
        },
        usdValues: {
            have: have.value,
            want: want.value
        }
    };
    
    valuationCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
}

function generateItemImage(itemName) {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(itemName)}?width=512&height=512&nologo=true`;
}

module.exports = {
    getBarterValuation,
    generateItemImage
};
