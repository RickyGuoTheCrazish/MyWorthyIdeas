const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../db/userModel');
const Transaction = require('../db/transactionModel');
const StripeConnect = require('../db/stripeConnectModel');
const Idea = require('../db/ideaModel'); // Import Idea model
const mongoose = require('mongoose'); // Import mongoose

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
     * Creates a Stripe Checkout session for idea purchase
     * The flow works as follows:
     * 1. Customer pays the full amount
     * 2. Stripe automatically:
     *    - Takes the platform fee (3%) and transfers it to our platform's main Stripe account
     *    - Transfers the remaining 97% to the seller's connected Stripe account
     * 3. Both transfers happen automatically once the payment is successful
     */
    async createIdeaCheckoutSession({ ideaId, amount, buyerId, sellerId }) {
        try {
            console.log('Creating checkout session with params:', JSON.stringify({
                ideaId, amount, buyerId, sellerId
            }, null, 2));

            // Get seller's Stripe account ID and user details
            const [sellerStripeConnect, seller, idea] = await Promise.all([
                StripeConnect.findOne({ userId: sellerId }),
                User.findById(sellerId),
                Idea.findById(ideaId)
            ]);

            console.log('Seller Stripe Connect details:', JSON.stringify({
                hasAccountId: !!sellerStripeConnect?.stripeAccountId,
                accountId: sellerStripeConnect?.stripeAccountId?.substring(0, 10) + '...',
                userId: sellerStripeConnect?.userId
            }, null, 2));

            if (!sellerStripeConnect || !sellerStripeConnect.stripeAccountId) {
                throw new Error('Seller has not connected their Stripe account');
            }

            // Fetch the connected account details from Stripe
            const stripeAccount = await stripe.accounts.retrieve(sellerStripeConnect.stripeAccountId);
            console.log('Stripe Account Details:', JSON.stringify({
                id: stripeAccount.id?.substring(0, 10) + '...',
                businessType: stripeAccount.business_type,
                chargesEnabled: stripeAccount.charges_enabled,
                payoutsEnabled: stripeAccount.payouts_enabled,
                detailsSubmitted: stripeAccount.details_submitted,
                businessProfile: {
                    name: stripeAccount.business_profile?.name,
                    url: stripeAccount.business_profile?.url,
                    productDescription: stripeAccount.business_profile?.product_description
                },
                capabilities: stripeAccount.capabilities,
                requirementsDisabled: stripeAccount.requirements?.disabled_reason,
                requirementsPending: stripeAccount.requirements?.pending_verification,
                requirementsCurrent: stripeAccount.requirements?.currently_due
            }, null, 2));

            if (!seller) {
                throw new Error('Seller not found');
            }

            if (!idea) {
                throw new Error('Idea not found');
            }
         
            // Calculate amounts
            const amountInCents = Math.round(amount * 100);
            const platformFeePercent = 3;
            const platformFeeAmount = Math.round(amountInCents * platformFeePercent / 100);

            console.log('Creating Stripe Checkout Session with:', JSON.stringify({
                amountInCents,
                platformFeeAmount,
                totalAmount: amount,
                currency: 'aud',
                accountId: sellerStripeConnect.stripeAccountId?.substring(0, 10) + '...',
                ideaTitle: idea.title
            }, null, 2));

            // Create Checkout Session
            const session = await stripe.checkout.sessions.create(
                {
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'aud',
                            product_data: {
                                name: idea.title,
                                description: 'Purchase of idea content and rights',
                                images: idea.images || []
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    }],
                    mode: 'payment',
                    success_url: `${process.env.CLIENT_URL}/ideas/${ideaId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${process.env.CLIENT_URL}/ideas/${ideaId}?canceled=true`,
                    payment_intent_data: {
                        application_fee_amount: platformFeeAmount
                    },
                    metadata: {
                        ideaId,
                        buyerId,
                        sellerId,
                        type: 'idea_purchase',
                        amount: amount,
                        platformFee: platformFeeAmount / 100,
                        connectedAccountId: sellerStripeConnect.stripeAccountId
                    }
                },
                {
                    stripeAccount: sellerStripeConnect.stripeAccountId
                }
            );

            console.log('Created Checkout Session:', JSON.stringify({
                sessionId: session.id?.substring(0, 10) + '...',
                hasUrl: !!session.url,
                paymentIntentId: session.payment_intent?.substring(0, 10) + '...',
                accountId: sellerStripeConnect.stripeAccountId?.substring(0, 10) + '...'
            }, null, 2));

            return {
                url: session.url,
                sessionId: session.id,
                connectedAccountId: sellerStripeConnect.stripeAccountId
            };
        } catch (error) {
            console.error('Error in createIdeaCheckoutSession:', error);
            if (error.type === 'StripeError') {
                console.error('Stripe Error Details:', JSON.stringify({
                    message: error.message,
                    code: error.code,
                    type: error.type,
                    requestId: error.requestId,
                    docUrl: error.doc_url
                }, null, 2));
            }
            throw error;
        }
    }

    async handleSuccessfulPayment(sessionId, connectedAccountId) {
        try {
            console.log('Retrieving session with ID:', sessionId, 'from account:', connectedAccountId);
            
            // Retrieve the session using the connected account
            const session = await stripe.checkout.sessions.retrieve(
                sessionId
            );

            console.log('Retrieved session:', JSON.stringify({
                id: session.id?.substring(0, 10) + '...',
                paymentStatus: session.payment_status,
                metadata: session.metadata
            }, null, 2));

            if (!session) {
                throw new Error('Session not found');
            }

            if (session.payment_status !== 'paid') {
                throw new Error('Payment not completed');
            }

            const { ideaId, buyerId, sellerId, amount, platformFee } = session.metadata;

            // Create transaction record
            const transaction = new Transaction({
                ideaId,
                buyerId,
                sellerId,
                amount: parseFloat(amount),
                platformFee: parseFloat(platformFee),
                stripeSessionId: session.id,
                status: 'completed',
                paymentIntentId: session.payment_intent
            });

            await transaction.save();

            // Update idea status
            await Idea.findByIdAndUpdate(ideaId, {
                $set: { status: 'sold', buyerId }
            });

            return transaction;
        } catch (error) {
            console.error('Error handling successful payment:', error);
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
                case 'account.updated': {
                    const account = event.data.object;
                    
                    // Update seller's account status
                    await StripeConnect.findOneAndUpdate(
                        { stripeAccountId: account.id },
                        {
                            accountStatus: account.charges_enabled ? 'active' : 'pending',
                            payoutsEnabled: account.payouts_enabled,
                            chargesEnabled: account.charges_enabled,
                            detailsSubmitted: account.details_submitted
                        }
                    );
                    break;
                }
                
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;
                case 'payment_intent.failed':
                    await this.handlePaymentFailure(event.data.object);
                    break;
                case 'checkout.session.completed':
                    await this.handleSuccessfulPayment(event.data.object.id, event.data.object.metadata.connectedAccountId);
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
