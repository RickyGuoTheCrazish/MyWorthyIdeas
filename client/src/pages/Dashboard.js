import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IdeaCard from '../components/ideas/IdeaCard';
import styles from './Dashboard.module.css';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('unsold');
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [userType, setUserType] = useState(null);
    const navigate = useNavigate();
    const { isLoading: authLoading, isAuthenticated } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate('/login');
        }
    }, [authLoading, isAuthenticated, navigate]);

    // Fetch user subscription type
    useEffect(() => {
        const fetchUserType = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }

                const response = await fetch('/api/users/subscription-type', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch user type');
                }

                const data = await response.json();
                setUserType(data.subscription);
            } catch (error) {
                console.error('Error fetching user type:', error);
                setError(error.message);
            }
        };

        if (isAuthenticated) {
            fetchUserType();
        }
    }, [isAuthenticated]);

    // Determine if user is seller
    const isSeller = userType === 'seller';

    useEffect(() => {
        const fetchIdeas = async () => {
            if (authLoading || !userType) return; // Wait for user type

            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }

                let endpoint;

                const tokenPayload = JSON.parse(atob(token.split('.')[1]));
                let me = tokenPayload.userId;

                if (isSeller) {
                    endpoint = activeTab === 'unsold' 
                        ? `/api/users/${me}/posted-ideas`
                        : `/api/users/${me}/sold-ideas`;
                } else {
                    // For buyers, only show bought ideas
                    endpoint = `/api/users/${me}/bought-ideas`;
                }

                const response = await fetch(`${endpoint}?page=${currentPage}&limit=12`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch ideas');
                }
                const data = await response.json();

                setIdeas(data.ideas);
                setTotalPages(data.totalPages);
            } catch (err) {
                console.error('Error fetching ideas:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [authLoading, userType, isSeller, activeTab, currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    if (loading || authLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.dashboard}>
            <div className={styles.header}>
                <h1>{isSeller ? 'Seller Dashboard' : 'Buyer Dashboard'}</h1>
                {isSeller && (
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'unsold' ? styles.active : ''}`}
                            onClick={() => setActiveTab('unsold')}
                        >
                            Unsold Ideas
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'sold' ? styles.active : ''}`}
                            onClick={() => setActiveTab('sold')}
                        >
                            Sold Ideas
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.ideasGrid}>
                {ideas && ideas.map(idea => (
                    <IdeaCard
                        key={idea._id}
                        idea={{
                            ...idea,
                            creator: idea.seller // Map seller info to creator
                        }}
                        showStatus={true}
                        showRating={true}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`${styles.pageButton} ${currentPage === page ? styles.activePage : ''}`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
