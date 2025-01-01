import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useAuth } from '../../context/AuthContext';
import styles from './SessionExpiredModal.module.css';

const SessionExpiredModal = () => {
    const [authModal, setAuthModal] = useState({
        isOpen: false,
        mode: 'login',
        email: null
    });
    const { clearSession } = useAuth();
    const navigate = useNavigate();

    const handleVerifyEmail = (email) => {
        setAuthModal(prev => ({ ...prev, mode: 'verify', email }));
    };

    const handleModeChange = (newMode) => {
        setAuthModal(prev => ({ ...prev, mode: newMode, email: null }));
    };

    const openAuthModal = (mode) => {
        setAuthModal(prev => ({ ...prev, isOpen: true, mode }));
    };

    const closeAuthModal = () => {
        setAuthModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleContinueAsGuest = async () => {
        try {
            await clearSession(); // Wait for session to be fully cleared
            navigate('/', { replace: true }); // Navigate to recommendations page
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.content}>
                    <h2 className={styles.title}>Session Expired</h2>
                    <p className={styles.message}>
                        Your session has expired. Please log in to continue with full access to all features.
                    </p>

                    <div className={styles.actionButtons}>
                        <button 
                            onClick={() => openAuthModal('login')} 
                            className={styles.loginButton}
                        >
                            Log In
                        </button>
                        <button 
                            onClick={handleContinueAsGuest} 
                            className={styles.guestButton}
                        >
                            Continue as Guest
                        </button>
                    </div>
                </div>

                {authModal.isOpen && (
                    <AuthModal
                        isOpen={authModal.isOpen}
                        mode={authModal.mode}
                        onClose={closeAuthModal}
                        onVerifyEmail={handleVerifyEmail}
                        onModeChange={handleModeChange}
                        email={authModal.email}
                    />
                )}
            </div>
        </div>
    );
};

export default SessionExpiredModal;