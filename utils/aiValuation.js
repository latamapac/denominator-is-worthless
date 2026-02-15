const fetch = require('node-fetch');

// Cache
const valuationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

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

function getItemData(item) {
    const itemLower = item.toLowerCase();
    
    for (const [key, data] of Object.entries(knowledgeBase)) {
        if (itemLower.includes(key)) {
            return { ...data, name: key };
        }
    }
    
    // Smart defaults based on keywords
    if (itemLower.includes('crypto') || itemLower.includes('coin')) {
        return { value: 1000, type: 'crypto', scarcity: 70, utility: 50, name: 'crypto', desc: 'cryptocurrency' };
    }
    if (itemLower.includes('service') || itemLower.includes('hour') || itemLower.includes('work')) {
        return { value: 50, type: 'service', scarcity: 30, utility: 80, name: 'service', desc: 'professional service' };
    }
    if (itemLower.includes('art') || itemLower.includes('sculpture') || itemLower.includes('statue')) {
        return { value: 2000, type: 'art', scarcity: 70, utility: 20, name: 'art', desc: 'art piece' };
    }
    if (itemLower.includes('jewelry') || itemLower.includes('ring') || itemLower.includes('necklace')) {
        return { value: 3000, type: 'luxury', scarcity: 75, utility: 20, name: 'jewelry', desc: 'jewelry' };
    }
    
    return { value: 100, type: 'item', scarcity: 40, utility: 50, name: 'item', desc: 'item' };
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

    const have = getItemData(haveItem);
    const want = getItemData(wantItem);
    
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
    
    const result = {
        amount: Math.round(exchangeRate * 100) / 100,
        confidence: Math.min(95, Math.max(65, confidence)),
        fairness: Math.min(95, Math.max(40, fairness)),
        analysis: generateAnalysis(have, want, exchangeRate.toFixed(1)),
        factors: {
            utility: Math.round((have.utility + want.utility) / 2),
            scarcity: Math.round((have.scarcity + want.scarcity) / 2),
            sentiment: Math.round(50 + (have.scarcity - want.scarcity) / 4)
        },
        images: {
            have: `https://image.pollinations.ai/prompt/${encodeURIComponent(haveItem)}?width=512&height=512&nologo=true`,
            want: `https://image.pollinations.ai/prompt/${encodeURIComponent(wantItem)}?width=512&height=512&nologo=true`
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
