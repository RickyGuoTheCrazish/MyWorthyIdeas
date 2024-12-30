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
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    useEffect(() => {
        const fetchIdeas = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No token found');
                }

                const endpoint = activeTab === 'unsold' 
                    ? `/api/users/${user.userId}/posted-ideas`
                    : `/api/users/${user.userId}/sold-ideas`;

                const response = await fetch(`http://localhost:6001${endpoint}?page=${currentPage}&limit=12`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch ideas');
                }

                const data = await response.json();
                setIdeas(data.ideas || []);
                // Ensure at least 1 page even if no ideas
                const total = Math.max(1, data.pagination?.totalPages || 1);
                setTotalPages(total);
                setLoading(false);
            } catch (err) {
                console.error('Dashboard error:', err);
                setError(err.message);
                setLoading(false);
                if (err.message === 'No token found') {
                    logout();
                    navigate('/');
                }
            }
        };

        fetchIdeas();
    }, [activeTab, currentPage, navigate, user, logout]);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.dashboard}>
            <h1>My Ideas</h1>
            
            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'unsold' ? styles.active : ''}`}
                    onClick={() => setActiveTab('unsold')}
                >
                    Posted Ideas (Unsold)
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'sold' ? styles.active : ''}`}
                    onClick={() => setActiveTab('sold')}
                >
                    Sold Ideas (History)
                </button>
            </div>

            <div className={styles.ideaGrid}>
                {ideas.map(idea => (
                    <IdeaCard
                        key={idea._id}
                        idea={idea}
                        mode="edit"
                        showRating={activeTab === 'sold'}
                    />
                ))}
            </div>

            <div className={styles.pagination}>
                <button 
                    className={styles.pageNav} 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                >
                    ←
                </button>
                {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    // Show first page, last page, current page, and pages around current page
                    if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                    ) {
                        return (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`${styles.pageButton} ${currentPage === pageNum ? styles.active : ''}`}
                            >
                                {pageNum}
                            </button>
                        );
                    } else if (
                        pageNum === currentPage - 3 ||
                        pageNum === currentPage + 3
                    ) {
                        return <span key={pageNum} className={styles.ellipsis}>...</span>;
                    }
                    return null;
                })}
                <button 
                    className={styles.pageNav}
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                >
                    →
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
