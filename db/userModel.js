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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('passwordHash')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Create indexes for unique fields
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.passwordHash);
    } catch (error) {
        throw error;
    }
};

// Virtual: averageRating
userSchema.virtual("averageRating").get(function() {
    if (!this.postedIdeas || this.postedIdeas.length === 0) {
        return 0;
    }

    let sum = 0;
    let count = 0;

    this.postedIdeas.forEach(idea => {
        if (idea.rating != null) {
            sum += idea.rating;
            count++;
        }
    });

    return count > 0 ? sum / count : 0;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
