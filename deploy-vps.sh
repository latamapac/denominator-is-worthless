#!/bin/bash
# DENOMINATOR IS WORTHLESS - VPS Auto-Deploy Script
# Usage: curl -fsSL https://raw.githubusercontent.com/latamapac/denominator-is-worthless/main/deploy-vps.sh | bash

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           DENOMINATOR IS WORTHLESS - Auto Deploy               ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}✗ Please do not run as root${NC}"
   exit 1
fi

# Get user input
echo -e "${YELLOW}▶ MongoDB Atlas Setup Required${NC}"
echo "   1. Go to: https://www.mongodb.com/atlas/database"
echo "   2. Create free M0 cluster"
echo "   3. Create database user"
echo "   4. Add IP: 0.0.0.0/0 to network access"
echo "   5. Get connection string"
echo ""
read -p "Paste your MongoDB connection string: " MONGODB_URI

if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}✗ MongoDB URI is required${NC}"
    exit 1
fi

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo -e "${GREEN}▶ Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
fi

# Create app directory
APP_DIR="$HOME/denominator-is-worthless"
echo ""
echo -e "${GREEN}▶ Setting up application...${NC}"

if [ -d "$APP_DIR" ]; then
    echo "   Updating existing installation..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "   Cloning repository..."
    git clone https://github.com/latamapac/denominator-is-worthless.git "$APP_DIR"
    cd "$APP_DIR"
fi

# Create .env file
cat > .env << EOF
MONGODB_URI=${MONGODB_URI}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=3000
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Start with Docker Compose
echo ""
echo -e "${GREEN}▶ Starting services...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d

# Wait for services
echo "   Waiting for services to start..."
sleep 10

# Check health
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║                    ✅ DEPLOYMENT SUCCESSFUL!                    ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  🌐 Local URL: http://localhost:3000                          ║${NC}"
    echo -e "${GREEN}║  📊 Health:    http://localhost:3000/api/health               ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║  To expose to internet, set up Nginx + SSL or use:            ║${NC}"
    echo -e "${GREEN}║  npx localtunnel --port 3000                                  ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║  Logs: docker-compose logs -f                                 ║${NC}"
    echo -e "${GREEN}║  Stop: docker-compose down                                    ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "   Check logs: docker-compose logs"
    exit 1
fi
