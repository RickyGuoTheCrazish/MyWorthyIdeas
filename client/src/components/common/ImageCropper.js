import React, { useState, useCallback } from 'react';
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
    const image = await createImage(URL.createObjectURL(imageSrc));
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
            if (croppedAreaPixels) {
                const croppedImage = await getCroppedImg(image, croppedAreaPixels);
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={styles.cropperContainer}>
            <div className={styles.cropperContent}>
                <h3>Crop Image</h3>
                <p className={styles.hint}>Move and zoom to adjust the crop area</p>

                <div className={styles.cropArea}>
                    <Cropper
                        image={URL.createObjectURL(image)}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteHandler}
                        cropShape="rect"
                        showGrid={true}
                        cropSize={{ width: 200, height: 200 }}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '400px',
                                background: '#ffffff'
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

                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onCancel}>
                        Cancel
                    </button>
                    <button className={styles.confirmBtn} onClick={handleComplete}>
                        Confirm Crop
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
