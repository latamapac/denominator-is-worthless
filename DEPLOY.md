# 🚀 Deployment Guide - DENOMINATOR IS WORTHLESS v3.0

Full-stack platform with MongoDB, WebSockets, and AI.

## What's New in v3.0

- ✓ **MongoDB Database** - User accounts, barters, trade history
- ✓ **WebSocket Real-time** - Live feed, instant notifications
- ✓ **JWT Authentication** - Secure login/register
- ✓ **User Profiles** - Reputation, inventory, stats
- ✓ **Negotiation System** - Chat-style counter offers
- ✓ **Leaderboard** - Top traders ranking

---

## Quick Deploy to Railway (Easiest)

### 1. Prerequisites
- GitHub account
- Railway account (free at [railway.app](https://railway.app))

### 2. Setup Steps

```bash
# Clone and setup
git clone https://github.com/YOUR_USERNAME/denominator-is-worthless.git
cd denominator-is-worthless

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
```

### 3. Deploy to Railway

**Option A: Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add MongoDB plugin
railway add --plugin mongodb

# Deploy
railway up

# Open app
railway open
```

**Option B: GitHub Integration**
1. Push code to GitHub
2. Go to [railway.app/new](https://railway.app/new)
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway auto-detects Node.js and deploys
6. Add MongoDB plugin in dashboard
7. Set environment variables

### 4. Environment Variables in Railway

In Railway dashboard → Your Project → Variables:

```
MONGODB_URI=${{MongoDB.MONGO_URL}}  # Auto-set if using Railway MongoDB
JWT_SECRET=your-super-secret-key    # Generate: openssl rand -base64 32
OPENROUTER_API_KEY=optional         # For better AI (free tier)
NODE_ENV=production
```

---

## Deploy to Render (Alternative)

```bash
# 1. Push to GitHub

# 2. Go to dashboard.render.com
# 3. New Web Service → Connect GitHub repo
# 4. Settings:
#    - Build Command: npm install
#    - Start Command: npm start
#    - Environment: Node

# 5. Add environment variables in dashboard
# 6. Create Managed PostgreSQL or connect MongoDB Atlas
```

---

## Deploy to VPS (Hetzner/DigitalOcean/AWS)

### 1. Server Setup

```bash
# SSH to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install MongoDB (or use Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

### 2. App Deployment

```bash
# Create app directory
mkdir -p /var/www/denominator
cd /var/www/denominator

# Clone repo
git clone https://github.com/YOUR_USERNAME/denominator-is-worthless.git .

# Install dependencies
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start server.js --name "denominator"
pm2 startup
pm2 save
```

### 3. Nginx Setup

```bash
apt install nginx certbot python3-certbot-nginx

# Create config
nano /etc/nginx/sites-available/denominator
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/denominator /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# SSL
certbot --nginx -d your-domain.com
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/denominator
      - JWT_SECRET=your-secret
      - NODE_ENV=production
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo-data:
```

```bash
docker-compose up -d
```

---

## Database Setup

### Option 1: MongoDB Atlas (Cloud - FREE)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database)
2. Create free cluster (M0)
3. Database Access → Create user
4. Network Access → Allow from anywhere (0.0.0.0/0) or your IP
5. Clusters → Connect → Drivers → Node.js → Copy URI
6. Replace `<password>` in URI with your user's password

### Option 2: Self-hosted MongoDB

```bash
# Ubuntu/Debian
apt install mongodb
systemctl start mongodb

# Use URI: mongodb://localhost:27017/denominator
```

---

## AI Services Setup

### Free Tier Options

| Service | Type | Free Tier | Setup |
|---------|------|-----------|-------|
| **Pollinations.ai** | Text + Images | Unlimited, no key | Already works |
| **OpenRouter** | Text | 200 req/day | Optional API key |

### OpenRouter (Optional - for better quality)

1. Go to [openrouter.ai](https://openrouter.ai/)
2. Sign up (free)
3. Get API key
4. Add to environment: `OPENROUTER_API_KEY=sk-or-v1-...`

Without OpenRouter, the app uses Pollinations.ai which is completely free and unlimited.

---

## Monitoring & Logs

### Railway
- Built-in logs: `railway logs`
- Metrics in dashboard

### PM2 (VPS)
```bash
pm2 logs denominator
pm2 monit
pm2 status
```

### Health Check Endpoint
```bash
curl https://your-domain.com/api/health
```

Response:
```json
{
  "status": "operational",
  "version": "3.0.0",
  "database": "connected",
  "ai": { "text": "openrouter", "image": "pollinations" },
  "features": { "websocket": true, "authentication": true, "database": true }
}
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | YES | MongoDB connection string |
| `JWT_SECRET` | YES | Secret for signing JWTs |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | production/development |
| `OPENROUTER_API_KEY` | No | For better AI (optional) |
| `CLIENT_URL` | No | For CORS (default: *) |

---

## SSL / HTTPS

### Railway / Render
- Automatic SSL via Let's Encrypt

### VPS
- Use Certbot (shown in VPS section above)
- Or use Cloudflare proxy

---

## Troubleshooting

### "Cannot connect to MongoDB"
- Check `MONGODB_URI` is correct
- Ensure IP is whitelisted in MongoDB Atlas
- Check MongoDB service is running (self-hosted)

### "WebSocket connection failed"
- Ensure nginx config includes WebSocket upgrade headers
- Check firewall allows port 3000 (if not using nginx)

### "AI valuation not working"
- Without OpenRouter key, falls back to Pollinations (free)
- Check rate limits if using OpenRouter free tier

### App works but no real-time updates
- Check browser console for WebSocket errors
- Ensure `socket.io` client library loads
- Check server logs for connection issues

---

## Scaling

### Current (Free Tier)
- Railway: $5 credit/month
- MongoDB Atlas: 512MB free tier
- Pollinations.ai: Unlimited free
- OpenRouter: 200 req/day free

### For Higher Traffic
1. Upgrade Railway ($5/month)
2. Upgrade MongoDB Atlas ($9/month)
3. Add Redis for session caching
4. Use CDN for static assets (Cloudflare free tier)

---

## Estimated Costs

| Setup | Monthly Cost | Handles |
|-------|--------------|---------|
| Railway + MongoDB Free | $0 | ~1000 users |
| Railway Pro + MongoDB M10 | $15 | ~10K users |
| VPS + MongoDB Atlas | $20 | ~50K users |

---

## Support

- **Issues**: GitHub Issues
- **Discord**: [Join our community]
- **Email**: support@denominator.io

---

**Total Free Tier Monthly Cost: $0**

Ready to deploy the future of value exchange! 🚀
