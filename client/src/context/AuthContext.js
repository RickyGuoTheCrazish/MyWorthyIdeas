import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import stripeConnectService from '../services/stripeConnectService';

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
            userId: data.userId || data._id,
            username: data.username,
            email: data.email,
            subscription: data.subscription || 'buyer',
            stripeConnectStatus: data.stripeConnectStatus || null,
            postedIdeas: data.postedIdeas || [],
            boughtIdeas: data.boughtIdeas || []
        };
    }, []);

    // Function to fetch Stripe Connect status
    const fetchStripeConnectStatus = useCallback(async () => {
        try {
            const data = await stripeConnectService.getAccountStatus();
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
            const { url } = await stripeConnectService.getConnectLink();
            return url;
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

    const login = useCallback(async (email, password) => {
        try {
            const response = await fetch('http://localhost:6001/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to login');
            }

            // Store token in localStorage
            localStorage.setItem('token', data.token);

            // Create consistent user object
            // const user = createUserObject(data);
            // setUser(user);
            setIsAuthenticated(true);
            setIsTokenExpiredState(false);

            // Store minimal user info
            // localStorage.setItem('user', JSON.stringify({
            //     userId: user.userId,
            //     email: user.email,
            //     username: user.username,
            //     subscription: user.subscription
            // }));

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }, []);


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
                // const user = createUserObject(data);
                // setUser(user);

                // Fetch fresh data - don't let these errors affect auth
                try {
                    await fetchStripeConnectStatus().catch(err => console.error('Failed to fetch Stripe status:', err));
                } catch (error) {
                    console.error('Error fetching additional data:', error);
                    // Don't log out - just continue
                }
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
    }, [fetchStripeConnectStatus]);

    const value = {
        isAuthenticated,
        isLoading,
        // user: {
        //     userId: user?.userId,
        //     username: user?.username,
        //     email: user?.email,
        //     subscription: user?.subscription
        // },
        login,
        logout,
        isTokenExpiredState,
        isSeller,
        isBuyer,
        register,
        fetchStripeConnectStatus,
        getStripeConnectLink,
        createCheckoutSession
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
