const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');
const fs = require('fs');

// Use /tmp for Render (ephemeral filesystem) or local data directory
function getDataDir() {
  // Try /tmp first for Render
  const tmpDir = '/tmp/data';
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    // Test if we can write
    fs.writeFileSync(path.join(tmpDir, '.test'), 'test');
    fs.unlinkSync(path.join(tmpDir, '.test'));
    return tmpDir;
  } catch (err) {
    console.log('/tmp not writable, trying local data dir');
  }
  
  // Fallback to local data directory
  const localDir = path.join(__dirname, '../data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (err) {
    console.log('Local data dir failed, using memory only');
    return null;
  }
}

const dataDir = getDataDir();
let adapter;
let db;

if (dataDir) {
  adapter = new JSONFile(path.join(dataDir, 'db.json'));
  db = new Low(adapter, {
    users: [],
    barters: [],
    trades: []
  });
} else {
  // In-memory fallback
  console.log('Using in-memory database (data will be lost on restart)');
  const memoryData = { users: [], barters: [], trades: [] };
  db = {
    data: memoryData,
    read: async () => {},
    write: async () => {}
  };
}

async function init() {
  try {
    await db.read();
    if (!db.data) {
      db.data = { users: [], barters: [], trades: [] };
    }
    await db.write();
    console.log('✓ FileDB initialized at:', dataDir || 'memory');
    return true;
  } catch (err) {
    console.error('FileDB init error:', err.message);
    // Use memory as fallback
    db.data = { users: [], barters: [], trades: [] };
    db.read = async () => {};
    db.write = async () => {};
    return true;
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
  },
  
  async find() {
    await db.read();
    return db.data.users;
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
