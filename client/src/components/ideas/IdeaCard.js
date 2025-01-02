import React from 'react';
import { FaCoins } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styles from './IdeaCard.module.css';

const IdeaCard = ({ idea, mode = 'edit', showRating = false }) => {
    const navigate = useNavigate();
    const { _id, title, rating, price, seller, thumbnailImage } = idea;

    const formatPrice = (price) => {
        return typeof price === 'number' ? price.toFixed(2) : '0.00';
    };

    const handleCardClick = (e) => {
        // Don't trigger card click if clicking the action button
        if (e.target.closest(`.${styles.actionButton}`)) {
            return;
        }
        navigate(`/ideas/${_id}`);
    };

    const handleActionClick = (e) => {
        e.stopPropagation(); // Prevent card click when clicking the button
        if (mode === 'edit') {
            navigate(`/ideas/${_id}/edit`);
        } else {
            navigate(`/ideas/${_id}`);
        }
    };

    return (
        <div className={styles.ideaCard} onClick={handleCardClick}>
            <div className={styles.priceTag}>
                <FaCoins className={styles.priceIcon} />
                {formatPrice(price)}
            </div>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.imageContainer}>
                {thumbnailImage ? (
                    <img 
                        src={thumbnailImage} 
                        alt={title}
                        className={styles.ideaImage}
                    />
                ) : (
                    <div className={styles.placeholder}></div>
                )}
            </div>
            {showRating && (
                <div className={styles.rating}>
                    <span>{rating || 0}</span>
                    <div className={styles.stars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                                key={star} 
                                className={styles.star}
                                style={{ color: star <= (rating || 0) ? '#ffd700' : '#ccc' }}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <div className={styles.footer}>
                <div className={styles.seller}>
                    <span className={styles.sellerName}>
                        {seller?.username || 'Unknown Seller'}
                    </span>
                </div>
                <button 
                    className={`${styles.actionButton} ${mode === 'edit' ? styles.editButton : styles.viewButton}`}
                    onClick={handleActionClick}
                >
                    {mode === 'edit' ? 'Edit' : 'View'}
                </button>
            </div>
        </div>
    );
};

export default IdeaCard;
