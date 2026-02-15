#!/bin/bash
# Start in-memory MongoDB and expose via tunnel for Render connection

echo "Starting in-memory MongoDB for Render deployment..."

# Create a script to run the in-memory MongoDB
cat > /tmp/mongo-server.js << 'EOF'
const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'denominator'
    }
  });
  
  const uri = mongod.getUri();
  console.log('MongoDB running at:', uri);
  console.log('Use this connection string in Render:');
  console.log(uri);
  
  // Keep running
  process.on('SIGINT', async () => {
    await mongod.stop();
    process.exit(0);
  });
}

start();
EOF

# Start the in-memory MongoDB
node /tmp/mongo-server.js &
MONGO_PID=$!

sleep 5

# The connection string will be printed by the script
# Typically mongodb://127.0.0.1:27017/denominator

# Expose via localtunnel
lt --port 27017 --subdomain denominator-mongo 2>&1 &
TUNNEL_PID=$!

sleep 5

echo ""
echo "MongoDB should be accessible at: https://denominator-mongo.loca.lt"
echo "BUT MongoDB protocol won't work over HTTP tunnel..."
echo ""

trap "kill $MONGO_PID $TUNNEL_PID 2>/dev/null; exit" INT TERM EXIT
wait
