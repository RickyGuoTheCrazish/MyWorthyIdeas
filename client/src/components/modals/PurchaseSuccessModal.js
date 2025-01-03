import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PurchaseSuccessModal.module.css';
import { FaCheckCircle, FaTimes, FaStar } from 'react-icons/fa';
import confetti from 'canvas-confetti';

const PurchaseSuccessModal = ({ idea, onClose }) => {
    const navigate = useNavigate();

    React.useEffect(() => {
        // Trigger confetti animation
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }, []);

    const handleContinue = () => {
        onClose();
        navigate(`/ideas/${idea._id}`);
        // Refresh the page to show the full idea content
        // window.location.reload();
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>
                
                <div className={styles.content}>
                    <div className={styles.icon}>
                        <FaCheckCircle />
                    </div>
                    
                    <h2>Congratulations!</h2>
                    <p className={styles.message}>
                        You are now the owner of
                    </p>
                    <h3 className={styles.ideaTitle}>{idea.title}</h3>
                    
                    {idea.thumbnailImage && (
                        <img 
                            src={idea.thumbnailImage} 
                            alt={idea.title}
                            className={styles.ideaImage}
                        />
                    )}

                    <div className={styles.infoBox}>
                        <p>You now have:</p>
                        <ul>
                            <li>Full access to the idea content</li>
                            <li>Complete intellectual property rights</li>
                            <li>Freedom to use and modify the idea</li>
                        </ul>
                    </div>

                    <div className={styles.ratingPrompt}>
                        <FaStar className={styles.starIcon} />
                        <p>Don't forget to rate this idea!</p>
                    </div>

                    <button className={styles.closeBtn} onClick={handleContinue}>
                        View My Idea
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseSuccessModal;
