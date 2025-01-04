const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'purchase', 'earning'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    baseAmount: {
        type: Number,
        required: function() {
            return this.type === 'deposit';
        }
    },
    processingFee: {
        type: Number,
        required: function() {
            return this.type === 'deposit';
        }
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'bank_transfer'],
        required: true
    },
    paymentDetails: {
        stripePaymentId: String,
        stripeTransferId: String,
        stripeSessionId: String,
        accountNumber: String,
        routingNumber: String
    },
    description: String,
    metadata: {
        type: Map,
        of: String
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

// Update the updatedAt timestamp before saving
transactionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
