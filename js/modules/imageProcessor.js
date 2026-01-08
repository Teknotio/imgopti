/**
 * Image Processor Module
 * Handles canvas-based image manipulation including resize and EXIF rotation
 */

import { loadImage, ImageOptimizerError, ErrorCodes } from './utils.js';

// EXIF orientation transforms
const ORIENTATION_TRANSFORMS = {
    1: { rotate: 0, flip: false },      // Normal
    2: { rotate: 0, flip: true },       // Flipped horizontally
    3: { rotate: 180, flip: false },    // Rotated 180
    4: { rotate: 180, flip: true },     // Flipped vertically
    5: { rotate: 90, flip: true },      // Rotated 90 CW, flipped
    6: { rotate: 90, flip: false },     // Rotated 90 CW
    7: { rotate: 270, flip: true },     // Rotated 90 CCW, flipped
    8: { rotate: 270, flip: false }     // Rotated 90 CCW
};

/**
 * Get EXIF orientation from image file
 * @param {File} file - Image file
 * @returns {Promise<number>} - Orientation value (1-8)
 */
async function getExifOrientation(file) {
    // Only JPEG files have EXIF data
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        return 1;
    }

    try {
        // Try to use exifr library if available
        const exifr = await import('exifr');
        const orientation = await exifr.orientation(file);
        return orientation || 1;
    } catch (error) {
        console.warn('EXIF reading not available, using default orientation');
        return 1;
    }
}

/**
 * Process an image with the given settings
 * @param {File} file - Image file to process
 * @param {Object} settings - Processing settings
 * @param {boolean} settings.resizeEnabled - Whether to resize
 * @param {number} settings.width - Target width
 * @param {number} settings.height - Target height
 * @param {string} settings.unit - 'px' or '%'
 * @param {boolean} settings.maintainAspectRatio - Keep aspect ratio
 * @param {boolean} settings.keepOriginalDimensions - Don't resize
 * @returns {Promise<{canvas: HTMLCanvasElement, width: number, height: number}>}
 */
export async function processImage(file, settings) {
    try {
        // Load the image
        const img = await loadImage(file);
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;

        // Get EXIF orientation
        const orientation = await getExifOrientation(file);
        const transform = ORIENTATION_TRANSFORMS[orientation] || ORIENTATION_TRANSFORMS[1];

        // Calculate dimensions after EXIF rotation
        let rotatedWidth = originalWidth;
        let rotatedHeight = originalHeight;

        // Swap dimensions for 90/270 degree rotations
        if (transform.rotate === 90 || transform.rotate === 270) {
            rotatedWidth = originalHeight;
            rotatedHeight = originalWidth;
        }

        // Calculate target dimensions
        let targetWidth = rotatedWidth;
        let targetHeight = rotatedHeight;

        if (settings.resizeEnabled && !settings.keepOriginalDimensions) {
            const dims = calculateDimensions({
                originalWidth: rotatedWidth,
                originalHeight: rotatedHeight,
                targetWidth: settings.width,
                targetHeight: settings.height,
                unit: settings.unit,
                maintainAspectRatio: settings.maintainAspectRatio
            });
            targetWidth = dims.width;
            targetHeight = dims.height;
        }

        // Create canvas with target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new ImageOptimizerError('Canvas context unavailable', ErrorCodes.CANVAS_UNSUPPORTED);
        }

        // Enable high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Apply EXIF transformations
        applyExifTransform(ctx, targetWidth, targetHeight, transform);

        // Calculate source dimensions (before EXIF transform)
        let drawWidth = targetWidth;
        let drawHeight = targetHeight;

        if (transform.rotate === 90 || transform.rotate === 270) {
            drawWidth = targetHeight;
            drawHeight = targetWidth;
        }

        // Draw the image
        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        return {
            canvas,
            width: targetWidth,
            height: targetHeight,
            originalWidth: rotatedWidth,
            originalHeight: rotatedHeight
        };

    } catch (error) {
        if (error instanceof ImageOptimizerError) {
            throw error;
        }
        throw new ImageOptimizerError(
            `Image processing failed: ${error.message}`,
            ErrorCodes.CANVAS_MEMORY
        );
    }
}

/**
 * Calculate target dimensions based on settings
 * @param {Object} params
 * @param {number} params.originalWidth
 * @param {number} params.originalHeight
 * @param {number} params.targetWidth
 * @param {number} params.targetHeight
 * @param {string} params.unit - 'px' or '%'
 * @param {boolean} params.maintainAspectRatio
 * @returns {{width: number, height: number}}
 */
export function calculateDimensions({
    originalWidth,
    originalHeight,
    targetWidth,
    targetHeight,
    unit = 'px',
    maintainAspectRatio = true
}) {
    let newWidth = targetWidth;
    let newHeight = targetHeight;

    // Convert percentage to pixels
    if (unit === '%') {
        newWidth = Math.round(originalWidth * (targetWidth / 100));
        newHeight = Math.round(originalHeight * (targetHeight / 100));
    }

    // Handle aspect ratio
    if (maintainAspectRatio) {
        const aspectRatio = originalWidth / originalHeight;

        // If only width is specified
        if (newWidth && !newHeight) {
            newHeight = Math.round(newWidth / aspectRatio);
        }
        // If only height is specified
        else if (newHeight && !newWidth) {
            newWidth = Math.round(newHeight * aspectRatio);
        }
        // If both specified, fit within bounds
        else if (newWidth && newHeight) {
            const widthRatio = newWidth / originalWidth;
            const heightRatio = newHeight / originalHeight;
            const scale = Math.min(widthRatio, heightRatio);
            newWidth = Math.round(originalWidth * scale);
            newHeight = Math.round(originalHeight * scale);
        }
    }

    // Ensure minimum dimensions
    newWidth = Math.max(1, newWidth || originalWidth);
    newHeight = Math.max(1, newHeight || originalHeight);

    // Ensure maximum dimensions (prevent memory issues)
    const MAX_DIMENSION = 16384; // Most browsers support this
    if (newWidth > MAX_DIMENSION || newHeight > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
    }

    return { width: newWidth, height: newHeight };
}

/**
 * Apply EXIF transformation to canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} transform - Transform object { rotate, flip }
 */
function applyExifTransform(ctx, width, height, transform) {
    const { rotate, flip } = transform;

    // Move to center
    ctx.translate(width / 2, height / 2);

    // Apply rotation
    if (rotate) {
        ctx.rotate((rotate * Math.PI) / 180);
    }

    // Apply flip
    if (flip) {
        ctx.scale(-1, 1);
    }

    // Adjust position based on rotation
    if (rotate === 90 || rotate === 270) {
        ctx.translate(-height / 2, -width / 2);
    } else {
        ctx.translate(-width / 2, -height / 2);
    }
}

/**
 * Create a preview canvas (smaller for display)
 * @param {File} file - Image file
 * @param {number} maxSize - Maximum dimension
 * @returns {Promise<string>} - Data URL
 */
export async function createPreview(file, maxSize = 400) {
    const img = await loadImage(file);
    const orientation = await getExifOrientation(file);
    const transform = ORIENTATION_TRANSFORMS[orientation] || ORIENTATION_TRANSFORMS[1];

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // Swap for 90/270 rotations
    if (transform.rotate === 90 || transform.rotate === 270) {
        [width, height] = [height, width];
    }

    // Calculate preview size
    const scale = Math.min(maxSize / width, maxSize / height, 1);
    const previewWidth = Math.round(width * scale);
    const previewHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    applyExifTransform(ctx, previewWidth, previewHeight, transform);

    let drawWidth = previewWidth;
    let drawHeight = previewHeight;

    if (transform.rotate === 90 || transform.rotate === 270) {
        drawWidth = previewHeight;
        drawHeight = previewWidth;
    }

    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

    return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Convert canvas to Blob
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType - Output MIME type
 * @param {number} quality - Quality (0-1)
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new ImageOptimizerError('Failed to create blob', ErrorCodes.CONVERSION_FAILED));
                }
            },
            mimeType,
            quality
        );
    });
}
