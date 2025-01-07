import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import stripeConnectService from '../../services/stripeConnectService';
import styles from './StripeConnectSection.module.css';
import { FaStripe, FaCheckCircle, FaClock, FaExclamationCircle } from 'react-icons/fa';
import { BsLightningChargeFill } from 'react-icons/bs';

const StripeConnectSection = () => {
    const { user } = useAuth();
    const [accountStatus, setAccountStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAccountStatus();
    }, []);

    const fetchAccountStatus = async () => {
        try {
            const status = await stripeConnectService.getAccountStatus();
            setAccountStatus(status);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching account status:', error);
            setError('Failed to fetch account status');
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const { url } = await stripeConnectService.getConnectLink();
            window.location.href = url;
        } catch (error) {
            console.error('Error getting connect link:', error);
            setError('Failed to get connect link');
        }
    };

    const handleStripeAccess = () => {
        window.open('https://stripe.com', '_blank');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading account information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <FaExclamationCircle className={styles.errorIcon} />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <FaStripe className={styles.stripeIcon} />
                <h2>Payment Settings</h2>
            </div>

            {accountStatus?.connected ? (
                <div className={styles.connectedContainer}>
                    <div className={styles.statusBanner}>
                        <FaCheckCircle className={styles.checkIcon} />
                        <div className={styles.statusText}>
                            <h3>Connected to Stripe</h3>
                            <p>Your account is ready to receive payments</p>
                        </div>
                    </div>

                    <div className={styles.infoCards}>
                        <div className={styles.infoCard}>
                            <BsLightningChargeFill className={styles.lightningIcon} />
                            <h4>Instant Payouts</h4>
                            <p>Earnings are automatically transferred to your bank account as soon as a purchase is completed</p>
                        </div>

                        <div className={styles.infoCard}>
                            <div className={styles.statusDetails}>
                                <h4>Account Status</h4>
                                <ul>
                                    <li className={accountStatus.chargesEnabled ? styles.enabled : styles.disabled}>
                                        <FaCheckCircle className={styles.statusIcon} />
                                        <span>Accept Payments</span>
                                    </li>
                                    <li className={accountStatus.payoutsEnabled ? styles.enabled : styles.disabled}>
                                        <FaCheckCircle className={styles.statusIcon} />
                                        <span>Receive Payouts</span>
                                    </li>
                                    <li className={accountStatus.detailsSubmitted ? styles.enabled : styles.disabled}>
                                        <FaCheckCircle className={styles.statusIcon} />
                                        <span>Account Details</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button 
                            className={styles.stripeButton}
                            onClick={handleStripeAccess}
                        >
                            <FaStripe className={styles.buttonIcon} />
                            Access Stripe Dashboard
                        </button>
                        <p className={styles.hint}>Visit Stripe to manage your payouts and view transaction history</p>
                    </div>
                </div>
            ) : (
                <div className={styles.connectContainer}>
                    <div className={styles.connectCard}>
                        <FaClock className={styles.clockIcon} />
                        <h3>Connect Your Account</h3>
                        <p>Link your Stripe account to start receiving instant payments for your ideas</p>
                        <ul className={styles.benefitsList}>
                            <li>
                                <FaCheckCircle className={styles.checkIcon} />
                                <span>Instant payouts to your bank account</span>
                            </li>
                            <li>
                                <FaCheckCircle className={styles.checkIcon} />
                                <span>Secure payment processing</span>
                            </li>
                            <li>
                                <FaCheckCircle className={styles.checkIcon} />
                                <span>Real-time transaction tracking</span>
                            </li>
                        </ul>
                        <button 
                            className={styles.connectButton}
                            onClick={handleConnect}
                        >
                            <FaStripe className={styles.buttonIcon} />
                            Connect with Stripe
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StripeConnectSection;
