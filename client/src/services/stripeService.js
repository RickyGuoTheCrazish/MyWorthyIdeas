const API_BASE_URL = '/api';

export const createCheckoutSession = async (ideaId, totalAmount) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ideaId,
                amount: parseFloat(totalAmount)
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create checkout session');
        }

        const session = await response.json();
        return session;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

export const getPaymentStatus = async (sessionId) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/stripe/payment-status/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get payment status');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting payment status:', error);
        throw error;
    }
};
