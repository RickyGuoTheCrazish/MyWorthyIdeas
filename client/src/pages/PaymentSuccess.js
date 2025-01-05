import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaSpinner } from 'react-icons/fa';
import styles from '../styles/common.module.css';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    useEffect(() => {
        // Wait a brief moment to ensure Stripe webhook has processed
        const redirectTimer = setTimeout(() => {
            navigate('/account-settings');
        }, 2000);

        return () => clearTimeout(redirectTimer);
    }, [navigate]);

    return (
        <div className={styles.loadingContainer}>
            <FaSpinner className={styles.spinner} />
            <p>Payment successful! Redirecting to your account...</p>
        </div>
    );
};

export default PaymentSuccess;
