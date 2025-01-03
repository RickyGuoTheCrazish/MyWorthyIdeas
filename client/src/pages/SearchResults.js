import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import IdeaCard from '../components/ideas/IdeaCard';
import styles from './SearchResults.module.css';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const searchType = searchParams.get('type') || 'title';
    const query = searchParams.get('query') || '';

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `http://localhost:6001/api/ideas/search?type=${encodeURIComponent(searchType)}&query=${encodeURIComponent(query)}`,
                    {
                        headers: {
                            'Authorization': token ? `Bearer ${token}` : ''
                        }
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch search results');
                }

                const data = await response.json();
                setResults(data.ideas || []);
            } catch (err) {
                console.error('Search error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [searchType, query]);

    if (loading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    return (
        <div className={styles.searchResults}>
            <h1 className={styles.title}>
                Search Results for: {searchType === 'id' ? `ID ${query}` : `"${query}"`}
            </h1>
            {results.length === 0 ? (
                <div className={styles.noResults}>
                    No ideas found for your search.
                </div>
            ) : (
                <div className={styles.resultsGrid}>
                    {results.map(idea => (
                        <IdeaCard
                            key={idea._id}
                            idea={idea}
                            mode="view"
                            showRating={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchResults;
