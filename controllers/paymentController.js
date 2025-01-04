const stripeService = require('../services/stripeService');
const Transaction = require('../db/transactionModel');
const User = require('../db/userModel');

const CREDIT_MULTIPLIER = 10; // 1 USD = 10 credits

class PaymentController {
    /**
     * Initialize payment intent for deposit
     * @param {Object} req Request object
     * @param {Object} res Response object
     */
    async initializeDeposit(req, res) {
        try {
            console.log('Initializing deposit with body:', req.body);
            const { amount } = req.body;
            const userId = req.user._id;

            if (!amount || amount <= 0) {
                console.log('Invalid amount:', amount);
                return res.status(400).json({ error: 'Invalid amount' });
            }

            console.log('Creating payment intent for user:', userId, 'amount:', amount);
            const result = await stripeService.createPaymentIntent(
                amount,
                userId.toString()
            );
            console.log('Payment intent created:', result);

            res.json(result);
        } catch (error) {
            console.error('Error initializing deposit:', error);
            res.status(500).json({ error: 'Failed to initialize deposit' });
        }
    }

    /**
     * Process withdrawal request
     * @param {Object} req Request object
     * @param {Object} res Response object
     */
    async processWithdrawal(req, res) {
        try {
            console.log('Processing withdrawal with body:', req.body);
            const { amount } = req.body;
            const userId = req.user._id;
            const user = await User.findById(userId);

            if (!amount || amount <= 0) {
                console.log('Invalid amount:', amount);
                return res.status(400).json({ error: 'Invalid amount' });
            }

            // Check if user has enough balance
            const creditsNeeded = amount * CREDIT_MULTIPLIER;
            if (user.subscription === 'seller' && user.earnings < creditsNeeded) {
                console.log('Insufficient earnings for user:', userId);
                return res.status(400).json({ error: 'Insufficient earnings' });
            } else if (user.subscription === 'buyer' && user.credits < creditsNeeded) {
                console.log('Insufficient credits for user:', userId);
                return res.status(400).json({ error: 'Insufficient credits' });
            }

            // Verify user has a connected Stripe account
            if (!user.stripeAccountId) {
                console.log('No payment method found for user:', userId);
                return res.status(400).json({ 
                    error: 'No payment method found',
                    code: 'NO_PAYMENT_METHOD'
                });
            }

            console.log('Processing withdrawal for user:', userId, 'amount:', amount);
            // Process withdrawal
            const transaction = await stripeService.createPayout(
                amount,
                userId,
                user.stripeAccountId
            );
            console.log('Withdrawal processed:', transaction);

            // Update user balance
            if (user.subscription === 'seller') {
                user.earnings -= creditsNeeded;
            } else {
                user.credits -= creditsNeeded;
            }
            await user.save();
            console.log('User balance updated:', user);

            res.json({ transaction });
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            res.status(500).json({ error: 'Failed to process withdrawal' });
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
        console.log('Handling Stripe webhook');
        const sig = req.headers['stripe-signature'];

        try {
            const event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
            console.log('Webhook event:', event);

            await stripeService.handleWebhookEvent(event);
            res.json({ received: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(400).json({ error: 'Webhook error' });
        }
    }
}

module.exports = PaymentController;
