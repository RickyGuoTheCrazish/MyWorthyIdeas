import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';
import styles from '../styles/AccountSettings.module.css';
import StripeConnectSection from '../components/stripe/StripeConnectSection';

const AccountSettings = () => {
    const { user } = useAuth();
    console.log(user)
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

                    {user.subscription == 'seller' && (
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
