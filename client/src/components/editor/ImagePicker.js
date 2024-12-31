import React, { useState, useEffect } from 'react';
import styles from './ImagePicker.module.css';

const ImagePicker = ({ images, onSelect, onClose }) => {
    const [imageUrls, setImageUrls] = useState([]);

    useEffect(() => {
        const loadImages = async () => {
            const urls = await Promise.all(
                images.map(async (file) => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                url: reader.result,
                                originalFile: file
                            });
                        };
                        reader.readAsDataURL(file);
                    });
                })
            );
            setImageUrls(urls);
        };

        if (images && images.length > 0) {
            loadImages();
        }
    }, [images]);

    if (!images || images.length === 0) {
        return (
            <div className={styles.imagePickerOverlay}>
                <div className={styles.imagePickerContent}>
                    <div className={styles.header}>
                        <h3>Choose an Image</h3>
                        <button onClick={onClose} className={styles.closeButton}>×</button>
                    </div>
                    <p className={styles.noImages}>No images available. Please upload images in Step 3 first.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.imagePickerOverlay}>
            <div className={styles.imagePickerContent}>
                <div className={styles.header}>
                    <h3>Choose an Image</h3>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div>
                <div className={styles.imageGrid}>
                    {imageUrls.map((imageData, index) => (
                        <div 
                            key={index} 
                            className={styles.imageItem}
                            onClick={() => {
                                console.log('Selecting image:', imageData.originalFile.name);
                                onSelect(imageData);
                            }}
                        >
                            <img 
                                src={imageData.url} 
                                alt={`Upload ${index + 1}`}
                                className={styles.thumbnail}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ImagePicker;
