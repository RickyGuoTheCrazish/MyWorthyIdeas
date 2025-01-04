const stripeService = require('../services/stripeService');
const Transaction = require('../db/transactionModel');
const User = require('../db/userModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CREDIT_MULTIPLIER = 10; // 1 USD = 10 credits

// Webhook secret from Stripe CLI
class PaymentController {
    /**
     * Create Stripe Checkout session for deposit
     * @param {Object} req Request object
     * @param {Object} res Response object
     */
    async initializeDeposit(req, res) {
        try {
            console.log('Initializing Stripe Checkout with body:', req.body);
            const { amount } = req.body;
            const userId = req.user._id;

            if (!amount || amount <= 0) {
                console.log('Invalid amount:', amount);
                return res.status(400).json({ error: 'Invalid amount' });
            }

            const session = await stripeService.createCheckoutSession(amount, userId);
            console.log('Created checkout session:', session.id);
            res.json({ id: session.id });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Failed to initialize checkout' });
        }
    }

    /**
     * Get transaction history
     * @param {Object} req Request object
     * @param {Object} res Response object
     */
    async getTransactionHistory(req, res) {
        try {
            console.log('Getting transaction history for user:', req.user._id);
            const userId = req.user._id;
            const { page = 1, limit = 10 } = req.query;

            const transactions = await Transaction.find({ userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);
            console.log('Transactions found:', transactions);

            const total = await Transaction.countDocuments({ userId });
            console.log('Total transactions:', total);

            res.json({
                transactions,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            });
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            res.status(500).json({ error: 'Failed to fetch transaction history' });
        }
    }

    /**
     * Handle Stripe webhooks
     * @param {Object} req Request object
     * @param {Object} res Response object
     */
    async handleWebhook(req, res) {
        console.log('\n=== Webhook Request Received ===');
        const sig = req.headers['stripe-signature'];
        console.log('Stripe Signature:', sig);
        console.log('Request URL:', req.originalUrl);
        console.log('Request Method:', req.method);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body Type:', typeof req.body);
        console.log('Body Length:', req.body ? req.body.length : 0);
        console.log('Body is Buffer?:', Buffer.isBuffer(req.body));
        console.log('================================\n');

        try {
            const event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET // Use the CLI webhook secret
            );
            console.log('Successfully constructed event:', event.type);

            await stripeService.handleWebhookEvent(event);
            console.log('Successfully handled webhook event');
            res.json({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            console.error('Error details:', {
                type: error.type,
                message: error.message,
                raw: error.raw
            });
            return res.status(400).json({ 
                error: error.message,
                type: error.type,
                detail: error.detail 
            });
        }
    }
}

module.exports = PaymentController;
