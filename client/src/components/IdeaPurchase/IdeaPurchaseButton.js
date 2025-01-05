import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import styles from './IdeaPurchase.module.css';
import { FaSpinner } from 'react-icons/fa';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const IdeaPurchaseButton = ({ idea }) => {
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    const handlePurchase = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (loading) return;

        try {
            setLoading(true);
            const stripe = await stripePromise;
            
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ideaId: idea._id,
                    priceAUD: idea.priceAUD,
                    title: idea.title,
                    creatorId: idea.creator
                }),
            });

            const session = await response.json();

            if (session.error) {
                console.error('Error creating checkout session:', session.error);
                alert('Failed to initiate purchase. Please try again.');
                return;
            }

            const result = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (result.error) {
                console.error('Error redirecting to checkout:', result.error);
                alert('Failed to redirect to checkout. Please try again.');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            alert('An error occurred during purchase. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(price);
    };

    return (
        <button 
            className={styles.purchaseButton}
            onClick={handlePurchase}
            disabled={loading || idea.isSold || (user && user._id === idea.creator)}
        >
            {loading ? (
                <><FaSpinner className={styles.spinner} /> Processing...</>
            ) : idea.isSold ? (
                'Sold'
            ) : (user && user._id === idea.creator) ? (
                'Your Idea'
            ) : (
                `Buy for ${formatPrice(idea.priceAUD)}`
            )}
        </button>
    );
};

export default IdeaPurchaseButton;
