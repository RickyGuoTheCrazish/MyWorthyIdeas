const StripeConnect = require('../db/stripeConnectModel');
const User = require('../db/userModel');

class StripeConnectService {
    constructor(stripe) {
        if (!stripe) {
            throw new Error('stripe is required');
        }
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

            // Create or update both StripeConnect and User records
            const [stripeConnect] = await Promise.all([
                // Update StripeConnect record
                StripeConnect.findOneAndUpdate(
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
                ),
                // Update User record with Stripe Connect status
                User.findByIdAndUpdate(userId, {
                    stripeConnectAccountId: connectedAccountId,
                    subscription: 'seller',
                    'stripeConnectStatus.accountStatus': account.charges_enabled ? 'active' : 'pending',
                    'stripeConnectStatus.payoutsEnabled': account.payouts_enabled,
                    'stripeConnectStatus.chargesEnabled': account.charges_enabled,
                    'stripeConnectStatus.detailsSubmitted': account.details_submitted
                })
            ]);

            console.log('Updated StripeConnect and User records for user:', userId);

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
     * Create a checkout session for an idea purchase
     * @param {Object} params Parameters for creating the checkout session
     * @returns {Promise<Stripe.Checkout.Session>} The created checkout session
     */
    async createSellerCheckoutSession(params) {
        const { amount, sellerId, buyerId, ideaId } = params;

        // Get the seller's Stripe account ID
        const seller = await StripeConnect.findOne({ userId: sellerId });
        if (!seller || !seller.stripeAccountId) {
            throw new Error('Seller not found or not connected to Stripe');
        }

        // Create the session
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
            success_url: `${process.env.CLIENT_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/purchase/cancel`,
            payment_intent_data: {
                application_fee_amount: Math.round(amount * 0.1), // 10% platform fee
                transfer_data: {
                    destination: seller.stripeAccountId,
                },
            },
            metadata: {
                ideaId,
                buyerId,
                sellerId,
                type: 'idea_purchase'
            }
        });

        return session;
    }
}

module.exports = StripeConnectService;
