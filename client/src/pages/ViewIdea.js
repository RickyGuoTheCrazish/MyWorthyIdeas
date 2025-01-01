import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/editor/RichTextEditor';
import styles from './ViewIdea.module.css';
import { FaCoins, FaEdit, FaShoppingCart, FaLock, FaStar, FaSignInAlt } from 'react-icons/fa';
import 'react-quill/dist/quill.snow.css';

const ViewIdea = () => {
    const { ideaId } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const [idea, setIdea] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buyLoading, setBuyLoading] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingLoading, setRatingLoading] = useState(false);

    useEffect(() => {
        const fetchIdea = async () => {
            try {
                const headers = {};
                
                // Add auth header only if user is logged in
                if (isAuthenticated) {
                    const token = localStorage.getItem('token');
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }

                const response = await fetch(`http://localhost:6001/api/ideas/${ideaId}`, {
                    headers
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch idea');
                }

                const data = await response.json();
                console.log('Fetched idea:', data.idea);
                console.log('Current user:', user);
                setIdea(data.idea);
                if (data.idea.rating) {
                    setRating(data.idea.rating);
                }
            } catch (error) {
                console.error('Error fetching idea:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchIdea();
    }, [ideaId, isAuthenticated]);

    const handleBuy = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/ideas/${ideaId}` } });
            return;
        }

        try {
            setBuyLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:6001/api/ideas/${ideaId}/buy`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to purchase idea');
            }

            // Refresh idea data after purchase
            const updatedResponse = await fetch(`http://localhost:6001/api/ideas/${ideaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const { idea: updatedIdea } = await updatedResponse.json();
            setIdea(updatedIdea);
        } catch (error) {
            console.error('Error buying idea:', error);
            setError(error.message);
        } finally {
            setBuyLoading(false);
        }
    };

    const handleRating = async (newRating) => {
        if (!isAuthenticated || !isBuyer) return;

        try {
            setRatingLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:6001/api/ideas/${ideaId}/rate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating: newRating })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update rating');
            }

            const data = await response.json();
            setRating(data.rating);
            // Update the idea's creator rating in the UI
            setIdea(prev => ({
                ...prev,
                creator: {
                    ...prev.creator,
                    averageRating: data.averageRating
                }
            }));
        } catch (error) {
            console.error('Error updating rating:', error);
            setError(error.message);
        } finally {
            setRatingLoading(false);
        }
    };

    const handleEdit = () => {
        navigate(`/ideas/${ideaId}/edit`);
    };

    const handleLogin = () => {
        navigate('/login', { state: { from: `/ideas/${ideaId}` } });
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <div className={styles.error}>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')}>Go Home</button>
                </div>
            </div>
        );
    }

    if (!idea) {
        return (
            <div className={styles.notFoundContainer}>
                <div className={styles.notFound}>
                    <h2>Idea Not Found</h2>
                    <p>The idea you're looking for doesn't exist or you don't have permission to view it.</p>
                    <button onClick={() => navigate('/')}>Go Home</button>
                </div>
            </div>
        );
    }

    // Access level checks
    const isCreator = isAuthenticated && user?.userId === idea.creator._id;
    const isBuyer = isAuthenticated && idea.buyer && idea.buyer._id === user?.userId;
    const hasFullAccess = isCreator || isBuyer;
    const isIdeaSold = idea.isSold || !!idea.buyer;
    const canBuy = isAuthenticated && !isCreator && !isBuyer && user?.subscription === 'buyer' && !isIdeaSold;

    console.log('Access check:', {
        isAuthenticated,
        isCreator,
        isBuyer,
        hasFullAccess,
        canBuy,
        isIdeaSold,
        hasBuyer: !!idea.buyer,
        userSubscription: user?.subscription
    });

    const renderStars = () => {
        return (
            <div className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`${styles.star} ${
                            (hoverRating || rating) >= star ? styles.filled : ''
                        }`}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    />
                ))}
            </div>
        );
    };

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
                <div className={styles.contentArea}>
                    {hasFullAccess && (
                        <>
                            <section className={styles.contentSection}>
                                <h2>Full Content</h2>
                                <div className={styles.sectionContent}>
                                    <div 
                                        className={`${styles.richContent} ql-editor`}
                                        dangerouslySetInnerHTML={{ __html: idea.contentHtml }}
                                    />
                                </div>
                            </section>
                            {isBuyer && (
                                <section className={styles.ratingSection}>
                                    <h3>Rate this Idea</h3>
                                    {renderStars()}
                                    {ratingLoading && <span>Updating rating...</span>}
                                </section>
                            )}
                        </>
                    )}

                    {!hasFullAccess && !isIdeaSold && (
                        <div className={styles.lockedContent}>
                            <FaLock className={styles.lockIcon} />
                            <h3>Full Content Available After Purchase</h3>
                            <p>Buy this idea to access the complete content and implementation details.</p>
                        </div>
                    )}

                    {!hasFullAccess && isIdeaSold && (
                        <div className={styles.soldContent}>
                            <p className={styles.soldNotice}>
                                This idea has already been sold.
                            </p>
                        </div>
                    )}

                    <div className={styles.actionContainer}>
                        {isCreator ? (
                            <button 
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={handleEdit}
                            >
                                <FaEdit /> Edit Idea
                            </button>
                        ) : !isIdeaSold && (
                            isAuthenticated ? (
                                canBuy && (
                                    <button 
                                        className={`${styles.actionButton} ${styles.buyButton}`}
                                        onClick={handleBuy}
                                        disabled={buyLoading}
                                    >
                                        <FaShoppingCart />
                                        {buyLoading ? 'Processing...' : 'Buy Now'}
                                    </button>
                                )
                            ) : (
                                <button 
                                    className={`${styles.actionButton} ${styles.loginButton}`}
                                    onClick={() => navigate('/login')}
                                >
                                    <FaSignInAlt /> Login to Buy
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className={styles.sidebarArea}>
                    <div className={styles.previewSection}>
                        <h2>Preview</h2>
                        <div className={styles.sectionContent}>
                            <p className={styles.preview}>{idea.preview}</p>
                            {idea.thumbnailImage && (
                                <div className={styles.thumbnail}>
                                    <img src={idea.thumbnailImage} alt="Idea cover" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewIdea;
