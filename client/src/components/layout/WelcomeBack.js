import React from 'react';
import { FaUser } from 'react-icons/fa';
import styles from './WelcomeBack.module.css';

const GuestModeIndicator = ({ onClose }) => {

    return (
        <div className={styles.guestIndicator}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <FaUser className={styles.icon} />
                    <h2>Guest Mode</h2>
                </div>
                <p> For full access to the platform, please login.</p>
                <div className={styles.actions}>
                    
                    <button     
                        className={styles.closeButton}
                        onClick={onClose}
                    >
                        Continue as Guest
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuestModeIndicator;
