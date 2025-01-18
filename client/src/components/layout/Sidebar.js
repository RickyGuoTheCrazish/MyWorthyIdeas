import React, { useState, useEffect } from 'react';
import { Link, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import { FaHome, FaSearch, FaPlus, FaCog, FaHistory, FaGavel } from 'react-icons/fa';

// Import categories from ideaModel constants
const CATEGORIES = {
    "Technology": ["Computer", "Assembly", "Electrical Engineering", "Artificial Intelligence", "Software Development", "Networking & Security", "Other"],
    "Games": ["Video Games", "Board & Card Games", "RPGs", "Mobile Games", "eSports", "Other"],
    "Business": ["Startups & Entrepreneurship", "Marketing & Sales", "eCommerce", "Management & Leadership", "Finance & Investing", "Other"],
    "Life": ["Personal Development", "Relationships & Family", "Travel & Leisure", "Hobbies & DIY", "Culture & Society", "Other"],
    "Arts & Design": ["Painting & Drawing", "Graphic Design & Illustration", "Photography & Film", "Architecture & Interior Design", "Fashion & Textiles", "Other"],
    "Science": ["Biology & Ecology", "Chemistry & Materials", "Physics & Astronomy", "Earth Science & Geology", "Research Methods & Academia", "Other"],
    "Health & Wellness": ["Fitness & Exercise", "Nutrition & Diet", "Mental Health", "Holistic & Alternative", "Medical & Anatomy", "Other"],
    "Other": ["Other"]
};

const Sidebar = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const [expandedCategories, setExpandedCategories] = useState({});
    const [userInfo, setUserInfo] = useState(null);
    const [recentIdeas, setRecentIdeas] = useState([]);
    const [recentLoading, setRecentLoading] = useState(false);
    const [recentError, setRecentError] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch('/api/users/myinfo', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user data');
                }

                const data = await response.json();
                setUserInfo(data);
            } catch (err) {
                console.error('Error fetching user data:', err);
            }
        };

        if (isAuthenticated) {
            fetchUserData();
        } else {
            setUserInfo(null);
        }
    }, [isAuthenticated]);

    const fetchRecentIdeas = async () => {
        if (!isAuthenticated) return;
        
        setRecentLoading(true);
        setRecentError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/ideas/recent', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include' // Important: include cookies in request
            });

            if (!response.ok) {
                throw new Error('Failed to fetch recent ideas');
            }

            const data = await response.json();
            setRecentIdeas(data.ideas || []);
        } catch (err) {
            console.error('Error fetching recent ideas:', err);
            setRecentError(err.message);
        } finally {
            setRecentLoading(false);
        }
    };

    // Fetch recent ideas when the section is expanded
    useEffect(() => {
        if (expandedCategories.recent) {
            fetchRecentIdeas();
        }
    }, [expandedCategories.recent]);

    // Also fetch when location changes (i.e., when viewing a new idea)
    useEffect(() => {
        if (expandedCategories.recent) {
            fetchRecentIdeas();
        }
    }, [location.pathname, expandedCategories.recent]);

    const isSeller = userInfo?.subscription === 'seller';

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const formatCategoryPath = (category) => {
        return category.toLowerCase().replace(/ & /g, '-');
    };

    const isActive = (path) => {
        if (path === '/' || path === '/recommendations') {
            return location.pathname === '/recommendations' || location.pathname === '/';
        }
        return location.pathname === path;
    };

    const isCategoryActive = (mainCategory, subCategory = null) => {
        const mainPath = `/categories/${formatCategoryPath(mainCategory)}`;
        if (subCategory) {
            const fullPath = `${mainPath}/${formatCategoryPath(subCategory)}`;
            return location.pathname === fullPath;
        }
        return location.pathname.startsWith(mainPath);
    };

    return (
        <div className={styles.sidebar}>
            <Link 
                to="/recommendations" 
                className={`${styles.menuItem} ${isActive('/recommendations') ? styles.active : ''}`}
            >
                <span className={styles.icon}>🎯</span>
                Recommendations
            </Link>
            
            {isAuthenticated && (
                <Link 
                    to="/dashboard" 
                    className={`${styles.menuItem} ${isActive('/dashboard') ? styles.active : ''}`}
                >
                    <span className={styles.icon}>📊</span>
                    My Ideas
                </Link>
            )}

            {isSeller && (
                <Link 
                    to="/create" 
                    className={`${styles.menuItem} ${isActive('/create') ? styles.active : ''}`}
                >
                    <span className={styles.icon}>💡</span>
                    Create New Idea
                </Link>
            )}

            <div className={styles.section}>
                <button 
                    className={styles.sectionHeader}
                    onClick={() => toggleCategory('recent')}
                >
                    <span className={styles.icon}>⏰</span>
                    Recent
                    <span className={`${styles.arrow} ${expandedCategories.recent ? styles.expanded : ''}`}>
                        ▼
                    </span>
                </button>
                {expandedCategories.recent && (
                    <div className={styles.subMenu}>
                        {recentLoading ? (
                            <div className={styles.subMenuItem}>Loading...</div>
                        ) : recentError ? (
                            <div className={styles.subMenuItem}>Error loading recent ideas</div>
                        ) : recentIdeas.length === 0 ? (
                            <div className={styles.subMenuItem}>No recent ideas</div>
                        ) : (
                            recentIdeas.map(idea => (
                                <Link
                                    key={idea._id}
                                    to={`/ideas/${idea._id}`}
                                    className={styles.subMenuItem}
                                >
                                    <span className={styles.icon}>💡</span>
                                    {idea.title} 
                                </Link>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Categories Section */}
            <div className={styles.categoriesSection}>
                {Object.entries(CATEGORIES).map(([mainCategory, subCategories]) => (
                    <div key={mainCategory} className={styles.categorySection}>
                        <NavLink 
                            to={`/categories/${formatCategoryPath(mainCategory)}`}
                            className={({ isActive }) => `${styles.categoryHeader} ${isActive ? styles.active : ''}`}
                            onClick={(e) => {
                                e.preventDefault(); // Prevent navigation
                                toggleCategory(mainCategory);
                            }}
                        >
                            <span className={styles.icon}>
                                {getCategoryIcon(mainCategory)}
                            </span>
                            {mainCategory}
                            <span className={`${styles.arrow} ${expandedCategories[mainCategory] ? styles.expanded : ''}`}>
                                ▼
                            </span>
                        </NavLink>
                        {expandedCategories[mainCategory] && (
                            <div className={styles.subMenu}>
                                {subCategories.map(subCategory => (
                                    <NavLink 
                                        key={subCategory}
                                        to={`/categories/${formatCategoryPath(mainCategory)}/${formatCategoryPath(subCategory)}`}
                                        className={({ isActive }) => `${styles.subMenuItem} ${isActive ? styles.active : ''}`}
                                    >
                                        {subCategory}
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.personalSection}>
                <h3>Personal</h3>
                {isAuthenticated && (
                    <Link 
                        to="/account-settings" 
                        className={`${styles.menuItem} ${isActive('/account-settings') ? styles.active : ''}`}
                    >
                        <span className={styles.icon}>⚙️</span>
                        Account Settings
                    </Link>
                )}
                <Link 
                    to="/terms" 
                    className={`${styles.menuItem} ${isActive('/terms') ? styles.active : ''}`}
                >
                    <span className={styles.icon}>📜</span>
                    Terms & Conditions
                </Link>
            </div>
        </div>
    );
};

// Helper function to get category icons
function getCategoryIcon(category) {
    const icons = {
        "Technology": "💻",
        "Games": "🎮",
        "Business": "💼",
        "Life": "🌱",
        "Arts & Design": "🎨",
        "Science": "🔬",
        "Health & Wellness": "❤️",
        "Other": "📦"
    };
    return icons[category] || "📦";
}

export default Sidebar;
