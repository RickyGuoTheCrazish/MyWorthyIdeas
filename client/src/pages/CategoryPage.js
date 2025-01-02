import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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

    // Get sort preference from URL or default to 'newest'
    const sortBy = searchParams.get('sortBy') || 'newest';

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

    const handleSortChange = (newSortBy) => {
        setSearchParams({ sortBy: newSortBy });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.categoryPage}>
            <div className={styles.header}>
                <h1>
                    {subcategory ? `${formatCategoryName(category)} - ${formatCategoryName(subcategory)}` : formatCategoryName(category)}
                </h1>
                <div className={styles.sortControls}>
                    <select 
                        value={sortBy} 
                        onChange={(e) => handleSortChange(e.target.value)}
                        className={styles.sortSelect}
                    >
                        <option value="newest">Newest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Highest Rated</option>
                    </select>
                </div>
            </div>

            <div className={styles.ideaGrid}>
                {ideas.length > 0 ? (
                    ideas.map(idea => (
                        <IdeaCard
                            key={idea._id}
                            idea={idea}
                            mode="view"
                            showRating={true}
                        />
                    ))
                ) : (
                    <div className={styles.noIdeas}>
                        No ideas found in this category.
                    </div>
                )}
            </div>

            {ideas.length > 0 && (
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
        </div>
    );
};

export default CategoryPage;
