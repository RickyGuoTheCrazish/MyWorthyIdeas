import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/editor/RichTextEditor';
import styles from './ViewIdea.module.css';
import { FaCoins } from 'react-icons/fa';
import 'react-quill/dist/quill.snow.css';

const ViewIdea = () => {
    const { ideaId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [idea, setIdea] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log('ViewIdea - Component State:', { 
        isAuthenticated, 
        isLoading, 
        user, 
        ideaId 
    });

    useEffect(() => {
        // Wait for auth to be checked
        if (isLoading) {
            return;
        }

        // Redirect if not authenticated
        if (!isAuthenticated) {
            console.log('ViewIdea - Not authenticated, redirecting');
            navigate('/');
            return;
        }

        const fetchIdea = async () => {
            try {
                const token = localStorage.getItem('token');
                console.log('ViewIdea - Fetching with token:', token);

                const response = await fetch(`http://localhost:6001/api/ideas/${ideaId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch idea');
                }

                const data = await response.json();
                console.log('ViewIdea - Fetched data:', data);
                setIdea(data.idea);
                setLoading(false);
            } catch (error) {
                console.error('ViewIdea - Error:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchIdea();
    }, [ideaId, isAuthenticated, isLoading, navigate]);

    // Show loading while checking auth
    if (isLoading) {
        return <div className={styles.loading}>Checking authentication...</div>;
    }

    // Show loading while fetching idea
    if (loading) {
        return <div className={styles.loading}>Loading idea...</div>;
    }

    if (error) {
        return <div className={styles.error}>Error: {error}</div>;
    }

    if (!idea) {
        return <div className={styles.notFound}>Idea not found</div>;
    }

    const showContent = idea.creator._id === localStorage.getItem('userId') || idea.isSold;
    const isCreator = idea.creator._id === localStorage.getItem('userId');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>{idea.title}</h1>
                <div className={styles.meta}>
                    <div className={styles.leftMeta}>
                        <div className={styles.creator}>
                            By: {idea.creator.username}
                            {idea.creator.averageRating > 0 && (
                                <span className={styles.rating}>
                                    ★ {idea.creator.averageRating.toFixed(1)}
                                </span>
                            )}
                            <span className={styles.separator}>•</span>
                            <span className={styles.category}>
                                {idea.category.main} › {idea.category.sub}
                            </span>
                        </div>
                    </div>
                    <div className={styles.price}>
                        <FaCoins className={styles.priceIcon} />
                        {idea.price.toFixed(2)}
                    </div>
                </div>
            </header>

            <div className={styles.mainContent}>
                {showContent ? (
                    <>
                        <section className={styles.contentSection}>
                            <h2>Content</h2>
                            <div className={styles.sectionContent}>
                                <div 
                                    className={`${styles.richContent} ql-editor`}
                                    dangerouslySetInnerHTML={{ __html: idea.contentHtml }}
                                />
                            </div>
                        </section>

                        <aside className={styles.sidebar}>
                            <section className={styles.previewSection}>
                                <h2>Preview & Cover</h2>
                                <div className={styles.sectionContent}>
                                    <p className={styles.preview}>{idea.preview}</p>
                                    {idea.thumbnailImage && (
                                        <div className={styles.thumbnail}>
                                            <img src={idea.thumbnailImage} alt="Idea cover" />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </aside>
                    </>
                ) : (
                    <>
                        <section className={styles.section}>
                            <h2>Preview</h2>
                            <div className={styles.sectionContent}>
                                <p>{idea.preview}</p>
                            </div>
                        </section>

                        {idea.thumbnailImage && (
                            <section className={styles.section}>
                                <h2>Cover Image</h2>
                                <div className={styles.sectionContent}>
                                    <div className={styles.thumbnail}>
                                        <img src={idea.thumbnailImage} alt="Idea cover" />
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className={styles.buyButton}>
                            Buy Now
                        </div>
                    </>
                )}
            </div>

            {isCreator && (
                <div className={styles.editButton}>
                    Edit
                </div>
            )}
        </div>
    );
};

export default ViewIdea;
