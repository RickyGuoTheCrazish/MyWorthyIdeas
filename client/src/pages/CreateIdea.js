import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionExpiredModal from '../components/modals/SessionExpiredModal';
import styles from './CreateIdea.module.css';
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaCoins } from 'react-icons/fa';
import { VALID_MAIN_CATEGORIES, SUBCATS_BY_MAIN } from '../utils/categories';
import ImageCropper from '../components/common/ImageCropper';
import RichTextEditor from '../components/editor/RichTextEditor';
import ImagePicker from '../components/editor/ImagePicker';

const CreateIdea = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isTokenExpiredState, clearSession } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [showSessionExpired, setShowSessionExpired] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        brief: '',
        price: '',
        content: '',
        images: [],
        contentImages: []
    });
    const [thumbnailImage, setThumbnailImage] = useState(null);
    const [categories, setCategories] = useState([]);
    const [currentCategory, setCurrentCategory] = useState({ main: '', sub: '' });
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [imageToProcess, setImageToProcess] = useState(null);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [imageMapping, setImageMapping] = useState(new Map());
    const quillRef = useRef(null);
    const [lastTokenCheck, setLastTokenCheck] = useState(Date.now());

    // Check authentication at component mount
    useEffect(() => {
        if (!isAuthenticated || isTokenExpiredState) {
            setShowSessionExpired(true);
        }
    }, [isAuthenticated, isTokenExpiredState]);

    // Periodic token check (every 5 minutes)
    useEffect(() => {
        const checkToken = () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setShowSessionExpired(true);
                return;
            }

            try {
                const decodedToken = JSON.parse(atob(token.split('.')[1]));
                if (decodedToken.exp * 1000 < Date.now()) {
                    setShowSessionExpired(true);
                }
            } catch (error) {
                console.error('Token validation error:', error);
                setShowSessionExpired(true);
            }
        };

        const interval = setInterval(() => {
            checkToken();
        }, 300000); // Check every 5 minutes

        return () => clearInterval(interval);
    }, []);

    // Check token before any important action
    const validateToken = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setShowSessionExpired(true);
            return false;
        }

        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            if (decodedToken.exp * 1000 < Date.now()) {
                setShowSessionExpired(true);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            setShowSessionExpired(true);
            return false;
        }
    };

    const handleInputChange = (field, value) => {
        if (!validateToken()) return;
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleEditorChange = (content) => {
        if (!validateToken()) return;
        setEditorContent(content);
    };

    const handleAddCategory = () => {
        if (!validateToken()) return;
        if (categories.length >= 3) {
            alert('Maximum 3 categories allowed');
            return;
        }
        setCurrentCategory({ main: VALID_MAIN_CATEGORIES[0], sub: SUBCATS_BY_MAIN[VALID_MAIN_CATEGORIES[0]][0] });
        setShowCategoryModal(true);
    };

    const handleMainCategoryChange = (mainCat) => {
        if (!validateToken()) return;
        setCurrentCategory({
            main: mainCat,
            sub: SUBCATS_BY_MAIN[mainCat][0]
        });
    };

    const handleSubCategoryChange = (subCat) => {
        if (!validateToken()) return;
        setCurrentCategory(prev => ({
            ...prev,
            sub: subCat
        }));
    };

    const handleCategorySubmit = () => {
        if (!validateToken()) return;
        if (currentCategory.main && currentCategory.sub) {
            if (categories.some(cat => 
                cat.main === currentCategory.main && cat.sub === currentCategory.sub
            )) {
                alert('This category combination already exists');
                return;
            }
            setCategories([...categories, currentCategory]);
            setShowCategoryModal(false);
        }
    };

    const removeCategory = (index) => {
        if (!validateToken()) return;
        setCategories(categories.filter((_, i) => i !== index));
    };

    const handleThumbnailUpload = (e) => {
        if (!validateToken()) return;
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('Image size must be less than 10MB');
                return;
            }
            setImageToProcess(file);
            setShowCropper(true);
        }
    };

    const handleCropComplete = (croppedImage) => {
        if (!validateToken()) return;
        setThumbnailImage(croppedImage);
        setShowCropper(false);
        setImageToProcess(null);
    };

    const handleCropCancel = () => {
        if (!validateToken()) return;
        setShowCropper(false);
        setImageToProcess(null);
    };

    const handleImageUpload = async (e) => {
        if (!validateToken()) return;
        const files = Array.from(e.target.files);
        if (files.length + formData.images.length > 10) {
            alert('Maximum 10 images allowed');
            return;
        }
        
        const validFiles = files.filter(file => file.size <= 40 * 1024 * 1024); // 40MB limit
        if (validFiles.length !== files.length) {
            alert('Some images were skipped as they exceed 40MB limit');
        }

        // Check for duplicates
        const newImages = [];
        const existingBuffers = await Promise.all(
            formData.images.map(file => file.arrayBuffer())
        );

        for (const file of validFiles) {
            const newBuffer = await file.arrayBuffer();
            const newArray = new Uint8Array(newBuffer);

            const isDuplicate = existingBuffers.some(buffer => {
                const existing = new Uint8Array(buffer);
                if (existing.length !== newArray.length) return false;
                return existing.every((byte, i) => byte === newArray[i]);
            });

            if (isDuplicate) {
                alert(`Image "${file.name}" has already been uploaded. Skipping duplicate.`);
                continue;
            }

            newImages.push(file);
            existingBuffers.push(newBuffer);
        }

        if (newImages.length === 0) return;

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...newImages]
        }));
    };

    const handleRemoveImage = (index) => {
        if (!validateToken()) return;
        const imageToRemove = formData.images[index];
        
        // Remove from formData
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));

        // Find and remove the image from editor
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const delta = quill.getContents();
            
            // Create a new delta without the removed image
            const newDelta = {
                ops: delta.ops.reduce((acc, op) => {
                    // If this op is not the image we're removing, keep it
                    if (!op.insert?.image || !imageMapping.has(op.insert.image)) {
                        acc.push(op);
                    } else {
                        // Check if this is the image we want to remove
                        const mappedFile = imageMapping.get(op.insert.image);
                        if (mappedFile !== imageToRemove) {
                            acc.push(op);
                        }
                    }
                    return acc;
                }, [])
            };

            // Update editor content
            quill.setContents(newDelta);
            setEditorContent(quill.root.innerHTML);
        }

        // Clean up any URLs created for this image
        for (const [url, file] of imageMapping.entries()) {
            if (file === imageToRemove) {
                URL.revokeObjectURL(url);
                imageMapping.delete(url);
            }
        }
    };

    const handleSelectImageFromPicker = (imageData) => {
        if (!validateToken()) return;
        // Store the mapping of base64 URL to file
        setImageMapping(prev => {
            const newMap = new Map(prev);
            newMap.set(imageData.url, imageData.originalFile);
            return newMap;
        });

        // Insert image without number tag
        handleInsertImageIntoEditor(imageData.url);
        setShowImagePicker(false);
    };

    const handleInsertImageIntoEditor = (base64Url) => {
        if (!validateToken()) return;
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            
            // Insert a line break before if not at the start
            if (range.index > 0) {
                quill.insertText(range.index, '\n');
            }
            
            // Insert the image
            quill.insertEmbed(range.index, 'image', base64Url);
            
            // Insert a line break after
            quill.insertText(range.index + 1, '\n');
            
            // Move cursor after the image
            quill.setSelection(range.index + 2);
        }
    };

    const handleSubmit = async () => {
        if (!validateToken()) {
            setShowSessionExpired(true);
            return;
        }

        try {
            // Validate required fields
            if (!formData.title || !formData.brief || !formData.price || categories.length === 0) {
                alert('Please fill in all required fields (title, brief, price) and select at least one category');
                return;
            }

            // First, create the idea with basic info
            const basicData = {
                title: formData.title,
                preview: formData.brief,
                price: formData.price,
                categories: categories  // Now sending all categories
            };

            console.log('Sending data to create idea:', basicData); // Debug log

            const createResponse = await fetch('http://localhost:6001/api/ideas/create', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(basicData)
            });

            const responseData = await createResponse.json();

            if (!createResponse.ok) {
                throw new Error(responseData.message || 'Failed to create idea');
            }

            const { idea } = responseData;

            let contentToSave = editorContent;
            let contentImages = [];

            // First upload all images if any exist
            if (formData.images.length > 0) {
                console.log('Uploading content images...'); // Debug log
                const contentImagesFormData = new FormData();
                formData.images.forEach(file => {
                    contentImagesFormData.append('images', file);
                });

                const imagesResponse = await fetch(`http://localhost:6001/api/ideas/${idea._id}/content-images`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {},
                    body: contentImagesFormData
                });

                if (!imagesResponse.ok) {
                    console.error('Failed to upload content images');
                } else {
                    // Get the S3 URLs from response
                    const { idea: { contentImages: uploadedImages } } = await imagesResponse.json();
                    contentImages = uploadedImages;
                    
                    console.log('Replacing base64 URLs with S3 URLs...'); // Debug log
                    // Create a mapping of files to their S3 URLs
                    const fileToS3Map = new Map();
                    formData.images.forEach((file, index) => {
                        const s3Url = uploadedImages[uploadedImages.length - formData.images.length + index];
                        fileToS3Map.set(file, s3Url);
                    });

                    // Replace base64 images with S3 URLs in content
                    for (const [base64Url, fileData] of imageMapping.entries()) {
                        const s3Url = fileToS3Map.get(fileData);
                        if (s3Url) {
                            console.log(`Replacing ${base64Url.substring(0, 50)}... with ${s3Url}`); // Debug log
                            contentToSave = contentToSave.replace(base64Url, s3Url);
                        }
                    }
                }
            }

            // Then upload thumbnail if exists
            if (thumbnailImage) {
                const thumbnailFormData = new FormData();
                thumbnailFormData.append('cover', thumbnailImage);

                const thumbnailResponse = await fetch(`http://localhost:6001/api/ideas/${idea._id}/cover`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {},
                    body: thumbnailFormData
                });

                if (!thumbnailResponse.ok) {
                    console.error('Failed to upload cover image');
                }
            }

            // Finally save the content with replaced URLs
            console.log('Content to save:', contentToSave.substring(0, 100)); // Debug log
            const updateResponse = await fetch(`http://localhost:6001/api/ideas/${idea._id}/content`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contentHtml: contentToSave,
                    contentRaw: quillRef.current?.getEditor().getContents() || {}
                })
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                console.error('Failed to update content:', errorData);
                throw new Error(errorData.message || 'Failed to update content');
            }

            // Navigate to the new idea
            navigate(`/ideas/${idea._id}`);
        } catch (error) {
            console.error('Error creating idea:', error);
            // Handle error (show message to user, etc.)
        }
    };

    const handleConfirm = () => {
        if (!validateToken()) {
            setShowSessionExpired(true);
            return;
        }
        if (currentStep === 3) {
            handleSubmit();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleCancel = () => {
        if (!validateToken()) {
            setShowSessionExpired(true);
            return;
        }
        const confirmCancel = window.confirm('Are you sure you want to cancel? Your idea will not be saved.');
        if (confirmCancel) {
            navigate('/recommendations');
        }
    };

    return (
        <div className={styles.createIdea}>
            {showSessionExpired && <SessionExpiredModal />}
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.stepsContainer}>
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`${styles.stepItem} ${
                                    currentStep === step ? styles.activeStep :
                                    currentStep > step ? styles.completedStep : ''
                                }`}
                            >
                                Step {step}
                            </div>
                        ))}
                    </div>
                    <h1 className={styles.title}>
                        {currentStep === 1 && 'Basic Information'}
                        {currentStep === 2 && 'Upload Thumbnail'}
                        {currentStep === 3 && 'Create Content'}
                    </h1>
                </div>

                <div className={styles.stepContent}>
                    {currentStep === 1 && (
                        <div className={styles.step1}>
                            <div className={styles.inputGroup}>
                                <label>Idea Title:</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    maxLength={30}
                                    placeholder="Idea Title here"
                                />
                                <span className={styles.charCount}>{formData.title.length}/30</span>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Idea Brief:</label>
                                <textarea
                                    name="brief"
                                    value={formData.brief}
                                    onChange={(e) => handleInputChange('brief', e.target.value)}
                                    maxLength={300}
                                    placeholder="Idea Brief"
                                />
                                <span className={styles.charCount}>{formData.brief.length}/300</span>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="price" className={styles.label}>
                                    Price (AUD)
                                    <span className={styles.required}>*</span>
                                </label>
                                <div className={styles.priceInputWrapper}>
                                    <span className={styles.currencySymbol}>$</span>
                                    <input
                                        type="number"
                                        id="price"
                                        name="price"
                                        min="0"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => handleInputChange('price', e.target.value)}
                                        className={styles.priceInput}
                                        required
                                    />
                                    <span className={styles.currencyCode}>AUD</span>
                                </div>
                                <p className={styles.helperText}>
                                    Set your idea's price in Australian Dollars. Platform fee: 3%
                                </p>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Category:</label>
                                <div className={styles.categoriesList}>
                                    {categories.map((cat, index) => (
                                        <div key={index} className={styles.categoryTag}>
                                            <span>{cat.main} - {cat.sub}</span>
                                            <button onClick={() => removeCategory(index)}>&times;</button>
                                        </div>
                                    ))}
                                    {categories.length < 3 && (
                                        <button className={styles.addCategoryBtn} onClick={handleAddCategory}>
                                            +
                                        </button>
                                    )}
                                </div>
                                <span className={styles.categoryCount}>{categories.length}/3</span>
                            </div>

                            {showCategoryModal && (
                                <div className={styles.modalOverlay}>
                                    <div className={styles.modal}>
                                        <h3>Add Category</h3>
                                        <div className={styles.modalContent}>
                                            <div className={styles.selectGroup}>
                                                <label>Main Category</label>
                                                <select 
                                                    value={currentCategory.main}
                                                    onChange={(e) => handleMainCategoryChange(e.target.value)}
                                                    className={styles.categorySelect}
                                                >
                                                    {VALID_MAIN_CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className={styles.selectGroup}>
                                                <label>Sub Category</label>
                                                <select 
                                                    value={currentCategory.sub}
                                                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                                                    className={styles.categorySelect}
                                                >
                                                    {SUBCATS_BY_MAIN[currentCategory.main].map(subCat => (
                                                        <option key={subCat} value={subCat}>{subCat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className={styles.modalActions}>
                                            <button 
                                                className={styles.cancelBtn}
                                                onClick={() => setShowCategoryModal(false)}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                className={styles.confirmBtn}
                                                onClick={handleCategorySubmit}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className={styles.step2}>
                            <div className={styles.thumbnailUpload}>
                                <label>Thumbnail Image</label>
                                <div className={styles.uploadArea}>
                                    {thumbnailImage ? (
                                        <div className={styles.thumbnailPreview}>
                                            <img src={URL.createObjectURL(thumbnailImage)} alt="Thumbnail" />
                                            <button onClick={() => setThumbnailImage(null)}>&times;</button>
                                        </div>
                                    ) : (
                                        <div className={styles.uploadPrompt}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleThumbnailUpload}
                                            />
                                            <button>Upload</button>
                                        </div>
                                    )}
                                </div>
                                <p className={styles.uploadHint}>*The thumbnail image will be cropped to 1:1 ratio and must be less than 10mb </p>
                            </div>
                            {showCropper && imageToProcess && (
                                <ImageCropper
                                    image={imageToProcess}
                                    onCropComplete={handleCropComplete}
                                    onCancel={handleCropCancel}
                                />
                            )}
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className={styles.step3}>
                            <div className={styles.editorContainer}>
                                <RichTextEditor
                                    ref={quillRef}
                                    content={editorContent}
                                    onChange={handleEditorChange}
                                />
                            </div>
                            <div className={styles.imageUploadContainer}>
                                <div className={styles.buttonContainer}>
                                    <button 
                                        type="button"
                                        className={styles.insertImageButton}
                                        onClick={() => setShowImagePicker(true)}
                                    >
                                        Insert Image
                                    </button>
                                    <div className={styles.helpIcon} title="Click to insert images from your uploaded images">?</div>
                                </div>
                                <div className={styles.imageUpload}>
                                    <h3>Uploaded Images</h3>
                                    <p className={styles.uploadHint}>*Each image needs to be less than 40 mb, 10 images is the limit.</p>
                                    <div className={styles.uploadedImages}>
                                        {formData.images && formData.images.map((image, index) => (
                                            <div key={index} className={styles.imageContainer}>
                                                <img 
                                                    src={URL.createObjectURL(image)} 
                                                    alt={`Upload ${index + 1}`}
                                                    className={styles.uploadedImage}
                                                />
                                                <span className={styles.imageNumber}>[Image {index + 1}]</span>
                                                <button
                                                    onClick={() => handleRemoveImage(index)}
                                                    className={styles.removeButton}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {formData.images.length < 10 && (
                                            <label className={styles.uploadButton}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                />
                                                +
                                            </label>
                                        )}
                                    </div>
                                </div>
                                {showImagePicker && (
                                    <ImagePicker
                                        images={formData.images}
                                        onSelect={handleSelectImageFromPicker}
                                        onClose={() => setShowImagePicker(false)}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.actions}>
                    <div className={styles.leftActions}>
                        {currentStep > 1 && (
                            <button
                                className={styles.backBtn}
                                onClick={() => setCurrentStep(currentStep - 1)}
                            >
                                Back
                            </button>
                        )}
                        <button 
                            className={styles.cancelBtn}
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className={styles.rightActions}>
                        <button
                            className={styles.confirmBtn}
                            onClick={currentStep === 3 ? handleSubmit : handleConfirm}
                        >
                            {currentStep === 3 ? 'Submit' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateIdea;
