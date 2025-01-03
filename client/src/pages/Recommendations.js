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
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchIdeas = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const token = localStorage.getItem('token');
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                };

                console.log('Fetching recommendations with headers:', headers);
                const response = await fetch(
                    `http://localhost:6001/api/ideas?page=${currentPage}&limit=12&type=recommendations`, 
                    {
                        headers,
                        credentials: 'include'
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch recommendations');
                }

                const data = await response.json();
                console.log('Received recommendations data:', data);
                
                if (Array.isArray(data.ideas)) {
                    console.log('Setting ideas:', data.ideas);
                    setIdeas(data.ideas);
                    setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
                } else {
                    console.error('Invalid data format:', data);
                    throw new Error('Invalid data format received');
                }
            } catch (err) {
                console.error('Recommendations error:', err);
                setError(err.message);
                setIdeas([]);
            } finally {
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo(0, 0);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading recommendations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
    }

    return (
        <div className={styles.recommendationsPage}>
            <h1>Recommended Ideas</h1>
            {ideas.length === 0 ? (
                <div className={styles.noIdeas}>
                    <p>No recommendations available at the moment.</p>
                    <p>Check back later for new ideas!</p>
                </div>
            ) : (
                <>
                    <div className={styles.ideaGrid}>
                        {ideas.map(idea => (
                            <IdeaCard
                                key={idea._id}
                                idea={idea}
                                mode="view"
                                showRating={true}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
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
                    )}
                </>
            )}
        </div>
    );
};

export default Recommendations;
