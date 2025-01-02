import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import styles from './WelcomeBack.module.css';

const GuestModeIndicator = ({ onClose }) => {
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate('/auth');
        if (onClose) onClose();
    };

    return (
        <div className={styles.guestIndicator}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <FaUser className={styles.icon} />
                    <h2>Guest Mode</h2>
                </div>
                <p>Login for full access to the platform.</p>
                <div className={styles.actions}>
                    <button 
                        className={styles.loginButton}
                        onClick={handleLogin}
                    >
                        Log In
                    </button>
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
