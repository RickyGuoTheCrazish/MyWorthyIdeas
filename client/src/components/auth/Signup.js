import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';

const Signup = ({ onClose, onVerify, onModeChange }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        subscription: 'buyer' // Default to buyer
    });
    const [validations, setValidations] = useState({
        username: false,
        password: false,
        confirmPassword: false,
        email: false,
    });
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        general: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const subscriptionOptions = [
        { value: 'buyer', label: 'Buyer - Purchase and collect great ideas' },
        { value: 'seller', label: 'Seller - Create and sell your ideas' }
    ];

    const validateUsername = (username) => {
        const usernameRegex = /^[A-Za-z0-9_\- ]+$/;
        return username.length >= 6 && usernameRegex.test(username);
    };

    const validatePassword = (password) => {
        const hasLetter = /[A-Za-z]/.test(password);
        const hasDigitOrSymbol = /[\d_\-]/.test(password);
        return password.length >= 6 && hasLetter && hasDigitOrSymbol;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Validate fields
        switch (name) {
            case 'username':
                setValidations(prev => ({ ...prev, username: validateUsername(value) }));
                break;
            case 'password':
                const isPasswordValid = validatePassword(value);
                setValidations(prev => ({ 
                    ...prev, 
                    password: isPasswordValid,
                    confirmPassword: isPasswordValid && value === formData.confirmPassword
                }));
                break;
            case 'confirmPassword':
                setValidations(prev => ({ 
                    ...prev, 
                    confirmPassword: validatePassword(formData.password) && value === formData.password 
                }));
                break;
            case 'email':
                setValidations(prev => ({ 
                    ...prev, 
                    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) 
                }));
                break;
            default:
                break;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        
        if (formData.password !== formData.confirmPassword) {
            setErrors(prev => ({ 
                ...prev, 
                password: 'Passwords do not match',
                confirmPassword: 'Passwords do not match'
            }));
            return;
        }

        setIsLoading(true);
        setErrors({ username: '', email: '', password: '', confirmPassword: '', general: '' });

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                    email: formData.email,
                    subscription: formData.subscription.toLowerCase(),
                }),
            });

            const data = await response.json();
            
            if (response.ok) {
                onVerify(formData.email);
            } else {
                // Handle errors based on status code and error type
                switch (response.status) {
                    case 422: // Validation errors
                        if (data.field) {
                            setErrors(prev => ({ 
                                ...prev, 
                                [data.field]: data.message 
                            }));
                        } else {
                            setErrors(prev => ({ 
                                ...prev, 
                                general: data.message 
                            }));
                        }
                        break;

                    case 409: // Conflict - duplicate username/email
                        setErrors(prev => ({ 
                            ...prev, 
                            [data.field]: data.message 
                        }));
                        break;

                    case 502: // Email sending failed
                        setErrors(prev => ({ 
                            ...prev, 
                            general: 'Failed to send verification email. Our email service might be down. Please try again later.' 
                        }));
                        break;

                    case 503: // Database service unavailable
                        setErrors(prev => ({ 
                            ...prev, 
                            general: 'Our service is temporarily unavailable. Please try again later.' 
                        }));
                        break;

                    case 500: // Server error
                        console.error('Server error:', data.error);
                        setErrors(prev => ({ 
                            ...prev, 
                            general: 'An unexpected error occurred on our servers. Please try again later.' 
                        }));
                        break;

                    default:
                        console.error('Unknown error:', data);
                        setErrors(prev => ({ 
                            ...prev, 
                            general: data.message || 'An unexpected error occurred. Please try again.' 
                        }));
                }
            }
        } catch (err) {
            console.error('Network error:', err);
            setErrors(prev => ({ 
                ...prev, 
                general: 'Unable to connect to the server. Please check your connection and try again.' 
            }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authForm}>
            <h2>Sign Up</h2>
            <form onSubmit={handleSubmit}>
                <div className={`${styles.formGroup} ${validations.username ? styles.valid : ''} ${errors.username ? styles.error : ''}`}>
                    <input
                        type="text"
                        name="username"
                        placeholder="Username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    {validations.username && <span className={styles.validationIcon}>✓</span>}
                    {errors.username ? (
                        <small className={styles.errorMessage}>{errors.username}</small>
                    ) : (
                        <small className={styles.hint}>
                            Username must be at least 6 characters and can only contain letters, numbers, spaces, and _ -
                        </small>
                    )}
                </div>

                <div className={`${styles.formGroup} ${validations.password ? styles.valid : ''} ${errors.password ? styles.error : ''}`}>
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    {validations.password && <span className={styles.validationIcon}>✓</span>}
                    {errors.password ? (
                        <small className={styles.errorMessage}>{errors.password}</small>
                    ) : (
                        <small className={styles.hint}>
                            Password must be at least 6 characters and include letters and numbers or symbols (_ -)
                        </small>
                    )}
                </div>

                <div className={`${styles.formGroup} ${validations.confirmPassword ? styles.valid : ''} ${errors.confirmPassword ? styles.error : ''}`}>
                    <input
                        type="password"
                        name="confirmPassword"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    {validations.confirmPassword && <span className={styles.validationIcon}>✓</span>}
                    {errors.confirmPassword ? (
                        <small className={styles.errorMessage}>{errors.confirmPassword}</small>
                    ) : (
                        <small className={styles.hint}>
                            Re-enter your password
                        </small>
                    )}
                </div>

                <div className={`${styles.formGroup} ${validations.email ? styles.valid : ''} ${errors.email ? styles.error : ''}`}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                    {validations.email && <span className={styles.validationIcon}>✓</span>}
                    {errors.email ? (
                        <small className={styles.errorMessage}>{errors.email}</small>
                    ) : (
                        <small className={styles.hint}>
                            Enter your email address
                        </small>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <select
                        name="subscription"
                        value={formData.subscription}
                        onChange={handleChange}
                        className={styles.select}
                        required
                        disabled={isLoading}
                    >
                        {subscriptionOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <small className={styles.hint}>
                        Choose your account type
                    </small>
                </div>

                {errors.general && <div className={styles.error}>{errors.general}</div>}
                
                <button 
                    type="submit" 
                    className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
                    disabled={isLoading || !Object.values(validations).every(Boolean)}
                >
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
            <div className={styles.authSwitch}>
                Already have an account?{' '}
                <button 
                    onClick={() => onModeChange('login')} 
                    className={styles.authLink}
                >
                    Login
                </button>
            </div>
        </div>
    );
};

export default Signup;
