const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../db/userModel');
const Transaction = require('../db/transactionModel');

const CREDIT_MULTIPLIER = 10; // 1 USD = 10 credits

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
     * Create a Stripe Checkout session
     * @param {number} amount Amount in USD
     * @param {string} userId User ID
     * @returns {Promise<{id: string}>}
     */
    async createCheckoutSession(amount, userId) {
        try {
            // Calculate processing fee (1% with max $2)
            const processingFee = Math.min(amount * 0.01, 2);
            const totalAmount = amount + processingFee;

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Credits Purchase',
                                description: `${amount * CREDIT_MULTIPLIER} Credits`,
                            },
                            unit_amount: amount * 100, // Convert to cents
                        },
                        quantity: 1,
                    },
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'Processing Fee',
                                description: '1% processing fee',
                            },
                            unit_amount: processingFee * 100, // Convert to cents
                        },
                        quantity: 1,
                    }
                ],
                metadata: {
                    userId: userId.toString(),
                    credits: (amount * CREDIT_MULTIPLIER).toString(),
                    processingFee: processingFee.toString(),
                },
                success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.CLIENT_URL}/account`,
            });

            // Create a pending transaction
            await Transaction.create({
                userId,
                type: 'deposit',
                amount: totalAmount, // Store total amount including fee
                baseAmount: amount, // Store original amount
                processingFee, // Store processing fee separately
                status: 'pending',
                paymentMethod: 'stripe',
                paymentDetails: {
                    stripeSessionId: session.id
                }
            });

            return { id: session.id };
        } catch (error) {
            console.error('Error creating checkout session:', error);
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
            console.log('Processing webhook event:', event.type);
            
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;
                case 'payment_intent.failed':
                    await this.handlePaymentFailure(event.data.object);
                    break;
                case 'checkout.session.completed':
                    console.log('Handling checkout.session.completed');
                    const session = event.data.object;
                    console.log('Session data:', {
                        metadata: session.metadata,
                        amount: session.amount_total,
                        status: session.status
                    });

                    const { userId, credits, processingFee } = session.metadata;
                    if (!userId || !credits) {
                        console.error('Missing metadata in session:', session.metadata);
                        return;
                    }

                    // Update user's credits
                    const user = await User.findById(userId);
                    if (!user) {
                        console.error('User not found:', userId);
                        return;
                    }

                    console.log('Updating user credits:', {
                        before: user.credits,
                        adding: parseInt(credits),
                        after: user.credits + parseInt(credits)
                    });

                    user.credits += parseInt(credits);
                    await user.save();

                    // Update existing transaction or create new one
                    const existingTransaction = await Transaction.findOne({
                        'paymentDetails.stripeSessionId': session.id
                    });

                    if (existingTransaction) {
                        console.log('Updating existing transaction:', existingTransaction._id);
                        existingTransaction.status = 'completed';
                        await existingTransaction.save();
                    } else {
                        const baseAmount = session.amount_total / 100 - parseFloat(processingFee);
                        console.log('Creating new transaction for session:', session.id);
                        await Transaction.create({
                            userId,
                            type: 'deposit',
                            amount: session.amount_total / 100,
                            baseAmount,
                            processingFee: parseFloat(processingFee),
                            status: 'completed',
                            paymentMethod: 'stripe',
                            paymentDetails: {
                                stripeSessionId: session.id
                            }
                        });
                    }
                    console.log('Checkout session processing completed');
                    break;
                default:
                    console.log('Unhandled event type:', event.type);
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
