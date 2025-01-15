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
                    `https://myworthyideas-257fec0e7d06.herokuapp.com/api/ideas?${queryParams}`, 
                    {
                        headers: {
                            'Accept': 'application/json',
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
                </div>
            ) : error ? (
                <div className={styles.noIdeas}>
                    <img 
                        src="/images/empty-ideas.svg" 
                        alt="No ideas found" 
                        className={styles.emptyStateImage}
                    />
                    <h2>No Ideas Found</h2>
                    <p>There was an error loading ideas.</p>
                    <p>Please try again later.</p>
                </div>
            ) : ideas.length === 0 ? (
                <div className={styles.noIdeas}>
                    <img 
                        src="/images/empty-ideas.svg" 
                        alt="No ideas found" 
                        className={styles.emptyStateImage}
                    />
                    <h2>No Ideas Found</h2>
                    <p>Check back later for new ideas!</p>
                </div>
            ) : (
                <>
                    <div className={styles.ideasGrid}>
                        {ideas.map(idea => (
                            <IdeaCard key={idea._id} idea={idea} />
                        ))}
                    </div>
                    
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