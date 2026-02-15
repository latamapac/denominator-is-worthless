const fetch = require('node-fetch');

// In-memory cache for valuations
const valuationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate image URL using Pollinations.ai (FREE)
 */
function generateItemImage(itemName, options = {}) {
    const {
        width = 512,
        height = 512,
        seed = Math.floor(Math.random() * 10000),
        style = 'cyberpunk'
    } = options;

    const prompt = encodeURIComponent(
        `High quality product photo of ${itemName}, ${style} aesthetic, neon lighting, dark background, professional photography, detailed, 8k quality`
    );

    return `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&negative=blurry,low%20quality,text,watermark`;
}

/**
 * Get barter valuation using AI
 */
async function getBarterValuation(haveItem, haveAmount, wantItem) {
    const cacheKey = `${haveItem}:${haveAmount}:${wantItem}`;
    
    // Check cache
    if (valuationCache.has(cacheKey)) {
        const cached = valuationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    const prompt = `You are the "DENOMINATOR IS WORTHLESS" AI Barter Engine. 

Your task: Calculate a fair barter exchange rate between two items WITHOUT using money/dollars.

INPUT:
- User has: ${haveAmount} ${haveItem}
- User wants: ${wantItem}

Analyze these items based on:
1. Practical utility and usefulness (0-100)
2. Scarcity and availability (0-100)
3. Durability and longevity (0-100)
4. Skill/labor required to create (0-100)
5. Emotional/cultural value (0-100)
6. Market demand (not price, just demand) (0-100)

Calculate how many ${wantItem} equal ${haveAmount} ${haveItem}.

Also rate the FAIRNESS of this exchange (0-100) where 50 is perfectly equal value.

Respond ONLY with a JSON object in this exact format:
{
  "amount": <number>,
  "confidence": <number 0-100>,
  "fairness": <number 0-100>,
  "analysis": "Brief 1-sentence analysis of the exchange",
  "factors": {
    "utility": <0-100>,
    "scarcity": <0-100>,
    "sentiment": <0-100>
  }
}`;

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    
    try {
        let response;
        
        if (openRouterKey) {
            // Use OpenRouter with free/cheap model
            response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://denominator-is-worthless.com',
                    'X-Title': 'Denominator Is Worthless'
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.1-8b-instruct:free',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });
        } else {
            // Use Pollinations text API (also free)
            response = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    seed: 42,
                    jsonMode: true
                })
            });
        }

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = openRouterKey ? 
            data.choices[0].message.content : 
            data;

        // Parse the JSON response
        let result;
        try {
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                             content.match(/```([\s\S]*?)```/) ||
                             [null, content];
            result = JSON.parse(jsonMatch[1].trim());
        } catch (e) {
            console.log('Failed to parse JSON, using fallback:', content);
            result = generateFallbackValuation(haveItem, haveAmount, wantItem);
        }

        // Validate and sanitize
        const sanitized = {
            amount: Math.max(0.01, Math.round(result.amount * 100) / 100),
            confidence: Math.min(100, Math.max(0, result.confidence || 85)),
            fairness: Math.min(100, Math.max(0, result.fairness || 50)),
            analysis: result.analysis || 'AI valuation complete.',
            factors: {
                utility: Math.min(100, Math.max(0, result.factors?.utility || 70)),
                scarcity: Math.min(100, Math.max(0, result.factors?.scarcity || 60)),
                sentiment: Math.min(100, Math.max(0, result.factors?.sentiment || 50))
            }
        };

        // Generate images
        sanitized.images = {
            have: generateItemImage(haveItem),
            want: generateItemImage(wantItem)
        };

        // Cache result
        valuationCache.set(cacheKey, {
            data: sanitized,
            timestamp: Date.now()
        });

        return sanitized;

    } catch (error) {
        console.error('AI valuation error:', error);
        const fallback = generateFallbackValuation(haveItem, haveAmount, wantItem);
        fallback.images = {
            have: generateItemImage(haveItem),
            want: generateItemImage(wantItem)
        };
        return fallback;
    }
}

/**
 * Fallback valuation using local algorithm
 */
function generateFallbackValuation(haveItem, haveAmount, wantItem) {
    const valueKeywords = {
        veryHigh: ['gold', 'diamond', 'vintage', 'antique', 'rare', 'original', 'picasso', 'yacht', 'mansion', 'lamborghini', 'rolex'],
        high: ['car', 'motorcycle', 'watch', 'furniture', 'camel', 'wine', 'painting', 'iphone', 'macbook'],
        medium: ['bike', 'chair', 'table', 'lamp', 'book', 'console', 'camera'],
        low: ['pencil', 'paper', 'apple', 'coffee', 'plastic', 'pen', 'notebook']
    };

    const getValueScore = (item) => {
        const itemLower = item.toLowerCase();
        if (valueKeywords.veryHigh.some(k => itemLower.includes(k))) return 10000;
        if (valueKeywords.high.some(k => itemLower.includes(k))) return 1000;
        if (valueKeywords.medium.some(k => itemLower.includes(k))) return 100;
        if (valueKeywords.low.some(k => itemLower.includes(k))) return 10;
        return 50;
    };

    const haveValue = getValueScore(haveItem) * haveAmount;
    const wantValue = getValueScore(wantItem);
    const amount = Math.max(0.1, haveValue / wantValue);

    // Calculate fairness
    const expectedAmount = amount;
    const variance = Math.abs(amount - expectedAmount) / expectedAmount;
    const fairness = Math.max(0, Math.min(100, 100 - (variance * 100)));

    return {
        amount: Math.round(amount * 100) / 100,
        confidence: 65,
        fairness: Math.round(fairness),
        analysis: 'Fallback valuation based on keyword analysis. Connect API key for AI-powered valuation.',
        factors: {
            utility: 60,
            scarcity: 55,
            sentiment: 50
        }
    };
}

module.exports = {
    getBarterValuation,
    generateFallbackValuation,
    generateItemImage
};
