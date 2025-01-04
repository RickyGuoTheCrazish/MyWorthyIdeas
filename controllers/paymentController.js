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

            // Get all successful checkout sessions for this user from Stripe
            const checkoutSessions = await stripe.checkout.sessions.list({
                limit: 100, // Adjust as needed
                expand: ['data.line_items']
            });

            // Filter sessions for this user and transform to our format
            const transactions = checkoutSessions.data
                .filter(session => session.metadata?.userId === userId.toString())
                .map(session => ({
                    id: session.id,
                    type: 'deposit',
                    amount: session.amount_total / 100, // Convert from cents to dollars
                    status: session.payment_status,
                    createdAt: new Date(session.created * 1000), // Convert from Unix timestamp
                    processingFee: session.metadata?.processingFee ? parseFloat(session.metadata.processingFee) : 0
                }));

            console.log('Transactions found:', transactions);

            res.json({
                transactions,
                totalPages: 1,
                currentPage: 1
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
