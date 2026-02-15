# ∅ DENOMINATOR IS WORTHLESS v3.0

> **AI-Powered Barter Platform** - The death of money, the birth of pure value exchange.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-MERN-purple)

## 🎮 Live Demo

**Coming soon** - Deploy your own instance in 5 minutes!

---

## The Revolution

Money was invented as a universal denominator - a placeholder for value. A middleman between desire and fulfillment.

**AI changes everything.**

Why reduce value to numbers when intelligence can understand worth directly?

> *"1 camel caravan = 847 bar chairs = 3.2 hours of concert piano = 0.7 vintage motorcycles"*

No conversion rates. No exchange fees. No artificial scarcity.

**Just pure value. Finally.**

---

## ✨ Features

### 🤖 AI-Powered Valuation
- **FREE AI** - Uses Pollinations.ai (unlimited, no API key)
- **Multi-dimensional analysis** - Scarcity, utility, sentiment, fairness
- **Real-time calculation** - Instant exchange rate computation
- **Image generation** - AI-generated item photos

### 👤 User System
- JWT authentication (secure, stateless)
- User profiles with reputation
- Inventory management
- Trade statistics

### 💬 Real-Time Platform
- WebSocket live feed
- Instant notifications
- Negotiation chat
- User presence

### 📊 Trading Features
- Create barter offers
- Counter-offer negotiations
- Fairness scoring
- Trade history
- Leaderboard

### 🎨 Cyberpunk UI
- Neon aesthetic with animations
- Responsive design
- Particle background
- Glitch effects

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla JS, Socket.IO Client |
| **Backend** | Node.js, Express |
| **Database** | MongoDB, Mongoose |
| **Real-time** | Socket.IO |
| **Auth** | JWT, bcryptjs |
| **AI Text** | OpenRouter / Pollinations.ai |
| **AI Images** | Pollinations.ai |
| **Security** | Helmet, Rate Limiting |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/denominator-is-worthless.git
cd denominator-is-worthless

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI

# Start server
npm start

# Open http://localhost:3000
```

---

## 📦 Deployment

### Railway (Easiest - FREE)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway init
railway add --plugin mongodb
railway up
```

[Full Deployment Guide](DEPLOY.md)

---

## 🔧 API Endpoints

### Authentication
```http
POST   /api/auth/register     # Create account
POST   /api/auth/login        # Login
GET    /api/auth/me           # Get current user
```

### Barters
```http
GET    /api/barters/feed           # Public feed
POST   /api/barters/create         # Create barter (auth)
GET    /api/barters/:id            # Get single barter
POST   /api/barters/:id/accept     # Accept barter (auth)
POST   /api/barters/:id/negotiate  # Add negotiation (auth)
POST   /api/barters/:id/cancel     # Cancel barter (auth)
```

### Users
```http
GET    /api/users/profile/:username  # Public profile
PATCH  /api/users/profile            # Update profile (auth)
POST   /api/users/inventory          # Add to inventory (auth)
DELETE /api/users/inventory/:id      # Remove from inventory (auth)
GET    /api/users/leaderboard        # Top traders
GET    /api/users/search?q=query     # Search users
```

### AI
```http
POST   /api/valuate            # Calculate barter value
GET    /api/image/:item        # Generate item image
GET    /api/health             # Health check
GET    /api/stats              # Platform stats
```

---

## 💰 Cost Breakdown

### Free Tier (Recommended to start)

| Service | Cost | Limit |
|---------|------|-------|
| **Railway** | $0 | $5 credit/month |
| **MongoDB Atlas** | $0 | 512MB storage |
| **Pollinations.ai** | $0 | Unlimited |
| **OpenRouter** | $0 | 200 requests/day |

**Total: $0/month**

### Scaling Up

| Users | Estimated Cost | Upgrades |
|-------|----------------|----------|
| 1K | $0 | Free tier sufficient |
| 10K | $15/mo | Railway Pro + MongoDB M10 |
| 100K | $50/mo | Dedicated VPS + Redis |

---

## 🔐 Security

- JWT authentication with secure httpOnly cookies option
- Rate limiting (30 req/min per IP)
- Helmet.js security headers
- CORS protection
- Input validation (express-validator)
- Password hashing (bcryptjs)

---

## 🗺️ Roadmap

- [x] Core barter engine
- [x] User authentication
- [x] Real-time updates
- [x] AI valuation
- [x] Image generation
- [ ] Mobile app (React Native)
- [ ] Smart contract integration (optional)
- [ ] Multi-language support
- [ ] Advanced search & filters
- [ ] Escrow system

---

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- [Pollinations.ai](https://pollinations.ai/) - Free AI generation
- [OpenRouter](https://openrouter.ai/) - AI model aggregation
- [Railway](https://railway.app/) - Easy deployment
- [MongoDB](https://www.mongodb.com/) - Database

---

<p align="center">
  <strong>No Money. No Problem.</strong><br>
  <sub>v3.0.0 - AI Barter Engine Online</sub>
</p>
