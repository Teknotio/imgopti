/**
 * Image Loader Module
 * Handles file selection, drag-drop, and validation
 */

import { state } from './stateManager.js';
import {
    validateFile,
    generateId,
    createThumbnail,
    showToast,
    ImageOptimizerError,
    ErrorCodes,
    ErrorMessages
} from './utils.js';

/**
 * Initialize image loader with DOM elements
 */
export function initImageLoader() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('btn-select-files');

    if (!dropZone || !fileInput || !selectBtn) {
        console.error('Image loader: Required elements not found');
        return;
    }

    // Click to select files
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            await handleFiles(files);
        }
        // Reset input so same file can be selected again
        fileInput.value = '';
    });

    // Drag and drop events
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Prevent default drag behavior on document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());

    // Paste from clipboard
    document.addEventListener('paste', handlePaste);
}

/**
 * Handle drag enter event
 * @param {DragEvent} e
 */
function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    state.set('ui.isDragging', true);
    e.currentTarget.classList.add('drag-active');
}

/**
 * Handle drag over event
 * @param {DragEvent} e
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handle drag leave event
 * @param {DragEvent} e
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();

    // Only remove class if leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        state.set('ui.isDragging', false);
        e.currentTarget.classList.remove('drag-active');
    }
}

/**
 * Handle drop event
 * @param {DragEvent} e
 */
async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    state.set('ui.isDragging', false);
    e.currentTarget.classList.remove('drag-active');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));

    if (files.length === 0) {
        showToast('No valid images found', 'error');
        return;
    }

    await handleFiles(files);
}

/**
 * Handle paste from clipboard
 * @param {ClipboardEvent} e
 */
async function handlePaste(e) {
    // Only handle paste on upload screen
    if (state.get('currentScreen') !== 'upload') return;

    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    e.preventDefault();

    const files = [];
    for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
            // Generate a name for pasted images
            const ext = file.type.split('/')[1] || 'png';
            const namedFile = new File([file], `pasted-image-${Date.now()}.${ext}`, {
                type: file.type
            });
            files.push(namedFile);
        }
    }

    if (files.length > 0) {
        await handleFiles(files);
        showToast(`${files.length} image(s) pasted from clipboard`, 'success');
    }
}

/**
 * Process and add files to state
 * @param {File[]} files - Array of File objects
 */
async function handleFiles(files) {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
        try {
            validateFile(file);
            validFiles.push(file);
        } catch (error) {
            if (error instanceof ImageOptimizerError) {
                errors.push({ file: file.name, message: ErrorMessages[error.code] || error.message });
            } else {
                errors.push({ file: file.name, message: 'Unknown error' });
            }
        }
    }

    // Show errors if any
    if (errors.length > 0) {
        const errorMsg = errors.length === 1
            ? `${errors[0].file}: ${errors[0].message}`
            : `${errors.length} files skipped (invalid type or too large)`;
        showToast(errorMsg, 'error', 4000);
    }

    // Add valid files to state
    for (const file of validFiles) {
        try {
            const thumbnail = await createThumbnail(file, 100);
            const id = generateId();

            state.addFile({
                id,
                file,
                thumbnail,
                originalSize: file.size,
                originalName: file.name,
                originalType: file.type
            });
        } catch (error) {
            console.error('Error creating thumbnail:', error);
            // Add without thumbnail
            const id = generateId();
            state.addFile({
                id,
                file,
                thumbnail: null,
                originalSize: file.size,
                originalName: file.name,
                originalType: file.type
            });
        }
    }

    // Show success message
    if (validFiles.length > 0) {
        showToast(`${validFiles.length} image(s) added`, 'success');
    }
}

/**
 * Clear all files
 */
export function clearAllFiles() {
    state.clearFiles();
    showToast('All files cleared', 'info');
}

/**
 * Remove a specific file
 * @param {string} id - File ID to remove
 */
export function removeFile(id) {
    state.removeFile(id);
}

/**
 * Get the first file's image data for preview
 * @returns {Promise<{img: HTMLImageElement, width: number, height: number}|null>}
 */
export async function getFirstImageData() {
    const files = state.get('files');
    if (files.length === 0) return null;

    const file = files[0].file;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                img,
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
