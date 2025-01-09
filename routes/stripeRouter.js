const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const stripeService = require('../services/stripeService');
const Idea = require('../db/ideaModel');
const User = require('../db/userModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create checkout session for idea purchase
router.post('/create-checkout-session', auth, (req, res) => {
    const { ideaId, amount } = req.body;
    const buyerId = req.userId;

    // First fetch user to check subscription type
    User.findById(buyerId)
        .then(user => {
            if (!user) {
                throw new Error('User not found');
            }
            if (user.subscription !== 'buyer') {
                throw new Error('Only buyers can purchase ideas. Please upgrade your account to buyer status.');
            }

            // After confirming user is a buyer, validate idea
            return Idea.findById(ideaId).populate('creator');
        })
        .then(idea => {
            if (!idea) {
                throw new Error('Idea not found');
            }
            if (idea.isSold) {
                throw new Error('This idea has already been sold');
            }
            if (idea.creator._id.toString() === buyerId.toString()) {
                throw new Error('You cannot buy your own idea');
            }

            // Create checkout session
            return stripeService.createIdeaCheckoutSession({
                ideaId,
                amount,
                buyerId,
                sellerId: idea.creator._id
            });
        })
        .then(session => {
            res.json(session);
        })
        .catch(error => {
            console.error('Error creating checkout session:', error);
            const statusCode = error.message.includes('Only buyers') ? 403 
                           : error.message.includes('not found') ? 404 
                           : 500;
            res.status(statusCode).json({ message: error.message });
        });
});

// Get payment status
router.get('/payment-status/:sessionId', auth, (req, res) => {
    const { sessionId } = req.params;
    
    stripe.checkout.sessions.retrieve(sessionId)
        .then(session => {
            const success = session.payment_status === 'paid';
            res.json({ success });
        })
        .catch(error => {
            console.error('Error getting payment status:', error);
            res.status(500).json({ message: error.message });
        });
});

// Webhook handler for Stripe events
const webhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        await stripeService.handleWebhook(event);
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ message: error.message });
    }
};

router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

module.exports = router;
