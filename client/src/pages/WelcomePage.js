import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../components/modals/AuthModal';
import { useAuth } from '../context/AuthContext';
import styles from './WelcomePage.module.css';

const WelcomePage = () => {
    const [authModal, setAuthModal] = useState({
        isOpen: false,
        mode: null,
        email: null
    });
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const openAuthModal = (mode) => {
        setAuthModal({ isOpen: true, mode, email: null });
    };

    const closeAuthModal = () => {
        setAuthModal({ isOpen: false, mode: null, email: null });
    };

    const handleVerifyEmail = (email) => {
        setAuthModal(prev => ({ ...prev, mode: 'verify', email }));
    };

    const handleModeChange = (newMode) => {
        setAuthModal(prev => ({ ...prev, mode: newMode, email: null }));
    };

    return (
        <div className={styles.welcomePage}>
            <header className={styles.header}>
                <div className={styles.logo}>IdeasForce</div>
                <nav className={styles.nav}>
                    <button onClick={() => openAuthModal('login')} className={styles.loginBtn}>
                        Login
                    </button>
                    <button onClick={() => openAuthModal('signup')} className={styles.signupBtn}>
                        Sign Up
                    </button>
                </nav>
            </header>

            <main className={styles.main}>
                <h1>Welcome to IdeasForce</h1>
                <p>Your platform for sharing and discovering innovative ideas</p>
            </main>

            <AuthModal 
                isOpen={authModal.isOpen}
                mode={authModal.mode}
                onClose={closeAuthModal}
                onVerify={handleVerifyEmail}
                onModeChange={handleModeChange}
                email={authModal.email}
            />
        </div>
    );
};

export default WelcomePage;