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

        const { offer, request, aiAnalysis } = req.body;

        const barter = new Barter({
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
        await barter.populate('initiator', 'username avatar stats.reputation');

        // Update user stats
        await req.user.updateStats(offer.estimatedValue || 0);

        // Emit to all connected clients
        const io = req.app.get('io');
        io.emit('new_barter', barter);

        res.status(201).json({
            success: true,
            barter
        });
    } catch (error) {
        console.error('Create barter error:', error);
        res.status(500).json({ error: 'Failed to create barter' });
    }
});

// Get single barter
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const barter = await Barter.findById(req.params.id)
            .populate('initiator', 'username avatar stats.reputation')
            .populate('recipient', 'username avatar stats.reputation')
            .populate('negotiations.user', 'username avatar');

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
        const barter = await Barter.findById(req.params.id);

        if (!barter) {
            return res.status(404).json({ error: 'Barter not found' });
        }

        if (barter.initiator.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot accept your own barter' });
        }

        if (barter.status !== 'pending' && barter.status !== 'negotiating') {
            return res.status(400).json({ error: 'Barter no longer available' });
        }

        barter.recipient = req.user._id;
        barter.status = 'completed';
        barter.completedAt = new Date();
        await barter.save();

        await barter.populate('initiator recipient', 'username avatar stats.reputation');

        // Create trade history
        const tradeHistory = new TradeHistory({
            barter: barter._id,
            initiator: barter.initiator,
            recipient: barter.recipient,
            offer: barter.offer,
            request: barter.request,
            totalValue: (barter.offer.estimatedValue || 0) + (barter.request.estimatedValue || 0)
        });
        await tradeHistory.save();

        // Update recipient stats
        const recipient = await User.findById(req.user._id);
        await recipient.updateStats(barter.request.estimatedValue || 0);

        // Emit update
        const io = req.app.get('io');
        io.emit('barter_completed', { barter, tradeHistory });

        res.json({
            success: true,
            barter,
            tradeHistory
        });
    } catch (error) {
        console.error('Accept barter error:', error);
        res.status(500).json({ error: 'Failed to accept barter' });
    }
});

// Add negotiation message
router.post('/:id/negotiate', authenticate, [
    body('message').trim().notEmpty().withMessage('Message required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const barter = await Barter.findById(req.params.id);

        if (!barter) {
            return res.status(404).json({ error: 'Barter not found' });
        }

        if (barter.status !== 'pending' && barter.status !== 'negotiating') {
            return res.status(400).json({ error: 'Cannot negotiate this barter' });
        }

        const { message, counterOffer } = req.body;

        await barter.addNegotiation(req.user._id, message, counterOffer);
        await barter.populate('negotiations.user', 'username avatar');

        // Emit update
        const io = req.app.get('io');
        io.emit('barter_negotiation', {
            barterId: barter._id,
            negotiation: barter.negotiations[barter.negotiations.length - 1]
        });

        res.json({
            success: true,
            barter
        });
    } catch (error) {
        console.error('Negotiation error:', error);
        res.status(500).json({ error: 'Failed to add negotiation' });
    }
});

// Cancel barter
router.post('/:id/cancel', authenticate, async (req, res) => {
    try {
        const barter = await Barter.findById(req.params.id);

        if (!barter) {
            return res.status(404).json({ error: 'Barter not found' });
        }

        if (barter.initiator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only initiator can cancel' });
        }

        if (barter.status === 'completed' || barter.status === 'cancelled') {
            return res.status(400).json({ error: 'Barter already finalized' });
        }

        barter.status = 'cancelled';
        await barter.save();

        // Emit update
        const io = req.app.get('io');
        io.emit('barter_cancelled', { barterId: barter._id });

        res.json({
            success: true,
            message: 'Barter cancelled'
        });
    } catch (error) {
        console.error('Cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel barter' });
    }
});

// Get user's barters
router.get('/user/mybarters', authenticate, async (req, res) => {
    try {
        const barters = await Barter.find({
            $or: [
                { initiator: req.user._id },
                { recipient: req.user._id }
            ]
        })
        .populate('initiator recipient', 'username avatar')
        .sort({ createdAt: -1 });

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
