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

    // Get current user info from token
    const token = localStorage.getItem('token');
    let canEdit = false;

    if (token) {
        try {
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const currentUserId = tokenPayload.userId;
            const userType = tokenPayload.subscription;
            
            // Can edit if:
            // 1. User is the creator/seller
            // 2. User is a seller type
            canEdit = (currentUserId === (creator?._id || seller?._id)) && userType === 'seller';
        } catch (error) {
            console.error('Error parsing token:', error);
        }
    }

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
        console.log('formatRating input:', rating, typeof rating);
        if (!rating || rating === 0) return 'N/A';
        
        try {
            // Ensure we have a number
            const numRating = Number(rating);
            if (isNaN(numRating)) return 'N/A';
            return numRating.toFixed(1);
        } catch (error) {
            console.error('Error formatting rating:', error);
            return 'N/A';
        }
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
                {boughtAt && (
                    <div className={styles.purchaseDate}>
                        {formatDate(boughtAt)}
                    </div>
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
                <div className={styles.sellerInfo}>
                    <div className={styles.sellerName}>
                        {(seller?.username || creator?.username) || 'Unknown Seller'}
                        <div className={styles.creatorRating}>
                            <FaStar className={styles.starIcon} />
                            <span>{formatRating(creatorRating)}</span>
                        </div>
                    </div>
                </div>
                {canEdit ? (
                    <button 
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ideas/${_id}/edit`);
                        }}
                    >
                        Edit
                    </button>
                ) : (
                    <button 
                        className={`${styles.actionButton} ${styles.viewButton}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/ideas/${_id}`);
                        }}
                    >
                        View
                    </button>
                )}
            </div>
        </div>
    );
};

export default IdeaCard;
