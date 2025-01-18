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

    // Email verification state
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState('');
    const [verificationError, setVerificationError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch('/api/users/myinfo', {
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
            const response = await fetch('/api/users/change-password', {
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

    const handleResendVerification = async () => {
        if (isResendingVerification) return;

        setIsResendingVerification(true);
        setVerificationError('');
        setVerificationMessage('');

        try {
            const response = await fetch('/api/users/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: userData.email }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setVerificationMessage('Verification email has been resent. Please check your inbox.');
            } else {
                setVerificationError(data.message || 'Failed to resend verification email');
            }
        } catch (err) {
            setVerificationError('An error occurred. Please try again.');
        } finally {
            setIsResendingVerification(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <FaSpinner className={styles.spinner} />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>{error}</div>
        );
    }

    if (!userData) {
        return (
            <div className={styles.loading}>
                <p>Please log in to view account settings.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Account Settings</h1>
            <div className={styles.content}>
                {/* First Row: User Info and Password Change */}
                <div className={styles.row}>
                    {/* User Info Section */}
                    <div className={styles.card}>
                        <h2>Profile Information</h2>
                        <div className={styles.profileInfo}>
                            <div className={styles.infoItem}>
                                <label>Username</label>
                                <p>{userData?.username}</p>
                            </div>
                            <div className={styles.infoItem}>
                                <label>Email</label>
                                <div className={styles.emailContainer}>
                                    <p>{userData?.email}</p>
                                    {!userData?.isVerified && (
                                        <div className={styles.verificationSection}>
                                            <span className={styles.unverifiedBadge}>Unverified</span>
                                            <button 
                                                onClick={handleResendVerification}
                                                className={styles.resendButton}
                                                disabled={isResendingVerification}
                                            >
                                                {isResendingVerification ? 'Sending...' : 'Resend Verification Email'}
                                            </button>
                                            {verificationMessage && <div className={styles.success}>{verificationMessage}</div>}
                                            {verificationError && <div className={styles.error}>{verificationError}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <label>Account Type</label>
                                <p className={styles.accountType}>
                                    {userData?.subscription === 'seller' ? (
                                        <span className={styles.sellerBadge}>Seller</span>
                                    ) : (
                                        <span className={styles.buyerBadge}>Buyer</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Change Section */}
                    <div className={styles.card}>
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
                </div>

                {/* Second Row: Payment Settings (for sellers only) */}
                {userData?.subscription === 'seller' && (
                    <div className={styles.row}>
                        <div className={styles.card + ' ' + styles.fullWidth}>
                            <h2>Payment Settings</h2>
                            <StripeConnectSection userData={userData} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSettings;
