#!/bin/bash
# Persistent deployment using localtunnel with fixed subdomain

# Kill existing processes
pkill -f "node server.js" 2>/dev/null
pkill -f "lt --port" 2>/dev/null
sleep 2

# Start server
export NODE_ENV=production
export PORT=3000
node server.js &
SERVER_PID=$!
sleep 3

# Verify server is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✗ Server failed to start"
    exit 1
fi

echo "✓ Server running on http://localhost:3000"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🚀 DEPLOYMENT SUCCESSFUL                     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║                                                                ║"
echo "║  Starting persistent tunnel...                                 ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Start tunnel with fixed subdomain
lt --port 3000 --subdomain denominator-worthless 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel
sleep 5

echo ""
echo "🌐 PUBLIC URL: https://denominator-worthless.loca.lt"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Keep script running
trap "echo 'Stopping...'; kill $SERVER_PID $TUNNEL_PID 2>/dev/null; exit" INT TERM EXIT
wait
