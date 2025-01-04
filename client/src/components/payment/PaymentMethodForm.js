import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from './PaymentMethodForm.module.css';

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: '#32325d',
            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    }
};

const PaymentMethodForm = ({ onSuccess, clientSecret }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!stripe || !elements) {
            console.log('Stripe or Elements not ready:', { stripe: !!stripe, elements: !!elements });
            return;
        }
        console.log('Stripe and Elements ready, clientSecret:', clientSecret);
    }, [stripe, elements, clientSecret]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (!stripe || !elements || !clientSecret) {
            setError('Payment system not ready. Please try again.');
            setLoading(false);
            return;
        }

        try {
            console.log('Confirming payment with secret:', clientSecret);
            const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: elements.getElement(CardElement),
                    },
                }
            );

            if (confirmError) {
                throw new Error(confirmError.message);
            }

            if (paymentIntent.status === 'succeeded') {
                onSuccess();
            } else {
                throw new Error('Payment failed. Please try again.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!stripe || !elements) {
        return <div className={styles.loading}>Loading payment system...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Card Details</label>
                <div className={styles.cardElement}>
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
            </div>
            
            {error && <div className={styles.error}>{error}</div>}
            
            <button 
                type="submit" 
                disabled={!stripe || loading} 
                className={styles.submitButton}
            >
                {loading ? 'Processing...' : 'Add Credits'}
            </button>
        </form>
    );
};

export default PaymentMethodForm;
