/**
 * Utility functions for ImgOpti
 */

// Custom error class for image processing errors
export class ImageOptimizerError extends Error {
    constructor(message, code, recoverable = true) {
        super(message);
        this.name = 'ImageOptimizerError';
        this.code = code;
        this.recoverable = recoverable;
    }
}

// Error codes
export const ErrorCodes = {
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
    FILE_CORRUPTED: 'FILE_CORRUPTED',
    CANVAS_MEMORY: 'CANVAS_MEMORY',
    COMPRESSION_FAILED: 'COMPRESSION_FAILED',
    CONVERSION_FAILED: 'CONVERSION_FAILED',
    WEBWORKER_UNAVAILABLE: 'WEBWORKER_UNAVAILABLE',
    CANVAS_UNSUPPORTED: 'CANVAS_UNSUPPORTED',
    LIBRARY_LOAD_FAILED: 'LIBRARY_LOAD_FAILED'
};

// Error messages for user display
export const ErrorMessages = {
    FILE_TOO_LARGE: 'File exceeds 10MB limit. Please choose a smaller image.',
    INVALID_FILE_TYPE: 'Please upload a JPG, PNG, WebP, or GIF image.',
    FILE_CORRUPTED: 'This file appears to be corrupted. Try a different image.',
    CANVAS_MEMORY: 'Image is too large to process. Try reducing dimensions first.',
    COMPRESSION_FAILED: 'Compression failed. Try adjusting quality settings.',
    CONVERSION_FAILED: 'Format conversion failed. The image may be incompatible.',
    WEBWORKER_UNAVAILABLE: 'Background processing unavailable. Processing may be slower.',
    LIBRARY_LOAD_FAILED: 'Failed to load required libraries. Check your internet connection.'
};

// File validation constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Validate a file for processing
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid
 * @throws {ImageOptimizerError} - If validation fails
 */
export function validateFile(file) {
    if (!file) {
        throw new ImageOptimizerError('No file selected', ErrorCodes.INVALID_FILE_TYPE);
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new ImageOptimizerError(
            `File size ${formatFileSize(file.size)} exceeds 10MB limit`,
            ErrorCodes.FILE_TOO_LARGE
        );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new ImageOptimizerError(
            `File type ${file.type || 'unknown'} is not supported`,
            ErrorCodes.INVALID_FILE_TYPE
        );
    }

    return true;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID string
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} - Extension including dot
 */
export function getFileExtension(filename) {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.slice(idx).toLowerCase() : '';
}

/**
 * Get filename without extension
 * @param {string} filename - The filename
 * @returns {string} - Filename without extension
 */
export function getFileBasename(filename) {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.slice(0, idx) : filename;
}

/**
 * Get MIME type from format string
 * @param {string} format - Format string (jpeg, png, webp)
 * @returns {string} - MIME type
 */
export function getMimeType(format) {
    const mimeTypes = {
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
    };
    return mimeTypes[format.toLowerCase()] || 'image/jpeg';
}

/**
 * Get extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - Extension without dot
 */
export function getExtensionFromMime(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
    };
    return extensions[mimeType] || 'jpg';
}

/**
 * Calculate compression savings percentage
 * @param {number} originalSize - Original size in bytes
 * @param {number} newSize - New size in bytes
 * @returns {number} - Percentage saved (0-100)
 */
export function calculateSavings(originalSize, newSize) {
    if (originalSize === 0) return 0;
    const savings = ((originalSize - newSize) / originalSize) * 100;
    return Math.max(0, Math.round(savings));
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check browser feature support
 * @returns {Object} - Object with support flags
 */
export function checkBrowserSupport() {
    const support = {
        canvas: !!document.createElement('canvas').getContext,
        webWorker: typeof Worker !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        blob: typeof Blob !== 'undefined',
        webp: false,
        webShare: !!navigator.share
    };

    // Check WebP support
    if (support.canvas) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        support.webp = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    }

    return support;
}

/**
 * Load an image from a file
 * @param {File} file - The image file
 * @returns {Promise<HTMLImageElement>} - Loaded image element
 */
export function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new ImageOptimizerError('Failed to load image', ErrorCodes.FILE_CORRUPTED));
        };

        img.src = url;
    });
}

/**
 * Create a thumbnail data URL from an image
 * @param {File} file - The image file
 * @param {number} maxSize - Max dimension for thumbnail
 * @returns {Promise<string>} - Data URL string
 */
export async function createThumbnail(file, maxSize = 100) {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');

    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
        }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 * @param {number} duration - Duration in ms
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-gray-800 dark:bg-gray-700'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast flex items-center gap-2 px-4 py-3 rounded-xl ${colors[type]} text-white shadow-lg max-w-sm`;
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icons[type]}</span>
        <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
