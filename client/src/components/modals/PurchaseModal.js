import React from 'react';
import styles from './PurchaseModal.module.css';
import { FaTimes, FaDollarSign } from 'react-icons/fa';

const PLATFORM_FEE_PERCENTAGE = 3;

const PurchaseModal = ({ idea, onClose, onConfirm }) => {
    if (!idea) return null;

    const formatPrice = (price) => {
        return typeof price === 'number' ? price.toFixed(2) : '0.00';
    };

    const calculatePlatformFee = (price) => {
        return (price * PLATFORM_FEE_PERCENTAGE) / 100;
    };

    const basePrice = parseFloat(idea.priceAUD) || 0;
    const platformFee = calculatePlatformFee(basePrice);
    const totalPrice = basePrice + platformFee;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>Confirm Purchase</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    <div className={styles.ideaInfo}>
                        <h3>{idea.title}</h3>
                        <p className={styles.preview}>{idea.preview}</p>
                    </div>

                    <div className={styles.priceBreakdown}>
                        <div className={styles.priceRow}>
                            <span>Base Price:</span>
                            <span className={styles.price}>
                                ${formatPrice(basePrice)} AUD
                            </span>
                        </div>
                        <div className={styles.priceRow}>
                            <span>Platform Fee (3%):</span>
                            <span className={styles.price}>
                                ${formatPrice(platformFee)} AUD
                            </span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>Total:</span>
                            <span className={styles.totalPrice}>
                                ${formatPrice(totalPrice)} AUD
                            </span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button 
                            className={styles.cancelButton} 
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button 
                            className={styles.confirmButton} 
                            onClick={() => onConfirm(totalPrice)}
                        >
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseModal;
