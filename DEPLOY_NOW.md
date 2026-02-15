# 🚀 Deploy RIGHT NOW

## Option 1: Render (Easiest - Recommended)

### Step 1: Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/latamapac/denominator-is-worthless)

### Step 2: Fill in Environment Variables
In the Render dashboard after clicking deploy:

| Variable | Value | How to get |
|----------|-------|------------|
| `MONGODB_URI` | Your MongoDB connection string | See MongoDB Atlas setup below |
| `JWT_SECRET` | Random string | Run: `openssl rand -base64 32` |

### Step 3: MongoDB Atlas (FREE - 512MB)
1. Go to https://www.mongodb.com/atlas/database
2. Sign up (free, no credit card)
3. Create cluster (M0 - FREE tier)
4. Database Access → Create user
5. Network Access → Add IP: `0.0.0.0/0` (allow from anywhere)
6. Clusters → Connect → Drivers → Node.js → Copy connection string
7. Replace `<password>` with your user's password

**Your connection string will look like:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/denominator?retryWrites=true&w=majority
```

---

## Option 2: VPS (DigitalOcean, AWS, Hetzner)

### Automated Deploy Script

```bash
# On your VPS, run:
curl -fsSL https://raw.githubusercontent.com/latamapac/denominator-is-worthless/main/deploy-vps.sh | bash
```

Or manually:

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone repo
git clone https://github.com/latamapac/denominator-is-worthless.git
cd denominator-is-worthless

# 3. Create .env file
cat > .env << 'EOF'
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=3000
EOF

# 4. Run with Docker Compose
docker-compose up -d

# 5. Done! App runs on port 3000
```

---

## Option 3: Railway (If you have capacity)

```bash
railway login
railway init
railway add --plugin mongodb
railway up
```

---

## Verify Deployment

Once deployed, visit:
- **Health Check**: `https://your-domain.com/api/health`
- **App**: `https://your-domain.com`

Expected response:
```json
{
  "status": "operational",
  "version": "3.0.0",
  "database": "connected",
  "ai": { "text": "pollinations", "image": "pollinations" }
}
```

---

## Troubleshooting

### "Database disconnected"
- Check MONGODB_URI is correct
- Ensure IP whitelist includes `0.0.0.0/0` in MongoDB Atlas
- Verify password is URL-encoded (replace special chars)

### "Cannot connect to MongoDB"
- MongoDB Atlas takes 1-3 minutes to provision
- Try again after waiting

### "App crashes on start"
- Check logs: `docker logs <container_id>`
- Verify all env vars are set

---

**Need help?** Create an issue: https://github.com/latamapac/denominator-is-worthless/issues
