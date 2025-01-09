// /db/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    subscription: {
        type: String,
        enum: ['buyer', 'seller'],
        default: 'buyer'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExp: Date,
    lastVerificationSentAt: Date,
    postedIdeas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea'
    }],
    boughtIdeas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Idea'
    }],
    profileImage: {
        type: String,
        default: ''
    },
    stripeCustomerId: String,
    stripeConnectAccountId: String,
    stripeConnectStatus: {
        accountStatus: {
            type: String,
            enum: ['pending', 'active', 'rejected'],
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
        }
    }
}, {
    timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Remove password hashing from pre-save middleware
    next();
});

// Create indexes for unique fields
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// Method to compare password
userSchema.methods.comparePassword = function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to get average rating
userSchema.statics.getAverageRating = async function(userId) {
    try {
        const ideas = await mongoose.model('Idea').find({
            creator: userId,
            rating: { $exists: true, $ne: null }
        }).select('rating');

        if (!ideas || ideas.length === 0) {
            return 0;
        }

        const sum = ideas.reduce((acc, idea) => acc + idea.rating, 0);
        return Number((sum / ideas.length).toFixed(1));
    } catch (error) {
        console.error('Error calculating average rating:', error);
        return 0;
    }
};

// Configure toJSON to include virtuals
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
