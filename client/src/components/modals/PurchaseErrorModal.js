import React from 'react';
import styles from './PurchaseErrorModal.module.css';
import { FaTimes, FaExclamationCircle } from 'react-icons/fa';

const ERROR_MESSAGES = {
    'ALREADY_SOLD': {
        title: 'Idea Already Sold',
        message: 'This idea has already been purchased by someone else.',
        action: 'Please browse other available ideas.'
    },
    'INSUFFICIENT_CREDITS': {
        title: 'Insufficient Credits',
        message: 'You don\'t have enough credits to purchase this idea.',
        action: 'Please add more credits to your account.'
    },
    'NOT_BUYER': {
        title: 'Subscription Required',
        message: 'You need a buyer or premium subscription to purchase ideas.',
        action: 'Please upgrade your subscription to continue.'
    },
    'DEFAULT': {
        title: 'Purchase Failed',
        message: 'We couldn\'t complete your purchase at this time.',
        action: 'Please try again later or contact support.'
    }
};

const PurchaseErrorModal = ({ error, onClose }) => {
    const getErrorContent = () => {
        if (error.includes('already sold')) {
            return ERROR_MESSAGES.ALREADY_SOLD;
        }
        if (error.includes('Insufficient credits')) {
            return ERROR_MESSAGES.INSUFFICIENT_CREDITS;
        }
        if (error.includes('not a buyer or premium subscriber')) {
            return ERROR_MESSAGES.NOT_BUYER;
        }
        return ERROR_MESSAGES.DEFAULT;
    };

    const errorContent = getErrorContent();

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>
                
                <div className={styles.content}>
                    <div className={styles.icon}>
                        <FaExclamationCircle />
                    </div>
                    
                    <h2>{errorContent.title}</h2>
                    <p className={styles.message}>{errorContent.message}</p>
                    <p className={styles.action}>{errorContent.action}</p>

                    <button className={styles.closeBtn} onClick={onClose}>
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseErrorModal;
