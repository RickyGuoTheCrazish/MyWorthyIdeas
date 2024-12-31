import React, { forwardRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './RichTextEditor.module.css';

const RichTextEditor = forwardRef(({ content, onChange }, ref) => {
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['blockquote', 'code-block'],
            ['link'],  
            ['clean']
        ]
    };

    const formats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'align', 'list', 'bullet',
        'blockquote', 'code-block',
        'link', 'image'  
    ];

    return (
        <div className={styles.editor}>
            <ReactQuill
                ref={ref}
                value={content}
                onChange={onChange}
                modules={modules}
                formats={formats}
                theme="snow"
                placeholder="Write your content here..."
            />
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
