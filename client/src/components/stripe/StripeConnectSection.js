import React, { useState, useEffect } from 'react';
import { FaStripe, FaExternalLinkAlt, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import stripeConnectService from '../../services/stripeConnectService';
import { useAuth } from '../../context/AuthContext';
import styles from './StripeConnectSection.module.css';

const StripeConnectSection = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [accountStatus, setAccountStatus] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.subscription !== 'seller') {
            setError('Only sellers can connect to Stripe');
            setLoading(false);
            return;
        }
        fetchAccountStatus();
    }, [user]);

    const fetchAccountStatus = async () => {
        try {
            setLoading(true);
            setError('');
            const status = await stripeConnectService.getAccountStatus();
            setAccountStatus(status);
        } catch (err) {
            console.error('Error fetching account status:', err);
            setError('Failed to fetch account status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setLoading(true);
            setError('');
            const { url } = await stripeConnectService.getConnectLink();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No connect URL received');
            }
        } catch (err) {
            console.error('Error getting connect link:', err);
            setError('Failed to connect to Stripe. Please try again.');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <FaSpinner className={styles.spinner} />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || user.subscription !== 'seller') {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>Only sellers can access Stripe Connect features</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {error && (
                <div className={styles.error}>
                    <p>{error}</p>
                </div>
            )}

            {accountStatus?.connected ? (
                <div className={styles.connected}>
                    <FaCheckCircle className={styles.checkIcon} />
                    <h3>Connected to Stripe</h3>
                    <p>Your account is ready to receive payments</p>
                    {accountStatus.status && (
                        <div className={styles.statusDetails}>
                            <p>Charges Enabled: {accountStatus.status.chargesEnabled ? 'Yes' : 'No'}</p>
                            <p>Payouts Enabled: {accountStatus.status.payoutsEnabled ? 'Yes' : 'No'}</p>
                            <p>Details Submitted: {accountStatus.status.detailsSubmitted ? 'Yes' : 'No'}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.connect}>
                    <FaStripe className={styles.stripeIcon} />
                    <h3>Connect with Stripe</h3>
                    <p>Set up your Stripe account to receive payments</p>
                    <button 
                        onClick={handleConnect}
                        className={styles.connectButton}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <FaSpinner className={styles.spinner} />
                                Connecting...
                            </>
                        ) : (
                            <>
                                Connect <FaExternalLinkAlt />
                            </>
                        )}
                    </button>
                    <p className={styles.info}>
                        You'll be redirected to Stripe to complete the onboarding process
                    </p>
                </div>
            )}
        </div>
    );
};

export default StripeConnectSection;
