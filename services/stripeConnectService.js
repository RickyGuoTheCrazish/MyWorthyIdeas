const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const StripeConnect = require('../db/stripeConnectModel');
const User = require('../db/userModel');

class StripeConnectService {
    constructor() {
        this.createConnectAccountLink = this.createConnectAccountLink.bind(this);
        this.handleOAuthRedirect = this.handleOAuthRedirect.bind(this);
        this.createSellerCheckoutSession = this.createSellerCheckoutSession.bind(this);
        this.getAccountStatus = this.getAccountStatus.bind(this);
    }

    /**
     * Create OAuth link for connecting Stripe account
     * @returns {string} OAuth link
     */
    createConnectAccountLink() {
        return process.env.STRIPE_CONNECT_LINK;
    }

    /**
     * Handle OAuth redirect and create/update connected account
     * @param {string} code Authorization code from Stripe
     * @param {string} userId User ID
     */
    async handleOAuthRedirect(code, userId) {
        try {
            // Exchange code for access token and connected account ID
            const response = await stripe.oauth.token({
                grant_type: 'authorization_code',
                code,
            });

            // Get the connected account ID
            const connectedAccountId = response.stripe_user_id;

            // Retrieve the account details
            const account = await stripe.accounts.retrieve(connectedAccountId);

            // Create or update the StripeConnect record
            const stripeConnect = await StripeConnect.findOneAndUpdate(
                { userId },
                {
                    stripeAccountId: connectedAccountId,
                    accountStatus: account.charges_enabled ? 'active' : 'pending',
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    detailsSubmitted: account.details_submitted,
                    country: account.country
                },
                { upsert: true, new: true }
            );

            // Update the User model with Stripe Connect info
            await User.findByIdAndUpdate(userId, {
                stripeConnectAccountId: connectedAccountId,
                stripeConnectStatus: {
                    accountStatus: stripeConnect.accountStatus,
                    chargesEnabled: stripeConnect.chargesEnabled,
                    payoutsEnabled: stripeConnect.payoutsEnabled,
                    detailsSubmitted: stripeConnect.detailsSubmitted
                }
            });

            return connectedAccountId;
        } catch (error) {
            console.error('Error handling OAuth redirect:', error);
            throw error;
        }
    }

    /**
     * Get seller's Stripe Connect account status
     * @param {string} userId User ID
     */
    async getAccountStatus(userId) {
        try {
            // First get the local record
            const connect = await StripeConnect.findOne({ userId });
            if (!connect) {
                return {
                    connected: false,
                    accountStatus: 'not_connected'
                };
            }

            // Fetch latest status from Stripe
            const account = await stripe.accounts.retrieve(connect.stripeAccountId);
            
            // Update local records with latest status
            const updatedStatus = {
                accountStatus: account.charges_enabled ? 'active' : 'pending',
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted
            };

            // Update StripeConnect record
            await StripeConnect.findOneAndUpdate(
                { userId },
                {
                    accountStatus: updatedStatus.accountStatus,
                    chargesEnabled: updatedStatus.chargesEnabled,
                    payoutsEnabled: updatedStatus.payoutsEnabled,
                    detailsSubmitted: updatedStatus.detailsSubmitted
                }
            );

            // Update User record
            await User.findByIdAndUpdate(userId, {
                stripeConnectStatus: updatedStatus
            });

            return {
                connected: true,
                accountStatus: updatedStatus.accountStatus,
                status: {
                    chargesEnabled: updatedStatus.chargesEnabled,
                    payoutsEnabled: updatedStatus.payoutsEnabled,
                    detailsSubmitted: updatedStatus.detailsSubmitted
                }
            };
        } catch (error) {
            console.error('Error getting account status:', error);
            throw error;
        }
    }

    /**
     * Create a Checkout Session for a specific seller
     * @param {Object} params Parameters for creating checkout session
     * @param {string} params.amount Amount in cents
     * @param {string} params.sellerId Seller's user ID
     * @param {string} params.buyerId Buyer's user ID
     * @param {string} params.ideaId ID of the idea being purchased
     */
    async createSellerCheckoutSession(params) {
        const { amount, sellerId, buyerId, ideaId } = params;

        // Get seller's connected account
        const connect = await StripeConnect.findOne({ userId: sellerId });
        if (!connect || !connect.stripeAccountId) {
            throw new Error('Seller has not connected their Stripe account');
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'aud',
                    product_data: {
                        name: 'Idea Purchase',
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/ideas/purchased?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/ideas`,
            payment_intent_data: {
                application_fee_amount: Math.round(amount * 0.05), // 5% platform fee
                transfer_data: {
                    destination: connect.stripeAccountId,
                },
            },
            metadata: {
                ideaId,
                buyerId,
                sellerId
            }
        });

        return session;
    }
}

module.exports = new StripeConnectService();
