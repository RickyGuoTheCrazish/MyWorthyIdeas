import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://myworthyideas-257fec0e7d06.herokuapp.com/api';

class StripeConnectService {
    getAuthConfig() {
        const token = localStorage.getItem('token');
        return {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
    }

    /**
     * Create a new Stripe Connect account
     * @returns {Promise<Object>}
     */
    async createAccount() {
        const response = await axios.post(
            `${API_URL}/stripe/connect/create-account`,
            {},
            this.getAuthConfig()
        );
        return response.data;
    }

    /**
     * Get OAuth link for connecting Stripe account
     * @returns {Promise<{url: string}>}
     */
    async getConnectLink() {
        const response = await axios.get(
            `${API_URL}/stripe/connect/oauth/link`,
            this.getAuthConfig()
        );
        return response.data;
    }

    /**
     * Get seller's account status
     * @returns {Promise<Object>}
     */
    async getAccountStatus() {
        const response = await axios.get(
            `${API_URL}/stripe/connect/account/status`,
            this.getAuthConfig()
        );
        return response.data;
    }

    /**
     * Get login link for Stripe dashboard
     * @returns {Promise<{url: string}>}
     */
    async getLoginLink() {
        const response = await axios.get(
            `${API_URL}/stripe/connect/login-link`,
            this.getAuthConfig()
        );
        return response.data;
    }

    /**
     * Create checkout session for idea purchase
     * @param {Object} params
     * @param {number} params.amount Amount in AUD
     * @param {string} params.sellerId Seller's user ID
     * @param {string} params.ideaId ID of the idea being purchased
     * @returns {Promise<{id: string}>}
     */
    async createCheckoutSession(params) {
        const response = await axios.post(
            `${API_URL}/stripe/connect/checkout`,
            params,
            this.getAuthConfig()
        );
        return response.data;
    }

    /**
     * Handle OAuth callback with authorization code
     * @param {string} code - The authorization code from Stripe
     */
    async handleOAuthCallback(code) {
        console.log('Sending code to backend:', code);
        const response = await axios.post(
            `${API_URL}/stripe/connect/oauth/callback`,
            { code },
            this.getAuthConfig()
        );
        console.log('Backend response:', response.data);
        return response.data;
    }
}

export default new StripeConnectService();
