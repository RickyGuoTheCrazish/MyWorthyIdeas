import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import styles from '../styles/common.module.css';

const StripeConnectCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { fetchStripeConnectStatus } = useAuth();
    const [status, setStatus] = useState('loading'); // loading, success, error

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check if there's an error from Stripe
                if (searchParams.get('error')) {
                    setStatus('error');
                    return;
                }

                // Check if this is a success callback from Stripe
                if (searchParams.get('success') === 'true') {
                    // Fetch the latest account status
                    const accountStatus = await fetchStripeConnectStatus();
                    
                    if (accountStatus) {
                        setStatus('success');
                    } else {
                        setStatus('error');
                    }
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Error handling Stripe Connect callback:', error);
                setStatus('error');
            }
        };

        handleCallback();
    }, [searchParams, fetchStripeConnectStatus]);

    // Redirect after showing status
    useEffect(() => {
        if (status !== 'loading') {
            const timer = setTimeout(() => {
                navigate('/account-settings');
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [status, navigate]);

    const renderContent = () => {
        switch (status) {
            case 'success':
                return (
                    <>
                        <FaCheckCircle className={styles.successIcon} />
                        <h2>Successfully Connected!</h2>
                        <p>Your Stripe account has been connected. You can now receive payments for your ideas.</p>
                        <p>Redirecting to account settings...</p>
                    </>
                );
            case 'error':
                return (
                    <>
                        <FaTimesCircle className={styles.errorIcon} />
                        <h2>Connection Failed</h2>
                        <p>We couldn't connect your Stripe account. Please try again from your account settings.</p>
                        <p>Redirecting to account settings...</p>
                    </>
                );
            default:
                return (
                    <>
                        <FaSpinner className={styles.spinner} />
                        <p>Processing your Stripe connection...</p>
                    </>
                );
        }
    };

    return (
        <div className={styles.callbackContainer}>
            {renderContent()}
        </div>
    );
};

export default StripeConnectCallback;
