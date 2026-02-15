const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    avatar: {
        type: String,
        default: null
    },
    stats: {
        totalBarters: { type: Number, default: 0 },
        successfulTrades: { type: Number, default: 0 },
        reputation: { type: Number, default: 100 },
        totalValueTraded: { type: Number, default: 0 }
    },
    inventory: [{
        item: { type: String, required: true },
        amount: { type: Number, default: 1 },
        estimatedValue: { type: Number, default: 0 },
        imageUrl: { type: String, default: null },
        addedAt: { type: Date, default: Date.now }
    }],
    preferences: {
        theme: { type: String, default: 'cyberpunk' },
        notifications: { type: Boolean, default: true }
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update stats method
userSchema.methods.updateStats = async function(barterValue) {
    this.stats.totalBarters += 1;
    this.stats.totalValueTraded += barterValue;
    await this.save();
};

module.exports = mongoose.model('User', userSchema);
