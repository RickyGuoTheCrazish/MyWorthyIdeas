import React from 'react';
import { FaCoins } from 'react-icons/fa';
import styles from './IdeaCard.module.css';

const IdeaCard = ({ idea, mode = 'edit', showRating = false }) => {
    const { title, rating, price, sellerName } = idea;

    const formatPrice = (price) => {
        return price.toFixed(2);
    };

    return (
        <div className={styles.ideaCard}>
            <div className={styles.priceTag}>
                <FaCoins className={styles.priceIcon} />
                {formatPrice(price)}
            </div>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.imageContainer}>
                {/* Placeholder for idea image */}
                <div className={styles.placeholder}></div>
            </div>
            {showRating && (
                <div className={styles.rating}>
                    <span>{rating || 4.5}</span>
                    {/* Add star rating component here */}
                    <div className={styles.stars}>★★★★½</div>
                </div>
            )}
            <div className={styles.footer}>
                <div className={styles.seller}>
                    <span className={styles.sellerName}>{sellerName || 'seller name'}</span>
                </div>
                <button 
                    className={`${styles.actionButton} ${styles[mode]}`}
                >
                    {mode === 'edit' ? 'Edit' : 'View'}
                </button>
            </div>
        </div>
    );
};

export default IdeaCard;
