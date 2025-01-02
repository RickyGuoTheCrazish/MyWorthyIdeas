import React, { useState, useEffect } from 'react';
import styles from './ImagePicker.module.css';

const ImagePicker = ({ images, onSelect, onClose }) => {
    const [imageDataList, setImageDataList] = useState([]);

    useEffect(() => {
        const processImages = async () => {
            const processedImages = await Promise.all(images.map(async (image, index) => {
                if (image instanceof File) {
                    return {
                        originalFile: image,
                        url: URL.createObjectURL(image),
                        number: index + 1
                    };
                } else if (typeof image === 'string') {
                    try {
                        const response = await fetch(image);
                        const blob = await response.blob();
                        const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' });
                        return {
                            originalFile: file,
                            url: image,
                            number: index + 1
                        };
                    } catch (error) {
                        console.error('Error loading image:', error);
                        return null;
                    }
                }
                return null;
            }));

            const validImages = processedImages.filter(img => img !== null);
            setImageDataList(validImages);
        };

        if (images && images.length > 0) {
            processImages();
        }
    }, [images]);

    const handleImageSelect = (imageData) => {
        if (imageData.originalFile instanceof File) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onSelect({
                    url: reader.result,
                    originalFile: imageData.originalFile,
                    number: imageData.number
                });
            };
            reader.readAsDataURL(imageData.originalFile);
        }
    };

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
                    {imageDataList.map((imageData, index) => (
                        <div
                            key={index}
                            className={styles.imageItem}
                            onClick={() => handleImageSelect(imageData)}
                        >
                            <img 
                                src={imageData.url} 
                                alt={`Upload ${imageData.number}`}
                                className={styles.thumbnail}
                            />
                            <div className={styles.imageNumber}>{imageData.number}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ImagePicker;
