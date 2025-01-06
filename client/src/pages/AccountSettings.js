import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';
import styles from '../styles/AccountSettings.module.css';
import StripeConnectSection from '../components/stripe/StripeConnectSection';
import stripeConnectService from '../services/stripeConnectService';
import { useLocation } from 'react-router-dom';

const AccountSettings = () => {
    const { user } = useAuth();
    const location = useLocation();
    const processedCode = useRef(false);

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
    }, [location.search]); // Only run when search params change

    if (!user) {
        return (
            <div className={styles.loadingContainer}>
                <FaSpinner className={styles.spinnerIcon} />
            </div>
        );
    }

    return (
        <div className={styles.accountSettingsContainer}>
            <div className={styles.contentContainer}>
                <div className={styles.settingsSection}>
                    <h2>Account Settings</h2>
                    
                    <div className={styles.profileInfo}>
                        <p><strong>Username:</strong> {user.username}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Account Type:</strong> {user.subscription}</p>
                    </div>

                    {user.subscription === 'seller' && (
                        <div className={styles.stripeConnectSection}>
                            <h3>Stripe Connect</h3>
                            <StripeConnectSection />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
