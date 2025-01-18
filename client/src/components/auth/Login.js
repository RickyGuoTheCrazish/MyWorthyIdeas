import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

const Login = ({ onClose, onModeChange }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    // Resend verification state
    const [showResendDialog, setShowResendDialog] = useState(false);
    const [resendEmail, setResendEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendError, setResendError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResendVerification = async (e) => {
        e.preventDefault();
        if (isResending) return;

        if (!resendEmail) {
            setResendError('Please enter your email');
            return;
        }

        setIsResending(true);
        setResendError('');
        setResendMessage('');

        try {
            const response = await fetch('/api/users/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: resendEmail }),
            });

            const data = await response.json();
            
            if (response.ok) {
                setResendMessage('Verification email has been resent. Please check your inbox.');
                // Clear email after successful resend
                setResendEmail('');
            } else {
                setResendError(data.message || 'Failed to resend verification email');
            }
        } catch (err) {
            setResendError('An error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        // Basic validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await login(formData.email, formData.password);
            
            if (result.success) {
                if (onClose) {
                    onClose();
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                if (result.error?.toLowerCase().includes('not verified')) {
                    setShowResendDialog(true);
                    setResendEmail(formData.email);
                }
                setError(result.error || 'Login failed. Please try again.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authForm}>
            <h2>Login</h2>
            {!showResendDialog ? (
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                            {error.toLowerCase().includes('not verified') && (
                                <button 
                                    type="button"
                                    className={styles.resendLink}
                                    onClick={() => setShowResendDialog(true)}
                                >
                                    Resend verification email
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className={styles.formGroup}>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <div className={styles.passwordGroup}>
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                            <button type="button" className={styles.forgotPassword}>
                                FORGOT PASSWORD?
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleResendVerification}>
                    <h3>Resend Verification Email</h3>
                    <p className={styles.hint}>
                        Enter your email address and we'll send you a new verification email.
                    </p>

                    {resendError && <div className={styles.error}>{resendError}</div>}
                    {resendMessage && <div className={styles.success}>{resendMessage}</div>}
                    
                    <div className={styles.formGroup}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            required
                            disabled={isResending}
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={`${styles.submitButton} ${isResending ? styles.loading : ''}`}
                        disabled={isResending}
                    >
                        {isResending ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <button 
                        type="button"
                        className={styles.authLink}
                        onClick={() => {
                            setShowResendDialog(false);
                            setResendEmail('');
                            setResendError('');
                            setResendMessage('');
                        }}
                    >
                        Back to Login
                    </button>
                </form>
            )}
            <div className={styles.authSwitch}>
                Don't have an account?{' '}
                <button 
                    onClick={() => onModeChange('signup')} 
                    className={styles.authLink}
                    disabled={isLoading}
                >
                    Sign up
                </button>
            </div>
        </div>
    );
};

export default Login;
