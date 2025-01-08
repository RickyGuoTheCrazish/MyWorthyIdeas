import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/modals/AuthModal';
import PurchaseModal from '../components/modals/PurchaseModal';
import PurchaseSuccessModal from '../components/modals/PurchaseSuccessModal';
import PurchaseErrorModal from '../components/modals/PurchaseErrorModal';
import IdeaPurchaseButton from '../components/idea/IdeaPurchaseButton';
import styles from './ViewIdea.module.css';
import { FaCoins, FaEdit, FaShoppingCart, FaLock, FaStar, FaSignInAlt, FaTimes } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import 'react-quill/dist/quill.snow.css';
import 'react-quill/dist/quill.bubble.css';

const ViewIdea = () => {
    const { ideaId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, fetchFinancialData } = useAuth();
    const [idea, setIdea] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buyLoading, setBuyLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [purchaseError, setPurchaseError] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [ratingLoading, setRatingLoading] = useState(false);

    const [userInfo, setUserInfo] = useState(null);


    const fetchUserInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:6001/api/users/myinfo', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUserInfo(data);
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            fetchUserInfo();
        }
    }, []);

    useEffect(() => {
        const fetchIdea = async () => {
            try {
                const headers = {};
                const token = localStorage.getItem('token');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
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
                setIdea(data.idea);
                
                if (token && data.idea.rating) {
                    console.log('Current rating:', data.idea.rating);
                    setUserRating(data.idea.rating);
                }
            } catch (error) {
                console.error('Error fetching idea:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchIdea();
    }, [ideaId]);

    const handleBuy = async () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }

        try {
            setBuyLoading(true);
            setPurchaseError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:6001/api/ideas/${ideaId}/buy`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                setPurchaseError(errorData.message || 'Failed to purchase idea');
                return;
            }

            // Close modals and show success
            setShowPurchaseModal(false);
            setShowSuccessModal(true);

            // Fetch updated idea data
            const updatedResponse = await fetch(`http://localhost:6001/api/ideas/${ideaId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const { idea: updatedIdea } = await updatedResponse.json();
            setIdea(updatedIdea);

            // Update financial data
            await fetchFinancialData();
        } catch (error) {
            console.error('Error buying idea:', error);
            setPurchaseError(error.message || 'An unexpected error occurred');
        } finally {
            setBuyLoading(false);
        }
    };

    const handleRating = async (newRating) => {
        if (!isAuthenticated || !isBuyer) return;

        // Don't allow rating if user has already rated
        if (userRating > 0) {
            toast.error('You have already rated this idea');
            return;
        }

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
            setUserRating(newRating);
            setShowRatingModal(false);

            // Update the idea state while preserving all existing data
            setIdea(prev => ({
                ...prev,
                rating: data.rating || newRating,
                creator: {
                    ...prev.creator,
                    averageRating: data.averageRating || prev.creator.averageRating
                }
            }));

            toast.success('Rating submitted successfully!');
        } catch (error) {
            console.error('Error updating rating:', error);
            toast.error(error.message || 'Failed to update rating');
        } finally {
            setRatingLoading(false);
        }
    };

    const handleEdit = () => {
        navigate(`/ideas/${ideaId}/edit`);
    };

    const handleLogin = () => {
        setShowAuthModal(true);
    };

    const handleBuyClick = () => {
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }
        setShowPurchaseModal(true);
    };

    const handleCloseAuthModal = () => {
        setShowAuthModal(false);
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        window.location.reload(); // Refresh to show full content
    };

    const formatId = (id) => {
        return '#' + id.toString().slice(-6).toUpperCase();
    };

    const renderStars = () => {
        return (
            <div className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`${styles.star} ${(hoverRating || userRating) >= star ? styles.filled : ''}`}
                        onClick={() => handleRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    />
                ))}
            </div>
        );
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
    // const isCreator = isAuthenticated && user?.userId === idea.creator._id;
    // const isBuyer = isAuthenticated && idea.buyer && idea.buyer._id === user?.userId;
    // const hasFullAccess = isCreator || isBuyer;
    // const isIdeaSold = idea.isSold || !!idea.buyer;
    // const canBuy = isAuthenticated && !isCreator && !isBuyer && user?.subscription === 'buyer' && !isIdeaSold;

    const isCreator = isAuthenticated && userInfo && idea?.creator._id === userInfo._id;
    const isBuyer = isAuthenticated && userInfo && idea?.buyer && idea.buyer._id === userInfo._id;
    const hasFullAccess = isCreator || isBuyer;
    const isIdeaSold = idea?.isSold || !!idea?.buyer;
    const canBuy = isAuthenticated && !isCreator && !isBuyer && userInfo?.subscription === 'buyer' && !isIdeaSold;

    console.log('Access check:', {
        isAuthenticated,
        isCreator,
        isBuyer,
        hasFullAccess,
        canBuy,
        isIdeaSold,
        hasBuyer: !!idea.buyer,
        userSubscription: userInfo?.subscription
    });

    return (
        <div className={styles.container}>
            <Toaster position="top-right" />
            {showAuthModal && (
                <AuthModal
                    isOpen={showAuthModal}
                    mode="login"
                    onClose={() => setShowAuthModal(false)}
                />
            )}

            {showPurchaseModal && (
                <PurchaseModal
                    idea={idea}
                    userCredits={userInfo?.credits || 0}
                    onClose={() => setShowPurchaseModal(false)}
                    onConfirm={handleBuy}
                />
            )}
            {purchaseError && (
                <PurchaseErrorModal
                    error={purchaseError}
                    onClose={() => setPurchaseError(null)}
                />
            )}
            {/* Rating Modal */}
            {showRatingModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ratingModal}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setShowRatingModal(false)}
                        >
                            <FaTimes />
                        </button>
                        <h2>Rate This Idea</h2>
                        <p>How would you rate {idea.title}?</p>
                        {renderStars()}
                        {ratingLoading && <p>Updating rating...</p>}
                    </div>
                </div>
            )}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1 className={styles.title}>{idea.title}</h1>
                </div>
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
                            <span className={styles.categories}>
                                {idea.categories.map((cat, index) => (
                                    <span key={index} className={styles.category}>
                                        {cat.main} › {cat.sub}
                                        {index < idea.categories.length - 1 && ", "}
                                    </span>
                                ))}
                            </span>
                            <span className={styles.separator}>•</span>
                            <span className={styles.idTag}><span>ID:</span>{formatId(idea._id)}</span>
                        </div>
                    </div>
                    <div className={styles.price}>
                        <FaCoins className={styles.priceIcon} />
                        {idea.priceAUD.toFixed(2)} AUD
                    </div>
                </div>
            </div>

            <div className={styles.mainContent}>
                <div className={styles.contentArea}>
                    {isCreator || (idea.isSold && isBuyer) ? (
                        <div
                            className="ql-editor"
                            dangerouslySetInnerHTML={{ __html: idea.contentHtml }}
                        />
                    ) : (
                        <div className={styles.ideaContent}>
                            {idea.preview}

                            {!hasFullAccess && (
                                <div className={styles.purchaseSection}>
                                    <div className={styles.previewOverlay}>
                                        <div className={styles.lockIconContainer}>
                                            <FaLock className={styles.lockIcon} />
                                        </div>
                                    </div>
                                    <div className={styles.purchasePrompt}>
                                        <div className={styles.purchasePromptContent}>
                                            <FaLock className={styles.purchaseIcon} />
                                            <h3>Unlock Full Content</h3>
                                            <p className={styles.purchaseDescription}>
                                                Get instant access to the complete idea details, implementation guide, and business insights
                                            </p>
                                            <div className={styles.purchasePrice}>
                                                <FaCoins className={styles.coinIcon} />
                                                <span className={styles.priceAmount}>${idea.priceAUD.toFixed(2)} AUD</span>
                                            </div>
                                            {!isAuthenticated ? (
                                                <button className={styles.purchaseButton} onClick={handleLogin}>
                                                    <FaSignInAlt className={styles.buttonIcon} />
                                                    Sign in to Purchase
                                                </button>
                                            ) : (
                                                <IdeaPurchaseButton idea={idea} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(hasFullAccess) && (
                                <div className={styles.fullContent}>
                                    <div
                                        className="ql-editor"
                                        dangerouslySetInnerHTML={{ __html: idea.contentHtml }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
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
                            {isBuyer && (
                                <div className={styles.ratingSection}>
                                    {userRating > 0 ? (
                                        <div className={styles.currentRating}>
                                            <p>Your Rating:</p>
                                            <div className={styles.stars}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <FaStar
                                                        key={star}
                                                        className={`${styles.star} ${userRating >= star ? styles.filled : ''}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowRatingModal(true)}
                                            className={`${styles.rateButton} bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center space-x-2`}
                                        >
                                            <FaStar className="w-4 h-4" />
                                            <span>Rate This Idea</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {isIdeaSold && (
                        <div className={styles.soldSection}>
                            <p className={styles.soldNotice}>
                                This idea has already been sold.
                            </p>
                        </div>
                    )}
                    {isCreator && !isIdeaSold && (
                        <div className={styles.editSection}>
                            <button
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={handleEdit}
                            >
                                <FaEdit /> Edit Idea
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.actionContainer}>
                {!isCreator && !isIdeaSold && (
                    isAuthenticated ? (
                        canBuy && (
                            <button
                                className={`${styles.actionButton} ${styles.buyButton}`}
                                onClick={handleBuyClick}
                                disabled={buyLoading}
                            >
                                <FaShoppingCart />
                                {buyLoading ? 'Processing...' : 'Buy Now'}
                            </button>
                        )
                    ) : (
                        <button
                            className={`${styles.actionButton} ${styles.loginButton}`}
                            onClick={handleLogin}
                        >
                            <FaSignInAlt /> Login to Buy
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default ViewIdea;
