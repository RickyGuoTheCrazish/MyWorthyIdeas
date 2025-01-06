const stripeConnectService = require('../services/stripeConnectService');

class StripeConnectController {
    constructor() {
        this.getConnectLink = this.getConnectLink.bind(this);
        this.handleOAuthRedirect = this.handleOAuthRedirect.bind(this);
        this.getAccountStatus = this.getAccountStatus.bind(this);
        this.createCheckoutSession = this.createCheckoutSession.bind(this);
    }

    /**
     * Get OAuth link for connecting Stripe account
     */
    async getConnectLink(req, res) {
        try {
            console.log('Generating connect link for user:', req.user._id);
            const link = await stripeConnectService.createConnectAccountLink();
            console.log('Generated link:', link);
            res.json({ url: link });
        } catch (error) {
            console.error('Error creating connect link:', error);
            res.status(500).json({ error: 'Failed to create connect link' });
        }
    }

    /**
     * Handle OAuth redirect
     */
    async handleOAuthRedirect(code, userId) {
        try {
            if (!code) {
                throw new Error('Missing authorization code');
            }

            await stripeConnectService.handleOAuthRedirect(code, userId);
            return { success: true };
        } catch (error) {
            console.error('Error handling OAuth redirect:', error);
            throw error;
        }
    }

    /**
     * Get seller's account status
     */
    async getAccountStatus(req, res) {
        try {
            const userId = req.user._id;
            const status = await stripeConnectService.getAccountStatus(userId);
            res.json(status);
        } catch (error) {
            console.error('Error getting account status:', error);
            res.status(500).json({ error: 'Failed to get account status' });
        }
    }

    /**
     * Create checkout session for idea purchase
     */
    async createCheckoutSession(req, res) {
        try {
            const { amount, sellerId, ideaId } = req.body;
            const buyerId = req.user._id;

            if (!amount || !sellerId || !ideaId) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }

            const session = await stripeConnectService.createSellerCheckoutSession({
                amount: Math.round(amount * 100), // Convert to cents
                sellerId,
                buyerId,
                ideaId
            });

            res.json({ id: session.id });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Failed to create checkout session' });
        }
    }
}

module.exports = new StripeConnectController();
