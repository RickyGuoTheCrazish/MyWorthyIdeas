import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import paymentService from '../services/paymentService';
import styles from '../styles/PaymentSuccess.module.css';
import { FaCheckCircle } from 'react-icons/fa';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
            setError('Invalid session');
            setLoading(false);
            return;
        }

        const updateUserData = async () => {
            try {
                // Get updated user data
                const userData = await paymentService.getUserProfile();
                setUser(userData);
                setLoading(false);
            } catch (err) {
                console.error('Error updating user data:', err);
                setError('Failed to update user data');
                setLoading(false);
            }
        };

        updateUserData();
    }, [searchParams, setUser]);

    const handleContinue = () => {
        navigate('/account');
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h2>Processing Payment...</h2>
                    <p>Please wait while we confirm your payment.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h2>Payment Error</h2>
                    <p className={styles.error}>{error}</p>
                    <button onClick={handleContinue} className={styles.button}>
                        Return to Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <FaCheckCircle className={styles.successIcon} />
                <h2>Payment Successful!</h2>
                <p>Your credits have been added to your account.</p>
                <button onClick={handleContinue} className={styles.button}>
                    Continue to Account
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccess;
