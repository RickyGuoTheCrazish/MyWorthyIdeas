import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [isTokenExpiredState, setIsTokenExpiredState] = useState(false);
    const [stripeConnectStatus, setStripeConnectStatus] = useState(null);
    const navigate = useNavigate();

    // Helper function to create consistent user object
    const createUserObject = useCallback((data) => {
        return {
            userId: data.userId || data.id, // Handle both formats
            username: data.username,
            subscription: data.subscription,
            stripeConnectStatus: data.stripeConnectStatus || null,
            email: data.email || null
        };
    }, []);

    // Function to fetch Stripe Connect account status
    const fetchStripeConnectStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:6001/api/stripe/connect/account/status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch Stripe Connect status');
            }

            const data = await response.json();
            setStripeConnectStatus(data);
            return data;
        } catch (error) {
            console.error('Failed to fetch Stripe Connect status:', error);
            throw error;
        }
    }, []);

    // Function to get Stripe Connect OAuth link
    const getStripeConnectLink = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            const response = await fetch('http://localhost:6001/api/stripe/connect/oauth/link', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get Stripe Connect link');
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Failed to get Stripe Connect link:', error);
            throw error;
        }
    }, []);

    // Function to create a checkout session for idea purchase
    const createCheckoutSession = useCallback(async (amount, sellerId, ideaId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No token found');

            const response = await fetch('http://localhost:6001/api/stripe/connect/checkout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    sellerId,
                    ideaId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create checkout session');
            }

            const data = await response.json();
            return data.id; // Returns checkout session ID
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            throw error;
        }
    }, []);

    // Function to fetch financial data
    const fetchFinancialData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('http://localhost:6001/api/users/financial-data', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch financial data');
            }

            const data = await response.json();
            
            // Update user state with new financial data
            setUser(prevUser => ({
                ...prevUser,
                subscription: data.subscription
            }));

            return data;
        } catch (error) {
            console.error('Failed to fetch financial data:', error);
            throw error;
        }
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            const response = await fetch('http://localhost:6001/api/users/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific error cases
                switch (response.status) {
                    case 429:
                        throw new Error('Too many attempts. Please try again later.');
                    case 403:
                        throw new Error('Please verify your email before logging in.');
                    case 401:
                        throw new Error('Invalid email or password.');
                    case 404:
                        throw new Error('No account found with this email.');
                    default:
                        throw new Error(data.message || 'Failed to login');
                }
            }

            // Store token separately
            localStorage.setItem('token', data.token);
            
            // Create consistent user object
            const user = createUserObject(data);
            setUser(user);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(user));

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }, [createUserObject]);

    const register = useCallback(async (userData) => {
        try {
            const response = await fetch('http://localhost:6001/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            return { 
                success: true, 
                userId: data.userId,
                message: data.message 
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }, []);

    const isSeller = useCallback(() => user?.subscription === 'seller', [user]);
    const isBuyer = useCallback(() => user?.subscription === 'buyer', [user]);

    const logout = useCallback(async () => {
        try {
            // Call logout endpoint
            const response = await fetch('http://localhost:6001/api/users/logout', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local storage and state
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('subscription');
            setIsAuthenticated(false);
            setUser(null);
            setStripeConnectStatus(null);
            navigate('/login');
        }
    }, [navigate]);

    // Check token validity and fetch user data on mount
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('http://localhost:6001/api/users/check-auth', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Token invalid');
                }

                const data = await response.json();
                setIsAuthenticated(true);
                
                // Create consistent user object
                const user = createUserObject(data);
                setUser(user);

                // Fetch fresh data
                await Promise.all([
                    fetchFinancialData(),
                    fetchStripeConnectStatus()
                ]);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
                setStripeConnectStatus(null);
                if (error.message === 'Token expired') {
                    setIsTokenExpiredState(true);
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [fetchFinancialData, fetchStripeConnectStatus, createUserObject]);

    const value = {
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        isTokenExpiredState,
        stripeConnectStatus,
        getStripeConnectLink,
        createCheckoutSession,
        fetchStripeConnectStatus,
        register,
        isSeller,
        isBuyer
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
