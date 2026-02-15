const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getModels } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Get all active barters (public feed)
router.get('/feed', optionalAuth, async (req, res) => {
    try {
        const { Barter } = getModels();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        let barters;
        let total;
        
        if (Barter.getActiveBarters) {
            // MongoDB
            const skip = (page - 1) * limit;
            barters = await Barter.getActiveBarters(limit).skip(skip);
            total = await Barter.countDocuments({
                status: { $in: ['pending', 'negotiating'] },
                expiresAt: { $gt: new Date() }
            });
        } else {
            // FileDB
            barters = await Barter.find({ 
                status: { $in: ['pending', 'negotiating'] }
            });
            total = barters.length;
            barters = barters.slice(0, limit);
        }

        res.json({
            success: true,
            barters,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// Create new barter
router.post('/create', authenticate, [
    body('offer.item').trim().notEmpty().withMessage('Offer item required'),
    body('offer.amount').isFloat({ min: 0.01 }).withMessage('Valid offer amount required'),
    body('request.item').trim().notEmpty().withMessage('Request item required'),
    body('request.amount').isFloat({ min: 0.01 }).withMessage('Valid request amount required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { Barter, User } = getModels();
        const { offer, request, aiAnalysis } = req.body;

        let barter;
        
        if (Barter.create) {
            // FileDB
            barter = await Barter.create({
                initiator: req.user._id,
                offer: {
                    item: offer.item,
                    amount: offer.amount,
                    imageUrl: offer.imageUrl || null,
                    estimatedValue: offer.estimatedValue || 0
                },
                request: {
                    item: request.item,
                    amount: request.amount,
                    imageUrl: request.imageUrl || null,
                    estimatedValue: request.estimatedValue || 0
                },
                aiAnalysis: aiAnalysis || {}
            });
        } else {
            // MongoDB
            barter = new Barter({
                initiator: req.user._id,
                offer: {
                    item: offer.item,
                    amount: offer.amount,
                    imageUrl: offer.imageUrl,
                    estimatedValue: offer.estimatedValue || 0
                },
                request: {
                    item: request.item,
                    amount: request.amount,
                    imageUrl: request.imageUrl,
                    estimatedValue: request.estimatedValue || 0
                },
                aiAnalysis: aiAnalysis || {}
            });
            await barter.save();
        }

        // Update user stats if method exists
        if (User && User.updateStats) {
            await User.updateStats(offer.estimatedValue || 0);
        }

        // Emit to all connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('new_barter', barter);
        }

        res.status(201).json({
            success: true,
            barter
        });
    } catch (error) {
        console.error('Create barter error:', error);
        res.status(500).json({ error: 'Failed to create barter: ' + error.message });
    }
});

// Get single barter
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { Barter } = getModels();
        let barter;
        
        if (Barter.findById) {
            barter = await Barter.findById(req.params.id);
        }

        if (!barter) {
            return res.status(404).json({ error: 'Barter not found' });
        }

        res.json({
            success: true,
            barter
        });
    } catch (error) {
        console.error('Get barter error:', error);
        res.status(500).json({ error: 'Failed to fetch barter' });
    }
});

// Accept barter
router.post('/:id/accept', authenticate, async (req, res) => {
    try {
        const { Barter, User } = getModels();
        let barter;
        
        if (Barter.findById) {
            barter = await Barter.findById(req.params.id);
        }

        if (!barter) {
            return res.status(404).json({ error: 'Barter not found' });
        }

        // Update barter status
        barter.status = 'completed';
        barter.completedAt = new Date();
        
        if (Barter.update) {
            await Barter.update(barter);
        }

        res.json({
            success: true,
            barter
        });
    } catch (error) {
        console.error('Accept barter error:', error);
        res.status(500).json({ error: 'Failed to accept barter' });
    }
});

// Get user's barters
router.get('/user/mybarters', authenticate, async (req, res) => {
    try {
        const { Barter } = getModels();
        let barters = [];
        
        if (Barter.find) {
            barters = await Barter.find({
                initiator: req.user._id
            });
        }

        res.json({
            success: true,
            barters
        });
    } catch (error) {
        console.error('My barters error:', error);
        res.status(500).json({ error: 'Failed to fetch barters' });
    }
});

module.exports = router;
