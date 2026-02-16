# AI Price Estimation - Multi-Provider Setup

We now have **4 AI providers** for maximum reliability - all with free tiers!

## Provider Priority
1. **Groq** (Llama 3.1 8B) - Primary
2. **Google Gemini Flash** - Backup #1  
3. **DeepSeek V3** - Backup #2
4. **Together AI** - Backup #3

---

## Setup Instructions

### 1. Groq (Already Active)
- **Key**: `GROQ_API_KEY`
- **Get**: https://console.groq.com/keys
- **Free**: 1M tokens/min
- **Status**: ✅ Already set

### 2. Google Gemini Flash (Recommended Add)
- **Key**: `GEMINI_API_KEY`
- **Get**: https://ai.google.dev/
- **Free**: 15 BILLION tokens/month (!)
- **Cost after free**: $0.075/1M tokens
```
Add to Render: GEMINI_API_KEY=your_key_here
```

### 3. DeepSeek V3 (Cheapest Paid)
- **Key**: `DEEPSEEK_API_KEY`
- **Get**: https://platform.deepseek.com/
- **Free**: 10M tokens (new accounts)
- **Cost**: $0.07/1M tokens (cheapest!)
```
Add to Render: DEEPSEEK_API_KEY=your_key_here
```

### 4. Together AI (Optional)
- **Key**: `TOGETHER_API_KEY`
- **Get**: https://api.together.xyz/
- **Free**: $1 credit on signup
- **Cost**: Varies by model

---

## Cost Comparison

---

## Alternative Options (Sorted by Cost)

### 1. **DeepSeek V3** (Cheapest)
- **Price**: $0.07 / 1M input tokens, $0.28 / 1M output tokens
- **API**: https://platform.deepseek.com/
- **Example cost per query**: ~$0.0002 (100x cheaper than GPT-4)
- **Speed**: Fast
- **Free tier**: 10M tokens (new accounts)
```javascript
model: 'deepseek-chat'
```

### 2. **Groq Mixtral 8x7B** (Free tier)
- **Price**: FREE up to 1M tokens/day
- **After free**: $0.27 / 1M input, $0.27 / 1M output
- **Quality**: Better than Llama 3.1 8B for price extraction
- **Speed**: Very fast (500+ t/s)
```javascript
model: 'mixtral-8x7b-32768'
```

### 3. **Anthropic Claude 3 Haiku** (Best cheap model)
- **Price**: $0.25 / 1M input, $1.25 / 1M output
- **Quality**: Excellent at following instructions
- **Speed**: Very fast
- **Free tier**: $5 credit on signup
```javascript
model: 'claude-3-haiku-20240307'
```

### 4. **OpenAI GPT-4o-mini** (Reliable)
- **Price**: $0.15 / 1M input, $0.60 / 1M output
- **Quality**: Very consistent
- **Free tier**: $5 credit on signup
```javascript
model: 'gpt-4o-mini'
```

### 5. **Google Gemini 1.5 Flash** (Free tier generous)
- **Price**: FREE up to 15B tokens/month (very generous!)
- **Then**: $0.075 / 1M input, $0.30 / 1M output
- **Speed**: Fast
- **API**: https://ai.google.dev/
```javascript
model: 'gemini-1.5-flash'
```

### 6. **Together AI** (Many open source options)
- **Llama 3 70B**: $0.90 / 1M tokens
- **Mixtral 8x22B**: $0.90 / 1M tokens
- **Free tier**: $1 credit on signup
```javascript
model: 'meta-llama/Llama-3-70b-chat-hf'
```

---

## Cost Projection for Our Use Case

**Per price estimation query:**
- Input: ~50 tokens (prompt)
- Output: ~5 tokens (number)
- Total: ~55 tokens

### Monthly Cost (1000 queries/day):

| Model | Cost/Query | Monthly Cost |
|-------|-----------|--------------|
| **Groq** (free tier) | $0 | **$0** ✅ |
| **DeepSeek** | $0.00005 | **$1.50** ✅ |
| **Gemini Flash** | $0 (within free) | **$0** ✅ |
| **GPT-4o-mini** | $0.00003 | **$0.90** ✅ |
| **Claude Haiku** | $0.00006 | **$1.80** ✅ |
| **GPT-4o** | $0.00075 | **$22.50** |

**Conclusion**: Even at 1000 queries/day, we're looking at **$0-2/month** with cheap models.

---

## Recommendation

### Option A: Stay with Groq (Recommended)
- It's already working
- 1M tokens/min is plenty
- If you need more: $0.59/M tokens (still very cheap)

### Option B: Add Gemini Flash as backup
- 15B tokens/month free (!)
- More generous than Groq
- Good quality

### Option C: Add DeepSeek (Cheapest paid option)
- If you need reliability beyond free tiers
- Costs pennies per month

---

## Implementation

Want me to add fallback models? Priority order:
1. Groq (primary)
2. Gemini Flash (backup, also free)
3. DeepSeek (ultra-cheap backup)

This gives us 3 free tiers before paying anything!
