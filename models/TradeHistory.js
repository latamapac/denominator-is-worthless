const mongoose = require('mongoose');

const tradeHistorySchema = new mongoose.Schema({
    barter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barter',
        required: true
    },
    initiator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    offer: {
        item: { type: String, required: true },
        amount: { type: Number, required: true },
        estimatedValue: { type: Number, default: 0 }
    },
    request: {
        item: { type: String, required: true },
        amount: { type: Number, required: true },
        estimatedValue: { type: Number, default: 0 }
    },
    totalValue: { type: Number, default: 0 },
    ratings: {
        initiator: {
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, maxlength: 500 }
        },
        recipient: {
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, maxlength: 500 }
        }
    }
}, {
    timestamps: true
});

// Indexes
tradeHistorySchema.index({ initiator: 1, createdAt: -1 });
tradeHistorySchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('TradeHistory', tradeHistorySchema);
