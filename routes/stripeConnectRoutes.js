const express = require('express');
const router = express.Router();
const { auth, sellerAuth } = require('../middlewares/auth');
const User = require('../db/userModel');
const { stripeConnectService } = require('../services');
const stripe = require('../services').stripe;

// Create controller instance with injected service
const StripeConnectController = require('../controllers/stripeConnectController');
const controller = new StripeConnectController(stripeConnectService);

// Get account status
router.get('/status', auth, controller.getAccountStatus);

// Get OAuth link for connecting Stripe account
router.get('/oauth/link', auth, (req, res, next) => {
    console.log('OAuth link route hit by user:', req.user._id);
    if (!req.user._id) {
        return res.status(401).json({
            error: 'User not authenticated'
        });
    }
    next();
}, controller.getConnectLink);

// Handle OAuth redirect
router.post('/oauth/callback', auth, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Missing authorization code' });
        }
        const result = await controller.handleOAuthRedirect(code, req.user._id);
        res.json(result);
    } catch (error) {
        console.error('Error handling OAuth redirect:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create checkout session for idea purchase
router.post('/checkout', auth, controller.createCheckoutSession);

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
router.get('/account-status', auth, async (req, res) => {
    try {
        const status = await stripeConnectService.getAccountStatus(req.user.id);
        res.json(status);
    } catch (error) {
        console.error('Error getting account status:', error);
        res.status(500).json({ error: error.message });
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
