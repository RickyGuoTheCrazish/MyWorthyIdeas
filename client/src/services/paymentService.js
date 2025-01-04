import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';

const API_BASE_URL = 'http://localhost:6001/api/users';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Q5RUIAsYE98T3GkgOFSy5Qtd48bhQ5j9GDYL7Hv9OHJ3FNhn1kiBGWbBBrcruuCQv0NrdveXBZiOquWHAZpA8rV00di6ErAjb';

/**
 * Calculate processing fee based on amount
 * @param {number} amount Amount in USD
 * @returns {{percentage: number, fee: number}} Fee percentage and amount
 */
function calculateProcessingFee(amount) {
    const numAmount = Number(amount);
    let feePercentage;
    
    // Tiered fee structure
    if (numAmount < 20) {
        feePercentage = 0.03; // 3% for small amounts
    } else if (numAmount < 50) {
        feePercentage = 0.02; // 2% for medium amounts
    } else if (numAmount < 100) {
        feePercentage = 0.015; // 1.5% for larger amounts
    } else {
        feePercentage = 0.01; // 1% for very large amounts
    }

    const fee = Math.min(numAmount * feePercentage, 2); // Cap at $2 USD
    return {
        percentage: feePercentage * 100, // Return as percentage (e.g., 3 for 3%)
        fee: Number(fee.toFixed(2))
    };
}

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Configure axios defaults
axios.defaults.withCredentials = true;

class PaymentService {
    /**
     * Calculate processing fee based on amount
     * @param {number} amount Amount in USD
     * @returns {{percentage: number, fee: number}} Fee percentage and amount
     */
    calculateProcessingFee(amount) {
        const numAmount = Number(amount);
        let feePercentage;
        
        // Tiered fee structure
        if (numAmount < 20) {
            feePercentage = 0.03; // 3% for small amounts
        } else if (numAmount < 50) {
            feePercentage = 0.02; // 2% for medium amounts
        } else if (numAmount < 100) {
            feePercentage = 0.015; // 1.5% for larger amounts
        } else {
            feePercentage = 0.01; // 1% for very large amounts
        }

        const fee = Math.min(numAmount * feePercentage, 2); // Cap at $2 USD
        return {
            percentage: feePercentage * 100, // Return as percentage (e.g., 3 for 3%)
            fee: Number(fee.toFixed(2))
        };
    }

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
     * Initialize a Stripe Checkout session for deposit
     * @param {number} amount Amount in USD
     * @returns {Promise<void>}
     */
    async initializeDeposit(amount) {
        try {
            console.log('Sending deposit init request:', { amount });
            const response = await axios.post(`${API_BASE_URL}/deposit/init`, { amount });
            console.log('Deposit init response:', response.data);
            
            const stripe = await stripePromise;
            if (!stripe) {
                throw new Error('Failed to initialize Stripe');
            }

            const { error } = await stripe.redirectToCheckout({
                sessionId: response.data.id // Use id instead of sessionId
            });

            if (error) {
                throw new Error(error.message);
            }
        } catch (error) {
            console.error('Deposit init error:', error.response?.data || error.message);
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
