/**
 * Format Converter Module
 * Handles image format conversion (JPEG, PNG, WebP)
 */

import { ImageOptimizerError, ErrorCodes, getMimeType, getExtensionFromMime } from './utils.js';

/**
 * Convert an image blob to a different format
 * @param {Blob} blob - Source image blob
 * @param {string} targetFormat - Target format ('jpeg', 'png', 'webp')
 * @param {number} quality - Quality for lossy formats (0-100)
 * @returns {Promise<Blob>} - Converted blob
 */
export async function convertFormat(blob, targetFormat, quality = 80) {
    const targetMime = getMimeType(targetFormat);

    // If already the correct format, return as-is
    if (blob.type === targetMime) {
        return blob;
    }

    try {
        // Create an image from the blob
        const img = await createImageFromBlob(blob);

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new ImageOptimizerError('Canvas not supported', ErrorCodes.CANVAS_UNSUPPORTED);
        }

        // Handle transparency for JPEG (fill with white background)
        if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        // Convert quality from 0-100 to 0-1
        const normalizedQuality = Math.max(0.1, Math.min(1, quality / 100));

        // Convert to target format
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (convertedBlob) => {
                    if (convertedBlob) {
                        resolve(convertedBlob);
                    } else {
                        reject(new ImageOptimizerError(
                            `Failed to convert to ${targetFormat}`,
                            ErrorCodes.CONVERSION_FAILED
                        ));
                    }
                },
                targetMime,
                normalizedQuality
            );
        });

    } catch (error) {
        if (error instanceof ImageOptimizerError) {
            throw error;
        }
        throw new ImageOptimizerError(
            `Format conversion failed: ${error.message}`,
            ErrorCodes.CONVERSION_FAILED
        );
    }
}

/**
 * Create an HTMLImageElement from a Blob
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
function createImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new ImageOptimizerError('Failed to load image for conversion', ErrorCodes.FILE_CORRUPTED));
        };

        img.src = url;
    });
}

/**
 * Check if a format is supported for output
 * @param {string} format - Format to check
 * @returns {boolean}
 */
export function isFormatSupported(format) {
    const supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];

    // Check basic support
    if (!supportedFormats.includes(format.toLowerCase())) {
        return false;
    }

    // Check WebP support specifically
    if (format.toLowerCase() === 'webp') {
        return checkWebPSupport();
    }

    return true;
}

/**
 * Check if browser supports WebP encoding
 * @returns {boolean}
 */
function checkWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
}

/**
 * Get recommended format based on image characteristics
 * @param {string} originalType - Original MIME type
 * @param {boolean} hasTransparency - Whether image has transparency
 * @returns {string} - Recommended format
 */
export function getRecommendedFormat(originalType, hasTransparency = false) {
    // If WebP is supported, it's usually the best choice
    if (checkWebPSupport()) {
        return 'webp';
    }

    // If image has transparency, use PNG
    if (hasTransparency) {
        return 'png';
    }

    // Default to JPEG for photos
    return 'jpeg';
}

/**
 * Generate output filename based on original and new format
 * @param {string} originalName - Original filename
 * @param {string} format - New format
 * @returns {string} - New filename
 */
export function generateOutputFilename(originalName, format) {
    // Remove existing extension
    const dotIndex = originalName.lastIndexOf('.');
    const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;

    // Get new extension
    const newExt = getExtensionFromMime(getMimeType(format));

    return `${baseName}_optimized.${newExt}`;
}

/**
 * Detect if an image has transparency
 * @param {HTMLCanvasElement} canvas - Canvas with image drawn
 * @returns {boolean}
 */
export function detectTransparency(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check alpha channel (every 4th value starting at index 3)
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
                return true; // Found transparent pixel
            }
        }
        return false;
    } catch (error) {
        // CORS or other error
        console.warn('Could not detect transparency:', error);
        return false;
    }
}

/**
 * Get format info for display
 * @param {string} format - Format string
 * @returns {Object} - Format info object
 */
export function getFormatInfo(format) {
    const formats = {
        'jpeg': {
            name: 'JPEG',
            extension: 'jpg',
            mimeType: 'image/jpeg',
            supportsTransparency: false,
            lossless: false,
            description: 'Best for photos with many colors'
        },
        'jpg': {
            name: 'JPEG',
            extension: 'jpg',
            mimeType: 'image/jpeg',
            supportsTransparency: false,
            lossless: false,
            description: 'Best for photos with many colors'
        },
        'png': {
            name: 'PNG',
            extension: 'png',
            mimeType: 'image/png',
            supportsTransparency: true,
            lossless: true,
            description: 'Best for graphics with transparency'
        },
        'webp': {
            name: 'WebP',
            extension: 'webp',
            mimeType: 'image/webp',
            supportsTransparency: true,
            lossless: false,
            description: 'Modern format with best compression'
        },
        'gif': {
            name: 'GIF',
            extension: 'gif',
            mimeType: 'image/gif',
            supportsTransparency: true,
            lossless: true,
            description: 'Best for simple animations'
        }
    };

    return formats[format.toLowerCase()] || formats['jpeg'];
}
