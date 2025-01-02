import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import IdeaCard from '../components/ideas/IdeaCard';
import styles from './CategoryPage.module.css';

const CategoryPage = () => {
    const { category, subcategory } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [ideas, setIdeas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');

    const formatCategoryName = (name) => {
        // Split by hyphens and capitalize each word
        return name.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/ And /g, ' & '); // Replace "and" with "&" if needed
    };

    useEffect(() => {
        const fetchIdeas = async () => {
            try {
                setLoading(true);
                const formattedCategory = formatCategoryName(category);
                const formattedSubcategory = subcategory ? formatCategoryName(subcategory) : null;
                
                const queryParams = new URLSearchParams({
                    category: formattedCategory,
                    ...(formattedSubcategory && { subcategory: formattedSubcategory }),
                    page: currentPage,
                    limit: 12,
                    sortBy
                });

                const url = `http://localhost:6001/api/ideas/by-category?${queryParams}`;
                const response = await fetch(url, {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server responded with ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                setIdeas(data.ideas || []);
                setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
                setError(null);
            } catch (err) {
                setError(err.message);
                setIdeas([]);
            } finally {
                setLoading(false);
            }
        };

        fetchIdeas();
    }, [category, subcategory, currentPage, sortBy]);

    return (
        <div className={styles.categoryPage}>
            <div className={styles.header}>
                <h1>{formatCategoryName(category)}{subcategory ? ` > ${formatCategoryName(subcategory)}` : ''}</h1>
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
                    <div className={styles.loader}></div>
                </div>
            ) : error ? (
                <div className={styles.emptyState}>
                    <img 
                        src="/images/empty-ideas.svg" 
                        alt="No ideas found" 
                        className={styles.emptyStateImage}
                    />
                    <h2>No Ideas Found</h2>
                    <p>There are currently no ideas in this category.</p>
                    <p>Check back later for new ideas!</p>
                </div>
            ) : (
                <>
                    <div className={styles.ideasGrid}>
                        {ideas.map((idea) => (
                            <IdeaCard key={idea._id} idea={idea} />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={styles.pageButton}
                            >
                                Previous
                            </button>
                            <span className={styles.pageInfo}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

export default CategoryPage;
