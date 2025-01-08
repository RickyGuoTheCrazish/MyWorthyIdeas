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
    const [sortBy, setSortBy] = useState('newest');
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchIdeas = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const queryParams = new URLSearchParams({
                    page: currentPage,
                    limit: 12,
                    sortBy
                });
                
                const response = await fetch(
                    `http://localhost:6001/api/ideas?${queryParams}`, 
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch ideas');
                }

                const data = await response.json();
                setIdeas(data.ideas);
                setTotalPages(data.pagination.totalPages);
            } catch (error) {
                console.error('Error fetching ideas:', error);
                setError('Failed to load ideas. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [currentPage, sortBy]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo(0, 0);
    };

    return (
        <div className={styles.recommendationsContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>Recommended Ideas</h1>
                <div className={styles.sortDropdown}>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="newest">Newest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Highest Rated</option>
                    </select>
                </div>
            </div>
            
            {loading ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Loading ideas...</p>
                </div>
            ) : error ? (
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>{error}</p>
                    <button onClick={() => window.location.reload()} className={styles.retryButton}>
                        Try Again
                    </button>
                </div>
            ) : ideas.length === 0 ? (
                <div className={styles.noIdeas}>
                    <p>No ideas found. Check back later!</p>
                </div>
            ) : (
                <>
                    <div className={styles.ideasGrid}>
                        {ideas.map(idea => (
                            <IdeaCard
                                key={idea._id}
                                idea={idea}
                                onClick={() => navigate(`/ideas/${idea._id}`)}
                            />
                        ))}
                    </div>
                    
                    {/* Pagination */}
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
                </>
            )}
        </div>
    );
};

export default Recommendations;