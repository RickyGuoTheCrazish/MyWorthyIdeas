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

    const login = useCallback((userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('userId', userData.userId);
        localStorage.setItem('username', userData.username);
        localStorage.setItem('subscription', userData.subscription);
        setIsAuthenticated(true);
        setIsTokenExpiredState(false);
        setUser({
            userId: userData.userId,
            username: userData.username,
            subscription: userData.subscription
        });
    }, []);

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
        const token = localStorage.getItem('token');
        if (!token) {
            setIsAuthenticated(false);
            setUser(null);
            setIsLoading(false);
            return;
        }

        try {
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

            if (!userId || !username) {
                throw new Error('User info missing');
            }

            setUser({
                userId,
                username,
                subscription
            });
            setIsAuthenticated(true);
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            login, 
            logout,
            clearSession,
            isLoading,
            isTokenExpiredState
        }}>
            {children}
        </AuthContext.Provider>
    );
};
