import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Simple function to check token expiration
const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const { exp } = JSON.parse(jsonPayload);
        return Date.now() >= exp * 1000;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
    }
};

// Create a separate component to use hooks
const AuthContextProvider = ({ children }) => {
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
            setIsTokenExpiredState(true);
            // Navigate to auth page
            navigate('/auth', { replace: true });
        }
    }, [navigate]);

    const clearSession = useCallback(async () => {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('subscription');

        // Clear cookies
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Reset all auth states
        setIsAuthenticated(false);
        setUser(null);
        setIsTokenExpiredState(false);

        // Call the logout endpoint to clear server-side session
        try {
            await fetch('http://localhost:6001/api/users/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }, []);

    // Effect to check token expiration periodically
    useEffect(() => {
        let checkTokenInterval;
        
        const checkToken = () => {
            const token = localStorage.getItem('token');
            if (token && isTokenExpired(token)) {
                setIsTokenExpiredState(true);
                setIsAuthenticated(false);
                setUser(null);
            }
        };

        if (isAuthenticated) {
            checkToken(); // Check immediately
            checkTokenInterval = setInterval(checkToken, 60000); // Then check every minute
        }

        return () => {
            if (checkTokenInterval) {
                clearInterval(checkTokenInterval);
            }
        };
    }, [isAuthenticated]);

    useEffect(() => {
        const checkAuth = () => {
            try {
                const token = localStorage.getItem('token');
                const userId = localStorage.getItem('userId');
                const username = localStorage.getItem('username');
                const subscription = localStorage.getItem('subscription');

                if (token && userId) {
                    // Check if token is expired
                    if (isTokenExpired(token)) {
                        setIsAuthenticated(false);
                        setUser(null);
                    } else {
                        setIsAuthenticated(true);
                        setUser({
                            userId,
                            username,
                            subscription
                        });
                    }
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setIsAuthenticated(false);
                setUser(null);
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            isLoading, 
            user, 
            login, 
            logout,
            clearSession,
            isTokenExpired: isTokenExpiredState 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Wrapper component that provides Router context
export const AuthProvider = ({ children }) => {
    return (
        <AuthContextProvider>
            {children}
        </AuthContextProvider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
