import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IdeaCard from '../components/ideas/IdeaCard';
import styles from './Recommendations.module.css';

const Recommendations = () => {
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const fetchIdeas = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token 
                    ? { 'Authorization': `Bearer ${token}` }
                    : {};

                const response = await fetch(`http://localhost:6001/api/ideas?page=${currentPage}&limit=12`, {
                    headers,
                    credentials: 'include' // This will send cookies if they exist
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
                console.error('Recommendations error:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.recommendationsPage}>
            <h1>Recommended Ideas</h1>
            <div className={styles.ideaGrid}>
                {ideas.map(idea => (
                    <IdeaCard
                        key={idea._id}
                        idea={idea}
                        mode="view"
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

export default Recommendations;
