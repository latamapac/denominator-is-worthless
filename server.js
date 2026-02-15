/**
 * DENOMINATOR IS WORTHLESS - Full Stack Server
 * 
 * Features:
 * - MongoDB database for users, barters, trades
 * - Socket.IO for real-time updates
 * - JWT authentication
 * - AI-powered valuation (OpenRouter/Pollinations)
 * - Rate limiting and security
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const barterRoutes = require('./routes/barters');
const userRoutes = require('./routes/users');
const { socketAuth } = require('./middleware/auth');
const { getBarterValuation, generateItemImage } = require('./utils/aiValuation');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
    }
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/denominator';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "https://image.pollinations.ai"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
        }
    }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Too many requests, please slow down' }
});
app.use('/api/', limiter);

// Stricter rate limiting for auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Database connection
let dbType = 'none';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✓ MongoDB connected');
        dbType = 'mongodb';
    })
    .catch(async err => {
        console.error('✗ MongoDB connection error:', err.message);
        console.log('  Falling back to file-based database...');
        
        // Initialize file-based database
        try {
            const fileDB = require('./utils/fileDB');
            await fileDB.init();
            dbType = 'file';
            console.log('✓ File-based database active');
        } catch (fileErr) {
            console.error('✗ File DB error:', fileErr.message);
            dbType = 'none';
        }
    });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/barters', barterRoutes);
app.use('/api/users', userRoutes);

// AI Valuation endpoint
app.post('/api/valuate', async (req, res) => {
    try {
        const { haveItem, haveAmount, wantItem } = req.body;

        if (!haveItem || !wantItem || !haveAmount) {
            return res.status(400).json({ 
                error: 'Missing required fields: haveItem, haveAmount, wantItem' 
            });
        }

        const result = await getBarterValuation(haveItem, haveAmount, wantItem);
        
        res.json({
            success: true,
            haveItem,
            haveAmount,
            wantItem,
            ...result
        });

    } catch (error) {
        console.error('Valuation error:', error);
        res.status(500).json({ error: 'Failed to calculate valuation' });
    }
});

// Image generation endpoint
app.get('/api/image/:item', async (req, res) => {
    try {
        const item = decodeURIComponent(req.params.item);
        const imageUrl = generateItemImage(item);
        
        res.json({
            success: true,
            item,
            imageUrl
        });
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    const isMongoConnected = mongoose.connection.readyState === 1;
    const dbStatus = isMongoConnected ? 'connected' : dbType;
    
    res.json({
        status: 'operational',
        version: '3.0.0',
        database: dbStatus,
        ai: {
            text: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'pollinations',
            image: 'pollinations'
        },
        features: {
            websocket: true,
            authentication: true,
            database: dbStatus !== 'none'
        }
    });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const { Barter, TradeHistory, User } = require('./models').getModels();

        const [totalBarters, totalTrades, totalUsers, activeBarters] = await Promise.all([
            Barter.countDocuments ? Barter.countDocuments() : Barter.countDocuments(),
            TradeHistory.countDocuments ? TradeHistory.countDocuments() : 0,
            User.countDocuments ? User.countDocuments() : (await User.find({})).length
        ]);

        res.json({
            success: true,
            stats: {
                totalBarters,
                totalTrades,
                totalUsers,
                activeBarters
            }
        });
    } catch (error) {
        res.json({
            success: true,
            stats: {
                totalBarters: 0,
                totalTrades: 0,
                totalUsers: 0,
                activeBarters: 0
            }
        });
    }
});

// Socket.IO connection handling
io.use(socketAuth);

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`, socket.user ? `(User: ${socket.user.username})` : '(Guest)');

    // Join user room for personal updates
    if (socket.user) {
        socket.join(`user:${socket.user._id}`);
    }

    // Join global feed room
    socket.join('feed');

    // Handle barter subscriptions
    socket.on('subscribe_barter', (barterId) => {
        socket.join(`barter:${barterId}`);
        console.log(`Socket ${socket.id} subscribed to barter ${barterId}`);
    });

    socket.on('unsubscribe_barter', (barterId) => {
        socket.leave(`barter:${barterId}`);
        console.log(`Socket ${socket.id} unsubscribed from barter ${barterId}`);
    });

    // Handle typing indicators in negotiations
    socket.on('typing', ({ barterId, username }) => {
        socket.to(`barter:${barterId}`).emit('user_typing', { username });
    });

    // Handle user presence
    socket.on('presence', () => {
        if (socket.user) {
            socket.broadcast.emit('user_online', { userId: socket.user._id, username: socket.user.username });
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        if (socket.user) {
            socket.broadcast.emit('user_offline', { userId: socket.user._id });
        }
    });
});

// Main app route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              DENOMINATOR IS WORTHLESS v3.0.0                   ║
║                   Full Stack Platform                          ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  Server:       http://localhost:${PORT}                        ║
║  Database:     ${mongoose.connection.readyState === 1 ? 'MongoDB ✓' : 'Offline ✗'}                    ║
║  WebSocket:    Socket.IO ready                                 ║
║  AI Text:      ${process.env.OPENROUTER_API_KEY ? 'OpenRouter ✓' : 'Pollinations ✓'}                 ║
║  AI Images:    Pollinations.ai ✓                               ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  Features:                                                     ║
║  ✓ User authentication (JWT)                                   ║
║  ✓ Real-time barter feed (WebSocket)                           ║
║  ✓ Negotiation system                                          ║
║  ✓ User profiles & inventory                                   ║
║  ✓ Trade history & leaderboard                                 ║
║  ✓ AI-powered valuation                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

module.exports = { app, server, io };
