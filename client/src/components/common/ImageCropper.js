import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import styles from './ImageCropper.module.css';

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    // set canvas size to match the size of the cropped image
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // As a blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }
            blob.name = 'cropped.jpg';
            const croppedImage = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
            resolve(croppedImage);
        }, 'image/jpeg');
    });
};

const ImageCropper = ({ image, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
        if (image) {
            // If image is already a string URL, use it directly
            if (typeof image === 'string') {
                setImageUrl(image);
            } else {
                // If image is a File object, create a URL
                const url = URL.createObjectURL(image);
                setImageUrl(url);
                return () => URL.revokeObjectURL(url);
            }
        }
    }, [image]);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback(async (_, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleComplete = async () => {
        try {
            if (croppedAreaPixels && imageUrl) {
                const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error('Error completing crop:', e);
        }
    };

    if (!imageUrl) return null;

    return (
        <div className={styles.cropperContainer}>
            <div className={styles.cropperContent}>
                <h3>Crop Image</h3>
                <p className={styles.hint}>Move and zoom to adjust the crop area</p>

                <div className={styles.cropArea}>
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteHandler}
                        cropShape="rect"
                        showGrid={true}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                background: '#f8f9fa'
                            },
                            cropAreaStyle: {
                                color: 'rgba(255, 255, 255, 0.5)',
                                border: '2px solid #E0C19E'
                            },
                            mediaStyle: {
                                width: 'auto',
                                height: 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%'
                            }
                        }}
                    />
                </div>

                <div className={styles.zoomControl}>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        className={styles.zoomSlider}
                    />
                </div>

                <div className={styles.controls}>
                    <button onClick={onCancel} className={styles.cancelButton}>
                        Cancel
                    </button>
                    <button onClick={handleComplete} className={styles.confirmButton}>
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
