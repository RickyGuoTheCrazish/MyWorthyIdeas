import React from 'react';
import { FaCoins, FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import styles from './IdeaCard.module.css';

const IdeaCard = ({ idea, mode = 'edit', showRating = false }) => {
    const navigate = useNavigate();
    
    console.log('IdeaCard rendering with idea:', idea);
    
    // Return null if idea is not provided
    if (!idea || typeof idea !== 'object') {
        console.warn('IdeaCard received invalid idea prop:', idea);
        return null;
    }

    // Safely destructure with defaults
    const {
        _id = '',
        title = 'Untitled',
        rating = 0,
        price = 0,
        seller = {},
        creator = {},
        thumbnailImage = '',
        boughtAt = null
    } = idea;

    const creatorRating = creator?.averageRating || 0;

    console.log('Destructured idea properties:', { _id, title, rating, price, seller, creator, thumbnailImage, boughtAt });

    const formatPrice = (price) => {
        return typeof price === 'number' ? price.toFixed(2) : '0.00';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    const formatId = (id) => {
        if (!id) return '#000000';
        try {
            return '#' + id.toString().slice(-6).toUpperCase();
        } catch (error) {
            console.error('Error formatting ID:', error);
            return '#000000';
        }
    };

    const formatRating = (rating) => {
        if (!rating || rating === 0) return 'N/A';
        return rating.toFixed(1);
    };

    return (
        <div className={styles.ideaCard} onClick={(e) => {
            if (_id && e.target.closest(`.${styles.actionButton}`) === null) {
                navigate(`/ideas/${_id}`);
            }
        }}>
            <div className={styles.priceTag}>
                <FaCoins className={styles.priceIcon} />
                {formatPrice(price)}
            </div>
            <h3 className={styles.title}>{title}</h3>

            <div className={styles.imageContainer}>
                {thumbnailImage ? (
                    <img 
                        src={thumbnailImage} 
                        alt={title || 'Idea'}
                        className={styles.ideaImage}
                        onError={(e) => {
                            console.warn('Failed to load image:', thumbnailImage);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className={styles.placeholder} style={{ display: thumbnailImage ? 'none' : 'flex' }}>
                    <span>No Image</span>
                </div>
                <div className={styles.idTag}>{formatId(_id)}</div>
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
                <div className={styles.sellerInfo}>
                    <div className={styles.sellerName}>
                        {(seller?.username || creator?.username) || 'Unknown Seller'}
                        <div className={styles.creatorRating}>
                            <FaStar className={styles.starIcon} />
                            <span>{formatRating(creatorRating)}</span>
                        </div>
                    </div>
                </div>
                {mode === 'edit' && (
                    <button 
                        className={`${styles.actionButton} ${mode === 'edit' ? styles.editButton : styles.viewButton}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ideas/${_id}${mode === 'edit' ? '/edit' : ''}`);
                        }}
                    >
                        {mode === 'edit' ? 'Edit' : 'View'}
                    </button>
                )}
                {_id && mode === 'view' && boughtAt && (
                    <span className={styles.purchaseDate}>
                        Purchased: {formatDate(boughtAt)}
                    </span>
                )}
            </div>
        </div>
    );
};

export default IdeaCard;
