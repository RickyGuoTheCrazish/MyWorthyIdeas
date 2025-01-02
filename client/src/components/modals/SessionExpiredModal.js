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
    const { clearSession, isAuthenticated } = useAuth();
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
            await clearSession();
            // Only navigate away if user chooses to continue as guest
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.content}>
                    <h2 className={styles.title}>
                        {isAuthenticated ? 'Session Expired' : 'Login Required'}
                    </h2>
                    <p className={styles.message}>
                        {isAuthenticated 
                            ? 'Your session has expired. Please log in to continue with full access to all features.'
                            : 'Please log in to access this feature. Only registered users can access this page.'}
                    </p>

                    <div className={styles.actionButtons}>
                        <button 
                            className={styles.loginButton}
                            onClick={() => openAuthModal('login')}
                        >
                            Log In
                        </button>
                        <button 
                            className={styles.signupButton}
                            onClick={() => openAuthModal('signup')}
                        >
                            Sign Up
                        </button>
                        <button 
                            className={styles.guestButton}
                            onClick={handleContinueAsGuest}
                        >
                            Continue as Guest
                        </button>
                    </div>
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
    );
};

export default SessionExpiredModal;