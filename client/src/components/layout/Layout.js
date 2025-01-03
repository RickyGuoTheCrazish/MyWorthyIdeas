import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import AuthModal from '../modals/AuthModal';
import GuestModeIndicator from './WelcomeBack';
import styles from './Layout.module.css';
import { FaSearch, FaUser, FaCoins, FaCog, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
    const { user, logout, isAuthenticated } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login', email: '' });
    const [showGuestIndicator, setShowGuestIndicator] = useState(false);
    const [searchType, setSearchType] = useState('title'); // 'title' or 'id'
    const [searchQuery, setSearchQuery] = useState('');
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Show guest indicator when not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            // Don't show on auth page
            if (!window.location.pathname.includes('/auth')) {
                setShowGuestIndicator(true);
            }
        } else {
            setShowGuestIndicator(false);
        }
    }, [isAuthenticated]);

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            // Navigate to search results page with query parameters
            navigate(`/search?type=${searchType}&query=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setIsMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAccountSettings = () => {
        setIsMenuOpen(false);
        navigate('/settings');
    };

    const handleLogout = async () => {
        setIsMenuOpen(false);
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const handleAuthAction = (mode) => {
        setAuthModal({ isOpen: true, mode, email: '' });
    };

    const closeAuthModal = () => {
        setAuthModal({ isOpen: false, mode: 'login', email: '' });
    };

    const handleVerify = (email) => {
        setAuthModal(prev => ({ ...prev, mode: 'verify', email }));
    };

    const renderAuthSection = () => {
        if (isAuthenticated) {
            return (
                <div className={styles.userSection}>
                    <div className={styles.credits}>
                        <FaCoins className={styles.creditsIcon} />
                        {user?.subscription === 'buyer' ? (
                            <span>{user?.credits?.toFixed(2) || '0.00'} Credits</span>
                        ) : (
                            <span>${user?.earnings?.toFixed(2) || '0.00'} Earned</span>
                        )}
                    </div>
                    <div className={styles.userInfo} ref={menuRef}>
                        <div className={styles.userName}>{user?.username}</div>
                        <button 
                            className={styles.userMenuButton} 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <div className={styles.userAvatar}>
                                <FaUser />
                            </div>
                            <FaChevronDown className={`${styles.chevron} ${isMenuOpen ? styles.chevronUp : ''}`} />
                        </button>
                        {isMenuOpen && (
                            <div className={styles.userMenu}>
                                <button onClick={handleAccountSettings}>
                                    <FaCog /> Account Settings
                                </button>
                                <button onClick={handleLogout}>
                                    <FaSignOutAlt /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.guestSection}>
                <button 
                    className={styles.loginButton}
                    onClick={() => handleAuthAction('login')}
                >
                    Log In
                </button>
                <button 
                    className={styles.signupButton}
                    onClick={() => handleAuthAction('signup')}
                >
                    Sign Up
                </button>
            </div>
        );
    };

    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <div className={styles.logo}>
                        <Link to="/">IdeasForce</Link>
                    </div>
                    <div className={styles.searchContainer}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={searchType === 'title' 
                                ? "Search ideas by title..." 
                                : "Search by ID (full ID or #XXXXXX format)"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearch}
                        />
                        <select 
                            className={styles.searchType}
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="title">Title</option>
                            <option value="id">ID</option>
                        </select>
                    </div>
                    {renderAuthSection()}
                </header>
                <main className={styles.content}>
                    {children}
                </main>
            </div>
            {authModal.isOpen && (
                <AuthModal 
                    isOpen={authModal.isOpen}
                    mode={authModal.mode}
                    email={authModal.email}
                    onClose={closeAuthModal}
                    onVerify={handleVerify}
                    onModeChange={(mode) => setAuthModal(prev => ({ ...prev, mode }))}
                />
            )}
            {showGuestIndicator && (
                <GuestModeIndicator onClose={() => setShowGuestIndicator(false)} />
            )}
        </div>
    );
};

export default Layout;
