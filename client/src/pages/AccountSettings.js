import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';
import styles from '../styles/AccountSettings.module.css';
import StripeConnectSection from '../components/stripe/StripeConnectSection';
import stripeConnectService from '../services/stripeConnectService';
import { useLocation } from 'react-router-dom';

const AccountSettings = () => {
    const { isAuthenticated } = useAuth();
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const processedCode = useRef(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch('http://localhost:6001/api/users/myinfo', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                setUserData(data);
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchUserData();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (code && !processedCode.current) {
            processedCode.current = true;
            
            // Clear the code from URL immediately
            window.history.replaceState({}, document.title, "/account-settings");
            
            console.log('Got code from Stripe:', code);
            stripeConnectService.handleOAuthCallback(code)
                .then(() => {
                    console.log('Successfully connected Stripe account');
                    window.location.reload();
                })
                .catch(error => {
                    console.error('Error handling Stripe callback:', error);
                    processedCode.current = false; // Reset in case we need to try again
                });
        }
    }, [location.search]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <FaSpinner className={styles.spinnerIcon} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p>Error loading account settings: {error}</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className={styles.loadingContainer}>
                <p>Please log in to view account settings.</p>
            </div>
        );
    }

    return (
        <div className={styles.accountSettingsContainer}>
            <div className={styles.contentContainer}>
                <div className={styles.settingsSection}>
                    <h2>Account Settings</h2>
                    
                    <div className={styles.profileCard}>
                        <div className={styles.profileInfo}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Username</span>
                                <span className={styles.infoValue}>{userData.username}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Email</span>
                                <span className={styles.infoValue}>{userData.email}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Account Type</span>
                                <span className={styles.infoValue}>
                                    <span className={`${styles.accountBadge} ${styles[userData.subscription]}`}>
                                        {userData.subscription}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {userData.subscription === 'seller' && (
                        <div className={styles.stripeConnectSection}>
                            {/* <h3>Stripe Connect</h3> */}
                            <StripeConnectSection />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
