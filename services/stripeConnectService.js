const StripeConnect = require('../db/stripeConnectModel');
const User = require('../db/userModel');

class StripeConnectService {
    constructor(stripe) {
        this.stripe = stripe;
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
            console.log('Starting OAuth redirect handling for user:', userId);
            
            // Exchange code for access token and connected account ID
            const response = await this.stripe.oauth.token({
                grant_type: 'authorization_code',
                code,
            });

            console.log('Received OAuth response for user:', userId);

            // Get the connected account ID and access token
            const connectedAccountId = response.stripe_user_id;
            const accessToken = response.access_token;

            console.log('Got connected account ID:', connectedAccountId);

            // Retrieve the account details
            const account = await this.stripe.accounts.retrieve(connectedAccountId);

            console.log('Retrieved account details for:', connectedAccountId);

            // Create or update the StripeConnect record
            const stripeConnect = await StripeConnect.findOneAndUpdate(
                { userId },
                {
                    stripeAccountId: connectedAccountId,
                    accessToken: accessToken,
                    accountStatus: account.charges_enabled ? 'active' : 'pending',
                    payoutsEnabled: account.payouts_enabled,
                    chargesEnabled: account.charges_enabled,
                    detailsSubmitted: account.details_submitted,
                    country: account.country
                },
                { upsert: true, new: true }
            );

            console.log('Updated StripeConnect record for user:', userId);

            // Update the user's seller status
            await User.findByIdAndUpdate(userId, {
                stripeConnectId: connectedAccountId,
                subscription: 'seller'
            });

            console.log('Updated user record with Stripe Connect ID');

            return stripeConnect;
        } catch (error) {
            console.error('Error in handleOAuthRedirect:', error);
            throw error;
        }
    }

    /**
     * Get account status for a connected account
     * @param {string} userId User ID
     */
    async getAccountStatus(userId) {
        try {
            // Get the StripeConnect record for this user
            const stripeConnect = await StripeConnect.findOne({ userId });
            
            if (!stripeConnect || !stripeConnect.stripeAccountId) {
                return {
                    connected: false,
                    message: 'Not connected to Stripe'
                };
            }

            // Retrieve account details using the platform's secret key
            const account = await this.stripe.accounts.retrieve(stripeConnect.stripeAccountId);

            return {
                connected: true,
                accountId: stripeConnect.stripeAccountId,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                country: account.country
            };
        } catch (error) {
            console.error('Error getting account status:', error);
            if (error.type === 'StripeAuthenticationError') {
                throw new Error('Invalid or expired API key. Please check your configuration.');
            }
            if (error.type === 'StripePermissionError') {
                throw new Error('Lost connection to Stripe account. Please reconnect.');
            }
            throw new Error('Failed to fetch account status. Please try again.');
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

        const session = await this.stripe.checkout.sessions.create({
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

module.exports = StripeConnectService;
