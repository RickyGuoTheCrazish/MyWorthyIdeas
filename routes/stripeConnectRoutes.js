const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { stripeConnectService } = require('../services');
const StripeConnectController = require('../controllers/stripeConnectController');

// Create controller instance with injected service
const controller = new StripeConnectController(stripeConnectService);

// Get account status
router.get('/account/status', auth, controller.getAccountStatus);

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

module.exports = router;
