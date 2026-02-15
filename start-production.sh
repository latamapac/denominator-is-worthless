#!/bin/bash
# Production startup script

echo "Starting DENOMINATOR IS WORTHLESS..."
echo "==================================="

# Set production environment
export NODE_ENV=production
export PORT=3000

# Start server
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo ""
    echo "✓ Server running on http://localhost:3000"
    echo ""
    echo "Starting ngrok tunnel..."
    ngrok http 3000 --domain=denominator.ngrok.io 2>/dev/null || ngrok http 3000
else
    echo "✗ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM EXIT
wait
