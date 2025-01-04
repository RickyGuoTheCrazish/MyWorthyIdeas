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
    const navigate = useNavigate();

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
                credits: data.credits,
                earnings: data.earnings,
                subscription: data.subscription
            }));

            return data;
        } catch (error) {
            console.error('Failed to fetch financial data:', error);
            throw error;
        }
    }, []);

    const login = useCallback(async (userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('userId', userData.userId);
        localStorage.setItem('username', userData.username);
        localStorage.setItem('subscription', userData.subscription);
        localStorage.setItem('credits', userData.credits);
        localStorage.setItem('earnings', userData.earnings);
        setIsAuthenticated(true);
        setIsTokenExpiredState(false);
        
        // Set basic user data
        setUser({
            userId: userData.userId,
            username: userData.username,
            subscription: userData.subscription,
            credits: userData.credits,
            earnings: userData.earnings
        });

        // Fetch fresh financial data
        await fetchFinancialData();
    }, [fetchFinancialData]);

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
            localStorage.removeItem('credits');
            localStorage.removeItem('earnings');
            setIsAuthenticated(false);
            setUser(null);
            setIsTokenExpiredState(false);
            // Navigate to home page
            navigate('/', { replace: true });
        }
    }, [navigate]);

    const clearSession = useCallback(async () => {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('subscription');
        localStorage.removeItem('credits');
        localStorage.removeItem('earnings');
        
        setIsAuthenticated(false);
        setUser(null);
        setIsTokenExpiredState(true);
    }, []);

    // Function to check if token is expired
    const isTokenExpired = (token) => {
        if (!token) return true;
        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            return decodedToken.exp * 1000 < Date.now();
        } catch (error) {
            console.error('Token validation error:', error);
            return true;
        }
    };

    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsAuthenticated(false);
                setUser(null);
                setIsLoading(false);
                return;
            }

            // Check token expiration
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            if (decodedToken.exp * 1000 < Date.now()) {
                logout();
                return;
            }

            // Get user info from localStorage
            const userId = localStorage.getItem('userId');
            const username = localStorage.getItem('username');
            const subscription = localStorage.getItem('subscription');
            const credits = localStorage.getItem('credits');
            const earnings = localStorage.getItem('earnings');

            if (!userId || !username) {
                throw new Error('User info missing');
            }

            setUser({
                userId,
                username,
                subscription,
                credits: Number(credits),
                earnings: Number(earnings)
            });
            setIsAuthenticated(true);

            // Fetch fresh financial data
            await fetchFinancialData();
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout, fetchFinancialData]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            setUser,
            login, 
            logout,
            clearSession,
            isLoading,
            isTokenExpiredState,
            fetchFinancialData
        }}>
            {children}
        </AuthContext.Provider>
    );
};
