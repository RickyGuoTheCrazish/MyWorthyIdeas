import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6001/api';

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
        // Get the connect link from backend instead of generating it here
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
}

export default new StripeConnectService();
