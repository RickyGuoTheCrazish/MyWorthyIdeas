import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';
import styles from '../styles/AccountSettings.module.css';
import StripeConnectSection from '../components/stripe/StripeConnectSection';
import stripeConnectService from '../services/stripeConnectService';
import { useLocation } from 'react-router-dom';

const AccountSettings = () => {
    const { isAuthenticated, userId } = useAuth();
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const processedCode = useRef(false);
    
    // Password change state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

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

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        // Reset states
        setPasswordError('');
        setPasswordSuccess('');
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }
        
        // Validate password requirements
        if (newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[\d_-]/.test(newPassword)) {
            setPasswordError('Password must be at least 6 characters and contain a letter and a number/symbol');
            return;
        }

        setIsChangingPassword(true);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:6001/api/users/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
            }

            setPasswordSuccess('Password changed successfully! Please use your new password next time you log in.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Error changing password:', err);
            setPasswordError(err.message);
        } finally {
            setIsChangingPassword(false);
        }
    };

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

                    <div className={styles.passwordSection}>
                        <h2>Change Password</h2>
                        <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            {passwordError && <div className={styles.error}>{passwordError}</div>}
                            {passwordSuccess && <div className={styles.success}>{passwordSuccess}</div>}
                            <button 
                                type="submit" 
                                className={styles.button}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <>
                                        <FaSpinner className={styles.spinner} />
                                        Changing Password...
                                    </>
                                ) : 'Change Password'}
                            </button>
                        </form>
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
