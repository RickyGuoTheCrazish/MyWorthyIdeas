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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:6001/api/users/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (response.ok) {
                // Use the login function from AuthContext
                login(data);
                
                // Close modal and navigate
                onClose();
                navigate('/dashboard', { replace: true });
            } else {
                // Handle specific error cases
                switch (response.status) {
                    case 403:
                        setError('Please verify your email before logging in.');
                        break;
                    case 401:
                        setError('Invalid email or password.');
                        break;
                    case 404:
                        setError('No account found with this email.');
                        break;
                    default:
                        setError(data.message || 'Login failed. Please try again.');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Network error. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authForm}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
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

                {error && <div className={styles.error}>{error}</div>}
                
                <button 
                    type="submit" 
                    className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <div className={styles.authSwitch}>
                Don't have an account?{' '}
                <button 
                    onClick={() => onModeChange('signup')} 
                    className={styles.authLink}
                >
                    Sign Up
                </button>
            </div>
        </div>
    );
};

export default Login;
