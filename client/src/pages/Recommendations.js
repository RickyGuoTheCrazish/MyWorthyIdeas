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
                
                const response = await fetch(
                    `http://localhost:6001/api/ideas?page=${currentPage}&limit=12&type=recommendations`, 
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch ideas');
                }

                const data = await response.json();
                
                if (Array.isArray(data.ideas)) {
                    setIdeas(data.ideas);
                    setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
                } else {
                    console.error('Invalid data format:', data);
                    throw new Error('Invalid data format received');
                }
            } catch (error) {
                console.error('Error fetching ideas:', error);
                setError('Failed to load ideas. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        window.scrollTo(0, 0);
    };

    const handleIdeaClick = (ideaId) => {
        navigate(`/ideas/${ideaId}`);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading ideas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <button onClick={() => window.location.reload()} className={styles.retryButton}>
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className={styles.recommendationsContainer}>
            <h1 className={styles.title}>Recommended Ideas</h1>
            
            {ideas.length === 0 ? (
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
                                onClick={() => handleIdeaClick(idea._id)}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={styles.pageButton}
                            >
                                Previous
                            </button>
                            <span className={styles.pageInfo}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={styles.pageButton}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Recommendations;
