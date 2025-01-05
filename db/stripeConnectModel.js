const mongoose = require('mongoose');

const stripeConnectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    stripeAccountId: {
        type: String,
        required: true,
        unique: true
    },
    accountStatus: {
        type: String,
        enum: ['pending', 'active', 'restricted', 'disabled'],
        default: 'pending'
    },
    payoutsEnabled: {
        type: Boolean,
        default: false
    },
    chargesEnabled: {
        type: Boolean,
        default: false
    },
    detailsSubmitted: {
        type: Boolean,
        default: false
    },
    country: {
        type: String,
        default: 'AU'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

stripeConnectSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('StripeConnect', stripeConnectSchema);
