import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './EditIdea.module.css';
import { FaBold, FaItalic, FaUnderline, FaLink, FaImage, FaCoins } from 'react-icons/fa';
import { VALID_MAIN_CATEGORIES, SUBCATS_BY_MAIN } from '../utils/categories';
import ImageCropper from '../components/common/ImageCropper';
import RichTextEditor from '../components/editor/RichTextEditor';
import ImagePicker from '../components/editor/ImagePicker';

const API_BASE_URL = 'http://localhost:6001';

const EditIdea = () => {
    const navigate = useNavigate();
    const { ideaId } = useParams();
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
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
    const [imageIds, setImageIds] = useState([]);
    const quillRef = useRef(null);

    useEffect(() => {
        const fetchIdea = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch idea');
                }

                const { idea } = await response.json();
                console.log('Fetched idea:', idea); // Debug log

                // Set form data with S3 URLs directly
                setFormData({
                    title: idea.title || '',
                    brief: idea.preview || '', 
                    price: idea.price || '',
                    content: idea.contentHtml || '',
                    images: idea.contentImages || [],
                    contentImages: idea.contentImages || []
                });

                // Set editor content with S3 URLs
                setEditorContent(idea.contentHtml || '');

                // Set thumbnail if exists
                if (idea.thumbnailImage) {
                    setThumbnailImage(idea.thumbnailImage);
                }

                // Set categories if they exist
                if (idea.categories && idea.categories.length > 0) {
                    setCategories(idea.categories);
                    setCurrentCategory({ main: '', sub: '' });
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching idea:', error);
                setLoading(false);
            }
        };

        fetchIdea();
    }, [ideaId]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleMainCategoryChange = (mainCat) => {
        setCurrentCategory({
            main: mainCat,
            sub: SUBCATS_BY_MAIN[mainCat][0] // Set first sub-category as default
        });
    };

    const handleSubCategoryChange = (subCat) => {
        setCurrentCategory(prev => ({
            ...prev,
            sub: subCat
        }));
    };

    const handleAddCategory = () => {
        if (categories.length >= 3) {
            alert('Maximum 3 categories allowed');
            return;
        }
        setCurrentCategory({ 
            main: VALID_MAIN_CATEGORIES[0], 
            sub: SUBCATS_BY_MAIN[VALID_MAIN_CATEGORIES[0]][0] 
        });
        setShowCategoryModal(true);
    };

    const handleCategorySubmit = () => {
        if (!currentCategory.main || !currentCategory.sub) {
            alert('Please select both main and sub category');
            return;
        }

        // Check if this category combination already exists
        const exists = categories.some(
            cat => cat.main === currentCategory.main && cat.sub === currentCategory.sub
        );

        if (exists) {
            alert('This category combination already exists');
            return;
        }

        setCategories([...categories, { ...currentCategory }]);
        setShowCategoryModal(false);
    };

    const removeCategory = (index) => {
        setCategories(categories.filter((_, i) => i !== index));
    };

    const handleThumbnailUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be less than 10MB');
            return;
        }

        // Clear any existing image URL
        if (typeof thumbnailImage === 'string') {
            setThumbnailImage(null);
        }

        setImageToProcess(file);
        setShowCropper(true);
    };

    const handleCropComplete = (croppedImage) => {
        setThumbnailImage(croppedImage);
        setShowCropper(false);
        setImageToProcess(null);
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setImageToProcess(null);
    };

    const handleImageUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        if (formData.images.length + files.length > 10) {
            alert('Maximum 10 images allowed');
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 40 * 1024 * 1024) {
                alert(`Image ${file.name} is too large (max 40MB)`);
                return false;
            }
            return true;
        });

        if (!validFiles.length) return;

        // Create blob URLs for new files
        const newImages = validFiles.map(file => {
            const url = URL.createObjectURL(file);
            setImageMapping(prev => {
                const newMap = new Map(prev);
                newMap.set(url, file);
                return newMap;
            });
            return url;
        });

        setFormData(prev => ({
            ...prev,
            images: [...prev.images, ...validFiles]
        }));
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleEditorChange = (content) => {
        setEditorContent(content);
    };

    const handleSelectImageFromPicker = (imageData) => {
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

    const handleInsertImageIntoEditor = (imageUrl) => {
        console.log('Inserting image URL:', imageUrl);
        if (quillRef.current) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            
            // Insert a line break before if not at the start
            if (range.index > 0) {
                quill.insertText(range.index, '\n');
            }
            
            // Insert the image
            quill.insertEmbed(range.index, 'image', imageUrl);
            
            // Insert a line break after
            quill.insertText(range.index + 1, '\n');
            
            // Move cursor after the image
            quill.setSelection(range.index + 2);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.title || !formData.brief || !formData.price || categories.length === 0) {
                alert('Please fill in all required fields (title, brief, price) and select at least one category');
                return;
            }

            let contentToSave = editorContent;

            // First handle thumbnail image if it's a new file
            if (thumbnailImage instanceof File) {
                console.log('Uploading thumbnail image...'); // Debug log
                const thumbnailFormData = new FormData();
                thumbnailFormData.append('cover-image', thumbnailImage);

                const thumbnailResponse = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}/cover`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: thumbnailFormData
                });

                if (!thumbnailResponse.ok) {
                    const errorData = await thumbnailResponse.json();
                    console.error('Failed to upload thumbnail:', errorData);
                    throw new Error(errorData.message || 'Failed to upload thumbnail');
                }
            }

            // Then handle content images if any exist
            const newImages = formData.images.filter(file => file instanceof File);
            if (newImages.length > 0) {
                console.log('Uploading content images...'); // Debug log
                const contentImagesFormData = new FormData();
                newImages.forEach(file => {
                    contentImagesFormData.append('content-images', file);
                });

                const imagesResponse = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}/content-images`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: contentImagesFormData
                });

                if (!imagesResponse.ok) {
                    const errorData = await imagesResponse.json();
                    console.error('Failed to upload content images:', errorData);
                    throw new Error(errorData.message || 'Failed to upload content images');
                }

                // Get the S3 URLs from response
                const { idea: { contentImages: uploadedImages } } = await imagesResponse.json();
                
                console.log('Replacing base64 URLs with S3 URLs...'); // Debug log
                // Create a mapping of files to their S3 URLs
                const fileToS3Map = new Map();
                newImages.forEach((file, index) => {
                    const s3Url = uploadedImages[uploadedImages.length - newImages.length + index];
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

            // Update idea content
            const contentResponse = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}/content`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    contentHtml: contentToSave,
                    contentRaw: JSON.stringify(quillRef.current?.getEditor().getContents())
                })
            });

            if (!contentResponse.ok) {
                const errorData = await contentResponse.json();
                throw new Error(errorData.message || 'Failed to update content');
            }

            // Finally update the rest of the idea
            const updateData = {
                title: formData.title,
                preview: formData.brief,
                price: formData.price,
                categories: categories
            };

            const response = await fetch(`${API_BASE_URL}/api/ideas/${ideaId}/edit`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error:', errorData);
                throw new Error(errorData.message || 'Failed to update idea');
            }

            navigate(`/ideas/${ideaId}`);
        } catch (error) {
            console.error('Error updating idea:', error);
            alert('Error updating idea: ' + error.message);
        }
    };

    const handleCancel = () => {
        const confirmCancel = window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.');
        if (confirmCancel) {
            navigate(`/ideas/${ideaId}`);
        }
    };

    if (loading) {
        return <div className={styles.loadingContainer}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
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
                        <div className={styles.inputGroup}>
                            <label>
                                Credits <FaCoins className={styles.priceIcon} />
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={(e) => handleInputChange('price', e.target.value)}
                                min="0"
                                step="0.01"
                                required
                                placeholder="Enter price in credits"
                            />
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
                    </div>
                )}
                {currentStep === 2 && (
                    <div className={styles.thumbnailUpload}>
                        <label>Thumbnail Image</label>
                        <div className={styles.uploadArea}>
                            {thumbnailImage ? (
                                <div className={styles.thumbnailPreview}>
                                    <img 
                                        src={typeof thumbnailImage === 'string' ? thumbnailImage : URL.createObjectURL(thumbnailImage)} 
                                        alt="Thumbnail" 
                                    />
                                    <button 
                                        className={styles.removeButton}
                                        onClick={() => setThumbnailImage(null)}
                                        type="button"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.uploadPrompt}>
                                    <label htmlFor="thumbnail-upload">Choose a file or drag it here</label>
                                    <input
                                        id="thumbnail-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleThumbnailUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => document.getElementById('thumbnail-upload').click()}
                                        className={styles.uploadButton}
                                    >
                                        Upload Image
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className={styles.uploadHint}>*The thumbnail image will be cropped to 1:1 ratio and must be less than 10MB</p>
                    </div>
                )}
                {currentStep === 3 && (
                    <div className={styles.step3}>
                        <div className={styles.editorContainer}>
                            <RichTextEditor
                                ref={quillRef}
                                content={editorContent}
                                onChange={setEditorContent}
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
                                    {formData.images.map((image, index) => (
                                        <div key={index} className={styles.imageContainer}>
                                            <img 
                                                src={image instanceof File ? URL.createObjectURL(image) : image} 
                                                alt={`Upload ${index + 1}`}
                                                className={styles.uploadedImage}
                                            />
                                            <div className={styles.imageNumber}>{index + 1}</div>
                                            <button
                                                onClick={() => handleRemoveImage(index)}
                                                className={styles.removeButton}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {formData.images.length < 10 && (
                                        <label className={styles.uploadButton} title="Upload Image">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <span>+</span>
                                        </label>
                                    )}
                                </div>
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
                )}
            </div>

            <div className={styles.navigation}>
                <button 
                    className={`${styles.button} ${styles.cancelButton}`}
                    onClick={handleCancel}
                >
                    Cancel
                </button>
                <div className={styles.rightButtons}>
                    {currentStep > 1 && (
                        <button onClick={() => setCurrentStep(currentStep - 1)} className={styles.backButton}>
                            Back
                        </button>
                    )}
                    {currentStep < 3 && (
                        <button onClick={() => setCurrentStep(currentStep + 1)} className={styles.nextButton}>
                            Next
                        </button>
                    )}
                    {currentStep === 3 && (
                        <button onClick={handleSubmit} className={styles.submitButton}>
                            Update Idea
                        </button>
                    )}
                </div>
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
                                    {SUBCATS_BY_MAIN[currentCategory.main]?.map(subCat => (
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

            {showCropper && imageToProcess && (
                <ImageCropper
                    image={imageToProcess}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </div>
    );
};

export default EditIdea;
