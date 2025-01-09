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
         
            // Calculate base amount and platform fee
            const baseAmount = Math.floor(amount); // $12.00
            const platformFeePercent = 3;
            const platformFeeAmount = Math.round((amount - baseAmount) * 100); // $0.36 in cents

            console.log('Creating Stripe Checkout Session with:', JSON.stringify({
                baseAmount,
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
                            unit_amount: Math.round(baseAmount * 100), // Convert to cents
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
                        platformFee: platformFeeAmount / 100 // Store in dollars
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
                sessionId: session.id
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

    /**
     * Handle successful payment webhook
     * @param {Object} stripeSession Stripe session object
     */
    async handleSuccessfulPayment(stripeSession) {
        const { ideaId, buyerId, sellerId } = stripeSession.metadata;

        // Start a transaction
        const mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();

        try {
            // Update idea
            const idea = await Idea.findByIdAndUpdate(
                ideaId,
                {
                    isSold: true,
                    buyer: buyerId,
                    boughtAt: new Date()
                },
                { session: mongoSession }
            );

            if (!idea) {
                throw new Error('Idea not found');
            }

            // Update buyer's purchased ideas
            await User.findByIdAndUpdate(
                buyerId,
                {
                    $push: { boughtIdeas: ideaId }
                },
                { session: mongoSession }
            );

            // Create transaction record
            await Transaction.create([{
                type: 'idea_purchase',
                amount: stripeSession.amount_total / 100, // Convert cents to dollars
                status: 'completed',
                buyerId,
                sellerId,
                ideaId,
                stripeSessionId: stripeSession.id,
                applicationFee: stripeSession.application_fee_amount / 100
            }], { session: mongoSession });

            await mongoSession.commitTransaction();
        } catch (error) {
            await mongoSession.abortTransaction();
            throw error;
        } finally {
            mongoSession.endSession();
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
                    await this.handleSuccessfulPayment(event.data.object);
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
