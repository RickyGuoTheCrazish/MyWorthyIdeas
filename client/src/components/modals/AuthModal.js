import React from 'react';
import Login from '../auth/Login';
import Signup from '../auth/Signup';
import EmailVerification from '../auth/EmailVerification';
import styles from './Modal.module.css';

const AuthModal = ({ isOpen, mode, onClose, onVerify, onModeChange, email }) => {
    if (!isOpen) return null;

    const handleClose = (newMode) => {
        if (newMode) {
            onModeChange(newMode);
        } else {
            onClose();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                {mode === 'login' && (
                    <Login 
                        onClose={handleClose}
                        onModeChange={onModeChange}
                    />
                )}
                {mode === 'signup' && (
                    <Signup 
                        onClose={handleClose}
                        onVerify={onVerify}
                        onModeChange={onModeChange}
                    />
                )}
                {mode === 'verify' && (
                    <EmailVerification 
                        email={email}
                        onClose={handleClose}
                        onModeChange={onModeChange}
                    />
                )}
            </div>
        </div>
    );
};

export default AuthModal;
