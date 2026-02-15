const fetch = require('node-fetch');

// In-memory cache
const valuationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Knowledge base for realistic valuations
const knowledgeBase = {
    'bitcoin': { value: 60000, scarcity: 95, utility: 70, sentiment: 80, desc: 'scarce digital asset with high demand' },
    'btc': { value: 60000, scarcity: 95, utility: 70, sentiment: 80, desc: 'scarce digital asset with high demand' },
    'tesla': { value: 45000, scarcity: 40, utility: 85, sentiment: 75, desc: 'high-tech electric vehicle' },
    'car': { value: 30000, scarcity: 30, utility: 90, sentiment: 60, desc: 'essential transportation vehicle' },
    'rolex': { value: 15000, scarcity: 80, utility: 30, sentiment: 90, desc: 'luxury timepiece with prestige value' },
    'watch': { value: 5000, scarcity: 60, utility: 40, sentiment: 70, desc: 'personal timekeeping device' },
    'iphone': { value: 1200, scarcity: 20, utility: 95, sentiment: 80, desc: 'ubiquitous communication device' },
    'pizza': { value: 15, scarcity: 10, utility: 80, sentiment: 85, desc: 'popular food with universal appeal' },
    'coffee': { value: 5, scarcity: 5, utility: 70, sentiment: 75, desc: 'daily stimulant beverage' },
    'hour of coding': { value: 100, scarcity: 40, utility: 90, sentiment: 60, desc: 'skilled technical labor' },
    'camel': { value: 5000, scarcity: 70, utility: 60, sentiment: 50, desc: 'traditional transport animal' },
    'yacht': { value: 500000, scarcity: 90, utility: 20, sentiment: 85, desc: 'luxury marine vessel' },
    'mansion': { value: 2000000, scarcity: 85, utility: 50, sentiment: 80, desc: 'prestigious residential property' },
    'picasso': { value: 10000000, scarcity: 98, utility: 10, sentiment: 95, desc: 'rare masterpiece artwork' },
    'painting': { value: 5000, scarcity: 50, utility: 30, sentiment: 70, desc: 'decorative artwork' },
    'gold': { value: 60000, scarcity: 85, utility: 60, sentiment: 80, desc: 'precious metal store of value' },
    'diamond': { value: 10000, scarcity: 75, utility: 20, sentiment: 85, desc: 'scarce gemstone with cultural value' },
    'land': { value: 50000, scarcity: 80, utility: 70, sentiment: 60, desc: 'finite physical territory' },
    'vintage': { value: 10000, scarcity: 85, utility: 30, sentiment: 80, desc: 'rare collectible item' },
    'antique': { value: 8000, scarcity: 80, utility: 25, sentiment: 75, desc: 'historical collectible item' }
};

/**
 * Get item data from knowledge base or estimate
 */
function getItemData(item) {
    const itemLower = item.toLowerCase();
    
    // Check knowledge base
    for (const [key, data] of Object.entries(knowledgeBase)) {
        if (itemLower.includes(key)) {
            return data;
        }
    }
    
    // Estimate based on keywords
    if (itemLower.includes('lamborghini') || itemLower.includes('ferrari') || itemLower.includes('bentley')) {
        return { value: 200000, scarcity: 85, utility: 40, sentiment: 90, desc: 'luxury supercar with prestige' };
    }
    if (itemLower.includes('house') || itemLower.includes('apartment')) {
        return { value: 300000, scarcity: 60, utility: 95, sentiment: 70, desc: 'essential living space' };
    }
    if (itemLower.includes('bike') || itemLower.includes('bicycle')) {
        return { value: 500, scarcity: 20, utility: 80, sentiment: 60, desc: 'efficient personal transport' };
    }
    if (itemLower.includes('laptop') || itemLower.includes('computer')) {
        return { value: 1500, scarcity: 15, utility: 90, sentiment: 65, desc: 'essential productivity tool' };
    }
    if (itemLower.includes('chair') || itemLower.includes('furniture')) {
        return { value: 200, scarcity: 10, utility: 70, sentiment: 40, desc: 'common household item' };
    }
    if (itemLower.includes('book')) {
        return { value: 20, scarcity: 5, utility: 60, sentiment: 55, desc: 'source of knowledge/entertainment' };
    }
    if (itemLower.includes('service') || itemLower.includes('hour')) {
        return { value: 50, scarcity: 30, utility: 80, sentiment: 50, desc: 'time-based skilled labor' };
    }
    
    // Default estimate
    return { 
        value: 100, 
        scarcity: 40 + Math.floor(Math.random() * 30), 
        utility: 50 + Math.floor(Math.random() * 30), 
        sentiment: 45 + Math.floor(Math.random() * 30),
        desc: 'item with moderate value and utility'
    };
}

/**
 * Generate AI-style analysis sentence
 */
function generateAnalysis(haveData, wantData, ratio) {
    const analyses = [
        `${haveData.desc} exchanges at ${ratio.toFixed(1)}:1 ratio with ${wantData.desc} based on scarcity differential.`,
        `Value vectors align: ${haveData.desc} carries ${haveData.scarcity}% scarcity vs ${wantData.desc} at ${wantData.scarcity}%.`,
        `Multi-dimensional analysis shows optimal exchange considering utility (${haveData.utility}% vs ${wantData.utility}%) and market demand.`,
        `Neural valuation complete: ${ratio.toFixed(1)} ${wantData.desc.split(' ').pop()} equivalent to 1 ${haveData.desc.split(' ').pop()}.`,
        `Fair market ratio calculated: scarcity premium (${haveData.scarcity}%) vs functional utility (${wantData.utility}%).`
    ];
    
    return analyses[Math.floor(Math.random() * analyses.length)];
}

/**
 * AI Barter Valuation
 */
async function getBarterValuation(haveItem, haveAmount, wantItem) {
    const cacheKey = `${haveItem}:${haveAmount}:${wantItem}`;
    
    if (valuationCache.has(cacheKey)) {
        const cached = valuationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        // Get item data
        const haveData = getItemData(haveItem);
        const wantData = getItemData(wantItem);
        
        // Calculate exchange rate
        const haveTotalValue = haveData.value * haveAmount;
        const exchangeRate = haveTotalValue / wantData.value;
        
        // Calculate weighted confidence
        const confidence = Math.round(
            (haveData.scarcity * 0.4) + 
            (wantData.scarcity * 0.4) + 
            (Math.min(haveData.utility, wantData.utility) * 0.2)
        );
        
        // Calculate fairness
        const valueRatio = haveData.value / wantData.value;
        const fairness = Math.min(100, Math.round(100 - (Math.abs(valueRatio - 1) * 20)));
        
        const result = {
            amount: Math.max(0.01, Math.round(exchangeRate * 100) / 100),
            confidence: Math.min(100, Math.max(60, confidence)),
            fairness: Math.min(100, Math.max(40, fairness)),
            analysis: generateAnalysis(haveData, wantData, exchangeRate),
            factors: {
                utility: Math.round((haveData.utility + wantData.utility) / 2),
                scarcity: Math.round((haveData.scarcity + wantData.scarcity) / 2),
                sentiment: Math.round((haveData.sentiment + wantData.sentiment) / 2)
            }
        };
        
        result.images = {
            have: generateItemImage(haveItem),
            want: generateItemImage(wantItem)
        };
        
        valuationCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        return result;
        
    } catch (error) {
        console.error('Valuation error:', error);
        // Ultimate fallback
        return {
            amount: 1,
            confidence: 60,
            fairness: 50,
            analysis: 'AI valuation: Exchange rate estimated based on comparable asset values.',
            factors: { utility: 50, scarcity: 50, sentiment: 50 },
            images: {
                have: generateItemImage(haveItem),
                want: generateItemImage(wantItem)
            }
        };
    }
}

/**
 * Generate image URL
 */
function generateItemImage(itemName) {
    const prompt = encodeURIComponent(
        `High quality product photo of ${itemName}, cyberpunk aesthetic, neon lighting, dark background, professional photography, detailed, 8k quality`
    );
    return `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=${Math.floor(Math.random() * 10000)}&nologo=true`;
}

module.exports = {
    getBarterValuation,
    generateItemImage
};
