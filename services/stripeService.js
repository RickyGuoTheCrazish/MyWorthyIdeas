const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../db/transactionModel');

class StripeService {
    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
        }
    }

    /**
     * Create a payment intent for deposit
     * @param {number} amount Amount in USD
     * @param {string} userId User ID
     * @returns {Promise<{clientSecret: string, paymentIntentId: string}>}
     */
    async createPaymentIntent(amount, userId) {
        try {
            // Convert amount to cents for Stripe
            const amountInCents = Math.round(amount * 100);
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                metadata: {
                    userId,
                    type: 'deposit'
                },
                automatic_payment_methods: {
                    enabled: true,
                }
            });

            // Create a pending transaction
            await Transaction.create({
                userId,
                type: 'deposit',
                amount,
                status: 'pending',
                paymentMethod: 'stripe',
                paymentDetails: {
                    stripePaymentId: paymentIntent.id
                }
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }

    /**
     * Create a payout for withdrawal
     * @param {number} amount Amount in USD
     * @param {string} userId User ID
     * @param {string} accountId Stripe connected account ID
     * @returns {Promise<Transaction>}
     */
    async createPayout(amount, userId, accountId) {
        try {
            const transfer = await stripe.transfers.create({
                amount: amount * 100, // Convert to cents
                currency: 'usd',
                destination: accountId,
                metadata: {
                    userId,
                    type: 'withdrawal'
                }
            });

            // Create a completed transaction
            const transaction = await Transaction.create({
                userId,
                type: 'withdrawal',
                amount,
                status: 'completed',
                paymentMethod: 'stripe',
                paymentDetails: {
                    stripeTransferId: transfer.id
                }
            });

            return transaction;
        } catch (error) {
            console.error('Error creating payout:', error);
            throw error;
        }
    }

    /**
     * Handle Stripe webhook events
     * @param {Object} event Stripe webhook event
     * @returns {Promise<void>}
     */
    async handleWebhookEvent(event) {
        try {
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;
                case 'payment_intent.failed':
                    await this.handlePaymentFailure(event.data.object);
                    break;
                // Add more event handlers as needed
            }
        } catch (error) {
            console.error('Error handling webhook event:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment
     * @param {Object} paymentIntent Stripe payment intent object
     * @returns {Promise<void>}
     */
    async handlePaymentSuccess(paymentIntent) {
        const transaction = await Transaction.findOne({
            'paymentDetails.stripePaymentId': paymentIntent.id
        });

        if (transaction) {
            transaction.status = 'completed';
            await transaction.save();
        }
    }

    /**
     * Handle failed payment
     * @param {Object} paymentIntent Stripe payment intent object
     * @returns {Promise<void>}
     */
    async handlePaymentFailure(paymentIntent) {
        const transaction = await Transaction.findOne({
            'paymentDetails.stripePaymentId': paymentIntent.id
        });

        if (transaction) {
            transaction.status = 'failed';
            await transaction.save();
        }
    }
}

module.exports = new StripeService();
