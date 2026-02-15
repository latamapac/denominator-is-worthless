const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

// Use /tmp for Render (ephemeral filesystem) or local data directory
const dataDir = process.env.RENDER ? '/tmp/data' : path.join(__dirname, '../data');

// Ensure data directory exists
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create data directory:', err.message);
  // Fallback to /tmp
  const tmpDir = '/tmp/data';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

// Use file-based database as fallback when MongoDB is not available
const adapter = new JSONFile(path.join(dataDir, 'db.json'));
const db = new Low(adapter, {
  users: [],
  barters: [],
  trades: []
});

async function init() {
  try {
    await db.read();
    if (!db.data) {
      db.data = { users: [], barters: [], trades: [] };
    }
    await db.write();
    return true;
  } catch (err) {
    console.error('FileDB init error:', err.message);
    throw err;
  }
}

// User operations
const users = {
  async create(userData) {
    await db.read();
    const user = {
      _id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    db.data.users.push(user);
    await db.write();
    return user;
  },
  
  async findOne(query) {
    await db.read();
    return db.data.users.find(u => {
      for (const [key, value] of Object.entries(query)) {
        if (u[key] !== value) return false;
      }
      return true;
    });
  },
  
  async findById(id) {
    await db.read();
    return db.data.users.find(u => u._id === id);
  }
};

// Barter operations
const barters = {
  async create(barterData) {
    await db.read();
    const barter = {
      _id: Date.now().toString(),
      ...barterData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    db.data.barters.unshift(barter);
    await db.write();
    return barter;
  },
  
  async find(query = {}) {
    await db.read();
    let results = db.data.barters;
    
    if (query.status) {
      results = results.filter(b => query.status.$in?.includes(b.status) || b.status === query.status);
    }
    if (query.expiresAt?.$gt) {
      results = results.filter(b => new Date(b.expiresAt) > new Date());
    }
    
    return results;
  },
  
  async findById(id) {
    await db.read();
    return db.data.barters.find(b => b._id === id);
  },
  
  async countDocuments(query = {}) {
    const docs = await this.find(query);
    return docs.length;
  }
};

module.exports = { init, users, barters, db };
