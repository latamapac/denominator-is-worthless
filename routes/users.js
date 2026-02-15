const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TradeHistory = require('../models/TradeHistory');
const Barter = require('../models/Barter');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get user profile
router.get('/profile/:username', optionalAuth, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username.toLowerCase() })
            .select('-password -email');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get recent trades
        const recentTrades = await TradeHistory.find({
            $or: [{ initiator: user._id }, { recipient: user._id }]
        })
        .populate('initiator recipient', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(10);

        // Get active barters
        const activeBarters = await Barter.find({
            initiator: user._id,
            status: { $in: ['pending', 'negotiating'] }
        })
        .populate('initiator', 'username avatar')
        .sort({ createdAt: -1 })
        .limit(5);

        res.json({
            success: true,
            user: {
                ...user.toObject(),
                recentTrades,
                activeBarters
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.patch('/profile', authenticate, async (req, res) => {
    try {
        const { avatar, preferences } = req.body;
        const updates = {};

        if (avatar) updates.avatar = avatar;
        if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Add item to inventory
router.post('/inventory', authenticate, async (req, res) => {
    try {
        const { item, amount, estimatedValue, imageUrl } = req.body;

        const user = await User.findById(req.user._id);
        user.inventory.push({
            item,
            amount: amount || 1,
            estimatedValue: estimatedValue || 0,
            imageUrl,
            addedAt: new Date()
        });

        await user.save();

        res.json({
            success: true,
            inventory: user.inventory
        });
    } catch (error) {
        console.error('Add inventory error:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Remove item from inventory
router.delete('/inventory/:itemId', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.inventory = user.inventory.filter(
            item => item._id.toString() !== req.params.itemId
        );
        await user.save();

        res.json({
            success: true,
            inventory: user.inventory
        });
    } catch (error) {
        console.error('Remove inventory error:', error);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find()
            .select('username avatar stats')
            .sort({ 'stats.totalValueTraded': -1 })
            .limit(20);

        res.json({
            success: true,
            leaderboard: users
        });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Search users
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.json({ users: [] });
        }

        const users = await User.find({
            username: { $regex: q.toLowerCase(), $options: 'i' }
        })
        .select('username avatar stats.reputation')
        .limit(10);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

module.exports = router;
