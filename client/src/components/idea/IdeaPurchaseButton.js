import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './IdeaPurchaseButton.module.css';

const IdeaPurchaseButton = ({ idea, onPurchase }) => {
    const { user, isBuyer } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handlePurchase = async () => {
        if (!user) {
            setError('Please log in to purchase ideas');
            return;
        }

        if (!isBuyer()) {
            setError('Only buyers can purchase ideas');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            await onPurchase();
        } catch (err) {
            setError(err.message || 'Failed to process purchase');
        } finally {
            setIsLoading(false);
        }
    };

    // Don't show button if user is the seller
    if (user?.id === idea.author) {
        return null;
    }

    // Show if already purchased
    if (idea.purchasedBy?.some(purchase => purchase.user === user?._id)) {
        return (
            <button className={`${styles.button} ${styles.purchased}`} disabled>
                ✓ Purchased
            </button>
        );
    }

    return (
        <div className={styles.container}>
            <button
                className={`${styles.button} ${isLoading ? styles.loading : ''}`}
                onClick={handlePurchase}
                disabled={isLoading}
            >
                {isLoading ? 'Processing...' : `Purchase for $${idea.priceAUD.toFixed(2)} AUD`}
            </button>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
};

export default IdeaPurchaseButton;
