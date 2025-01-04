import axios from 'axios';

const API_BASE_URL = 'http://localhost:6001/api/users';

// Configure axios defaults
axios.defaults.withCredentials = true;

class PaymentService {
    /**
     * Get user profile
     * @returns {Promise<Object>}
     */
    async getUserProfile() {
        try {
            const response = await axios.get(`${API_BASE_URL}/me`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Initialize a deposit transaction
     * @param {number} amount Amount in USD
     * @returns {Promise<{clientSecret: string, paymentIntentId: string}>}
     */
    async initializeDeposit(amount) {
        try {
            console.log('Sending deposit init request:', { amount });
            const response = await axios.post(`${API_BASE_URL}/deposit/init`, { amount });
            console.log('Deposit init response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Deposit init error:', error.response?.data || error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Process a withdrawal
     * @param {number} amount Amount in USD
     * @returns {Promise<Object>}
     */
    async processWithdrawal(amount) {
        try {
            console.log('Sending withdrawal request:', { amount });
            const response = await axios.post(`${API_BASE_URL}/withdraw`, { amount });
            console.log('Withdrawal response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Withdrawal error:', error.response?.data || error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Get transaction history
     * @param {number} page Page number
     * @param {number} limit Items per page
     * @returns {Promise<{transactions: Array, totalPages: number, currentPage: number}>}
     */
    async getTransactionHistory(page = 1, limit = 10) {
        try {
            console.log('Sending transaction history request:', { page, limit });
            const response = await axios.get(`${API_BASE_URL}/transactions`, {
                params: { page, limit }
            });
            console.log('Transaction history response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Transaction history error:', error.response?.data || error.message);
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors
     * @param {Error} error Error object
     * @returns {Error}
     */
    handleError(error) {
        if (error.response) {
            // Server responded with error
            const message = error.response.data.error || 'An error occurred';
            const customError = new Error(message);
            customError.code = error.response.data.code;
            return customError;
        }
        return error;
    }
}

export default new PaymentService();
