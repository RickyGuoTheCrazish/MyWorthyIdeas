const express = require('express');
const router = express.Router();
const stripeConnectController = require('../controllers/stripeConnectController');
const { auth, sellerAuth } = require('../middlewares/auth');
const User = require('../db/userModel');
const stripe = require('../services/stripeService').stripe;

// Get OAuth link for connecting Stripe account
router.get('/oauth/link', auth, async (req, res, next) => {
    // Only check if user is a seller
    if (req.user.subscription !== 'seller') {
        return res.status(403).json({ 
            message: "Only sellers can access this resource" 
        });
    }
    next();
}, stripeConnectController.getConnectLink);

// Handle OAuth redirect
router.get('/oauth/callback', auth, sellerAuth, stripeConnectController.handleOAuthRedirect);

// Get seller's account status
router.get('/account/status', auth, sellerAuth, stripeConnectController.getAccountStatus);

// Create checkout session for idea purchase
router.post('/checkout', auth, stripeConnectController.createCheckoutSession);

// Create Stripe Connect account
router.post('/create-account', auth, sellerAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.stripeConnectAccountId) {
            return res.status(400).json({ error: 'Stripe Connect account already exists' });
        }

        // Create a Standard connected account
        const account = await stripe.accounts.create({
            type: 'standard',
            country: 'AU',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }
            }
        });

        // Update user with Stripe Connect account ID
        user.stripeConnectAccountId = account.id;
        user.stripeConnectStatus = {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted
        };

        await user.save();

        // Create an account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.CLIENT_URL}/account-settings?connect=refresh`,
            return_url: `${process.env.CLIENT_URL}/account-settings?connect=success`,
            type: 'account_onboarding'
        });

        res.json({ url: accountLink.url });
    } catch (error) {
        console.error('Error creating Stripe Connect account:', error);
        res.status(500).json({ error: 'Failed to create Stripe Connect account' });
    }
});

// Get Stripe Connect account status
router.get('/account-status', auth, sellerAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.stripeConnectAccountId) {
            return res.json({
                connected: false,
                message: 'No Stripe Connect account found'
            });
        }

        // Retrieve the account from Stripe
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

        // Update local status if it's changed
        if (user.stripeConnectStatus.chargesEnabled !== account.charges_enabled ||
            user.stripeConnectStatus.payoutsEnabled !== account.payouts_enabled ||
            user.stripeConnectStatus.detailsSubmitted !== account.details_submitted) {
            
            user.stripeConnectStatus = {
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted
            };
            await user.save();
        }

        res.json({
            connected: true,
            status: user.stripeConnectStatus
        });
    } catch (error) {
        console.error('Error getting Stripe Connect account status:', error);
        res.status(500).json({ error: 'Failed to get account status' });
    }
});

// Create login link for Stripe Connect dashboard
router.get('/login-link', auth, sellerAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.stripeConnectAccountId) {
            return res.status(400).json({ error: 'No Stripe Connect account found' });
        }

        const loginLink = await stripe.accounts.createLoginLink(
            user.stripeConnectAccountId
        );

        res.json({ url: loginLink.url });
    } catch (error) {
        console.error('Error creating login link:', error);
        res.status(500).json({ error: 'Failed to create login link' });
    }
});

module.exports = router;
