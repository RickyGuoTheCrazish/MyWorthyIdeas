import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';
import { FaSearch, FaUser, FaCoins, FaCog, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            // Handle search
            console.log('Search:', e.target.value);
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
            const success = await logout();
            if (success) {
                navigate('/');
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return (
        <div className={styles.layout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        IdeasForce
                    </div>
                    <div className={styles.searchContainer}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search ideas..."
                            onKeyPress={handleSearch}
                        />
                    </div>
                    <div className={styles.userSection}>
                        <div className={styles.credits}>
                            <FaCoins className={styles.creditsIcon} />
                            <span>{user?.credits || 0}</span>
                        </div>
                        <div className={styles.userInfo} ref={menuRef}>
                            <div className={styles.userName}>{user?.username || 'User'}</div>
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
                </div>
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
