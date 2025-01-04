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

const PaymentMethodForm = ({ onSuccess, type = 'deposit', clientSecret }) => {
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

        console.log('Payment submission state:', {
            stripeReady: !!stripe,
            elementsReady: !!elements,
            hasClientSecret: !!clientSecret,
            clientSecret
        });

        if (!stripe || !elements || !clientSecret) {
            setError('Payment system not ready. Please try again.');
            setLoading(false);
            return;
        }

        try {
            if (type === 'deposit') {
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
            } else {
                // For withdrawal setup (Connect Express)
                const { error: stripeError } = await stripe.createToken('account', {
                    type: 'custom',
                    requested_capabilities: ['transfers'],
                });

                if (stripeError) {
                    throw new Error(stripeError.message);
                }

                onSuccess();
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!stripe || !elements) {
        return <div>Loading...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    {type === 'deposit' ? 'Card Details' : 'Bank Account Details'}
                </label>
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
                {loading ? 'Processing...' : type === 'deposit' ? 'Add Card' : 'Add Bank Account'}
            </button>
        </form>
    );
};

export default PaymentMethodForm;
