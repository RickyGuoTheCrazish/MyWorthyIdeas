import React, { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';
import styles from './RatingModal.module.css';

const RatingModal = ({ isOpen, onClose, idea, onRatingSubmit }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) return;
        
        setIsSubmitting(true);
        try {
            await onRatingSubmit(rating);
            onClose();
            // toast.success('Rating submitted successfully!');
        } catch (error) {
            // toast.error(error.message || 'Failed to submit rating');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                {/* Close Button */}
                <button onClick={onClose} className={styles.closeButton}>
                    <FaTimes />
                </button>

                {/* Modal Header */}
                <div className={styles.modalHeader}>
                    <h2>Rate This Idea</h2>
                    <p>How would you rate "{idea.title}"?</p>
                </div>

                {/* Stars Section */}
                <div className={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className={styles.starButton}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <FaStar
                                className={`${styles.star} ${
                                    star <= (hoveredRating || rating) ? styles.active : ''
                                }`}
                            />
                        </button>
                    ))}
                </div>

                {/* Rating Description */}
                <div className={styles.ratingDescription}>
                    {rating === 0 ? (
                        <p>Select your rating</p>
                    ) : (
                        <p>You've selected {rating} star{rating !== 1 ? 's' : ''}</p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                    className={styles.submitButton}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
            </div>
        </div>
    );
};

export default RatingModal;
