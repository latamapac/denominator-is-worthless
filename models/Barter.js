const mongoose = require('mongoose');

const barterSchema = new mongoose.Schema({
    initiator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // null = open barter (anyone can accept)
    },
    status: {
        type: String,
        enum: ['pending', 'negotiating', 'accepted', 'completed', 'cancelled', 'expired'],
        default: 'pending'
    },
    offer: {
        item: { type: String, required: true },
        amount: { type: Number, required: true },
        imageUrl: { type: String, default: null },
        estimatedValue: { type: Number, default: 0 }
    },
    request: {
        item: { type: String, required: true },
        amount: { type: Number, required: true },
        imageUrl: { type: String, default: null },
        estimatedValue: { type: Number, default: 0 }
    },
    aiAnalysis: {
        confidence: { type: Number, default: 0 },
        fairness: { type: Number, default: 0 }, // 0-100 how fair the deal is
        factors: {
            utility: { type: Number, default: 0 },
            scarcity: { type: Number, default: 0 },
            sentiment: { type: Number, default: 0 }
        },
        analysis: { type: String, default: '' }
    },
    negotiations: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true },
        counterOffer: {
            item: String,
            amount: Number
        },
        createdAt: { type: Date, default: Date.now }
    }],
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    completedAt: { type: Date },
    ratings: {
        initiator: { type: Number, min: 1, max: 5 },
        recipient: { type: Number, min: 1, max: 5 }
    }
}, {
    timestamps: true
});

// Indexes for faster queries
barterSchema.index({ status: 1, createdAt: -1 });
barterSchema.index({ initiator: 1 });
barterSchema.index({ recipient: 1 });
barterSchema.index({ 'offer.item': 'text', 'request.item': 'text' });

// Virtual for time remaining
barterSchema.virtual('timeRemaining').get(function() {
    return Math.max(0, this.expiresAt - Date.now());
});

// Static method to get active barters
barterSchema.statics.getActiveBarters = function(limit = 20) {
    return this.find({
        status: { $in: ['pending', 'negotiating'] },
        expiresAt: { $gt: new Date() }
    })
    .populate('initiator', 'username avatar stats.reputation')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Instance method to add negotiation message
barterSchema.methods.addNegotiation = async function(userId, message, counterOffer = null) {
    const negotiation = {
        user: userId,
        message,
        createdAt: new Date()
    };
    
    if (counterOffer) {
        negotiation.counterOffer = counterOffer;
    }
    
    this.negotiations.push(negotiation);
    this.status = 'negotiating';
    return await this.save();
};

module.exports = mongoose.model('Barter', barterSchema);
