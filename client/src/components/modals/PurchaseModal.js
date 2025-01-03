import React, { useState } from 'react';
import styles from './PurchaseModal.module.css';
import { FaCoins, FaTimes, FaCheck } from 'react-icons/fa';

const PurchaseModal = ({ idea, userCredits, onClose, onConfirm }) => {
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleConfirm = () => {
        if (!termsAccepted) {
            return;
        }
        onConfirm();
    };

    const formatPrice = (price) => {
        return typeof price === 'number' ? price.toFixed(2) : '0.00';
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>Purchase Idea</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.ideaInfo}>
                        {idea.thumbnailImage && (
                            <img 
                                src={idea.thumbnailImage} 
                                alt={idea.title} 
                                className={styles.coverImage}
                            />
                        )}
                        <h3>{idea.title}</h3>
                        <p className={styles.preview}>{idea.preview}</p>
                    </div>

                    <div className={styles.priceInfo}>
                        <div className={styles.priceRow}>
                            <span>Price:</span>
                            <span className={styles.price}>
                                <FaCoins /> {formatPrice(idea.price)}
                            </span>
                        </div>
                        <div className={styles.priceRow}>
                            <span>Your Credits:</span>
                            <span className={styles.credits}>
                                <FaCoins /> {formatPrice(userCredits)}
                            </span>
                        </div>
                        <div className={styles.priceRow}>
                            <span>Remaining Credits:</span>
                            <span className={styles.remaining}>
                                <FaCoins /> {formatPrice(userCredits - idea.price)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.terms}>
                        <h4>Terms and Conditions</h4>
                        <div className={styles.termsContent}>
                            <p>By purchasing this idea, you agree to the following terms:</p>
                            <ul>
                                <li>The purchase is final and non-refundable</li>
                                <li>You will have immediate access to the full idea content</li>
                                <li>Upon purchase, you acquire full intellectual property rights to the idea</li>
                                <li>You may freely use, modify, resell, or redistribute the idea content</li>
                                <li>The original creator relinquishes all rights to the idea upon sale</li>
                                <li>You agree to provide a fair rating after reviewing the idea</li>
                            </ul>
                        </div>
                        <label className={styles.termsCheckbox}>
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                            />
                            I agree to the terms and conditions
                        </label>
                    </div>

                    <div className={styles.modalActions}>
                        <button 
                            className={styles.cancelButton} 
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className={`${styles.confirmButton} ${!termsAccepted ? styles.disabled : ''}`}
                            onClick={handleConfirm}
                            disabled={!termsAccepted}
                        >
                            {!termsAccepted ? (
                                'Please accept terms to continue'
                            ) : (
                                <>
                                    <FaCheck /> Confirm Purchase
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseModal;
