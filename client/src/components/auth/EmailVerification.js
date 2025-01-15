import React, { useState } from 'react';
import styles from './Auth.module.css';

const EmailVerification = ({ email, onClose }) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleResendVerification = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('https://myworthyideas-257fec0e7d06.herokuapp.com/api/users/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Verification email has been resent. Please check your inbox.');
            } else {
                setError(data.message || 'Failed to resend verification email');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authForm}>
            <h2>Email Verification</h2>
            <p>
                A verification email has been sent to <strong>{email}</strong>. 
                Please check your inbox and follow the instructions to verify your account.
            </p>
            
            {message && <div className={styles.success}>{message}</div>}
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.verificationActions}>
                <button 
                    onClick={handleResendVerification}
                    className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>

                <button 
                    onClick={() => onClose('login')} 
                    className={styles.authLink}
                    disabled={isLoading}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default EmailVerification;
